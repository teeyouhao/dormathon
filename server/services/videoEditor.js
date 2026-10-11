// Video Editor Service
// Produces a real downloadable export package for every edit. If FFmpeg is available,
// it also attempts video processing; otherwise it returns platform-ready edit manifests
// that preserve trim, text, audio, filters, stickers and effects.

import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

import { fileURLToPath } from 'url'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
let ffmpegAvailable = null

async function checkFFmpeg() {
  if (ffmpegAvailable !== null) return ffmpegAvailable
  try {
    await execFileAsync('ffmpeg', ['-version'])
    ffmpegAvailable = true
  } catch {
    ffmpegAvailable = false
    console.warn('[Editor] FFmpeg not found. Export manifests will be generated without MP4 rendering.')
  }
  return ffmpegAvailable
}

function ensureOutputDir() {
  const outputDir = path.join(__dirname, '..', 'outputs')
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })
  return outputDir
}

function writeExportPackage({ videoId, platform, editConfig, status = 'ready', outputVideo = null }) {
  const outputDir = ensureOutputDir()
  const timestamp = Date.now()
  const isUserUpload = editConfig?.excludeOriginal || (editConfig?.uploadedAssets && editConfig.uploadedAssets.length > 0)
  const userClipName = editConfig?.uploadedAssets?.[0]?.name || editConfig?.primaryVideoName || 'user_footage'
  const exportTarget = isUserUpload ? `user_${userClipName}` : (videoId || 'reel')
  const baseName = `export_${platform}_${exportTarget}_${timestamp}`.replace(/[^a-zA-Z0-9_-]/g, '_')
  const jsonName = `${baseName}.json`
  const htmlName = `${baseName}.html`
  const manifest = {
    videoId: isUserUpload ? `user-imported-${userClipName}` : videoId,
    sourceType: isUserUpload ? 'user-imported-footage' : 'original-reference-reel',
    originalVideoExcluded: Boolean(isUserUpload),
    userImportedClips: isUserUpload ? (editConfig.uploadedAssets || []) : [],
    platform,
    status,
    format: 'mp4',
    resolution: '1080x1920',
    aspectRatio: '9:16',
    generatedAt: new Date().toISOString(),
    outputVideo,
    editConfig
  }

  fs.writeFileSync(path.join(outputDir, jsonName), JSON.stringify(manifest, null, 2))
  fs.writeFileSync(path.join(outputDir, htmlName), `<!doctype html>
<html><head><meta charset="utf-8"><title>TrendWise Export - ${platform}</title>
<style>body{font-family:Inter,Arial,sans-serif;background:#0f0f17;color:#fff;padding:32px}pre{background:#181827;padding:16px;border-radius:12px;overflow:auto}.card{max-width:780px;margin:auto}.ok{color:#22c55e}.source{color:#38bdf8;font-weight:600}</style></head>
<body><div class="card"><h1>TrendWise Export Package</h1><p class="ok">Platform: ${platform} · 9:16 · 1080x1920</p><p class="source">${isUserUpload ? `Source: User Imported Footage (${userClipName}) — Original Reference Excluded` : `Source: Reference Reel (${videoId})`}</p><p>This package contains the exact edit configuration for rendering or posting workflow.</p><pre>${JSON.stringify(manifest, null, 2).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}</pre></div></body></html>`)

  return {
    platform,
    format: 'mp4',
    resolution: '1080x1920',
    status,
    manifestUrl: `/outputs/${jsonName}`,
    downloadUrl: `/outputs/${htmlName}`,
    videoUrl: outputVideo ? `/outputs/${path.basename(outputVideo)}` : null
  }
}

export async function processVideoEdit(config) {
  const { videoUrl, videoId, trim, text, textOverlays, music, filter, stickers, effect, volume, brandLogo } = config
  const hasFFmpeg = await checkFFmpeg()

  const editPlan = {
    trim: trim ? `Trim from ${trim.start}% to ${trim.end}%` : 'No trim',
    text: text?.content ? `Add text "${text.content}" at ${text.position} position` : `${textOverlays?.length || 0} text overlay(s)`,
    music: music ? `Use music track ${music} at ${volume ?? 80}% volume` : 'Keep original audio',
    filter: filter || 'original',
    stickers: stickers?.length || 0,
    effect: effect || 'none',
    logo: brandLogo ? `Overlay logo ${brandLogo}` : 'No logo'
  }

  if (!hasFFmpeg || !videoUrl || /^https?:\/\/(youtube|instagram|tiktok|www\.)/i.test(videoUrl)) {
    const packageResult = writeExportPackage({
      videoId,
      platform: 'editor-preview',
      editConfig: { trim, text, textOverlays, music, filter, stickers, effect, volume, brandLogo, editPlan },
      status: hasFFmpeg ? 'manifest-ready' : 'manifest-ready-ffmpeg-not-installed'
    })
    return {
      success: true,
      message: hasFFmpeg
        ? 'Edit configuration saved as a render-ready package. Direct social video URLs need downloading before MP4 processing.'
        : 'Edit configuration saved as a render-ready package. Install FFmpeg to render MP4 files locally.',
      editPlan,
      package: packageResult
    }
  }

  const outputDir = ensureOutputDir()
  const outputPath = path.join(outputDir, `edited_${Date.now()}.mp4`)
  const args = ['-i', videoUrl]

  if (trim && trim.start !== undefined && trim.end !== undefined) {
    const startSec = (trim.start / 100) * 60
    const endSec = (trim.end / 100) * 60
    args.push('-ss', startSec.toString(), '-to', endSec.toString())
  }

  const filters = ['scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920']
  if (text?.content) {
    const escaped = text.content.replace(/'/g, "\\'").replace(/:/g, '\\:')
    const fontSize = text.style?.fontSize || 48
    const fontColor = (text.style?.color || 'white').replace('#', '0x')
    const yPos = text.position === 'top' ? '80' : text.position === 'center' ? '(h-text_h)/2' : 'h-text_h-160'
    filters.push(`drawtext=text='${escaped}':fontcolor=${fontColor}:fontsize=${fontSize}:x=(w-text_w)/2:y=${yPos}:box=1:boxcolor=black@0.5:boxborderw=12`)
  }

  args.push('-vf', filters.join(','), '-y', outputPath)

  try {
    await execFileAsync('ffmpeg', args, { timeout: 120000 })
    return {
      success: true,
      message: 'Video edited successfully',
      outputPath,
      downloadUrl: `/outputs/${path.basename(outputPath)}`,
      editPlan
    }
  } catch (err) {
    const packageResult = writeExportPackage({
      videoId,
      platform: 'editor-preview',
      editConfig: { trim, text, textOverlays, music, filter, stickers, effect, volume, brandLogo, editPlan },
      status: 'manifest-ready-render-failed'
    })
    return {
      success: true,
      message: `MP4 render failed, but a render-ready edit package was saved: ${err.message}`,
      editPlan,
      package: packageResult
    }
  }
}

export async function exportVideo({ videoId, platforms, editConfig }) {
  const hasFFmpeg = await checkFFmpeg()
  const results = platforms.map(platform => writeExportPackage({
    videoId,
    platform,
    editConfig,
    status: hasFFmpeg ? 'ready-for-render' : 'ready-ffmpeg-not-installed'
  }))

  return {
    success: true,
    message: `Export package generated for ${platforms.length} platform(s)`,
    renderer: hasFFmpeg ? 'ffmpeg-ready' : 'manifest-only',
    exports: results
  }
}
