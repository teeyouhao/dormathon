// Client-side video stitching and export engine
// Assembles user uploaded parts into a single playable 9:16 vertical video

export function getSupportedVideoMimeType() {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return 'video/webm'
  }
  const candidateTypes = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ]
  for (const t of candidateTypes) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return 'video/webm'
}

export function filterToCanvasFilter(filterId) {
  switch (filterId) {
    case 'vintage':
      return 'sepia(0.55) contrast(1.15) brightness(0.95)'
    case 'vibrant':
      return 'saturate(1.45) contrast(1.1)'
    case 'blackwhite':
      return 'grayscale(1) contrast(1.2)'
    case 'cinematic':
      return 'contrast(1.2) brightness(0.95) saturate(1.15)'
    case 'warm':
      return 'sepia(0.25) saturate(1.25) brightness(1.05)'
    case 'cool':
      return 'hue-rotate(185deg) saturate(1.1)'
    case 'cyberpunk':
      return 'hue-rotate(290deg) contrast(1.3) saturate(1.4)'
    default:
      return 'none'
  }
}

export async function assembleAndExportVideo({
  parts = [],
  textOverlays = [],
  selectedFilter = 'original',
  stickers = [],
  volume = 80,
  onProgress = () => {}
}) {
  if (!parts || parts.length === 0) {
    throw new Error('No uploaded parts available to assemble.')
  }

  const canvasWidth = 720
  const canvasHeight = 1280
  const fps = 30
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')

  const totalDuration = Math.max(1, parts.reduce((sum, p) => sum + (p.duration || 3), 0))
  const mimeType = getSupportedVideoMimeType()
  const fileExt = mimeType.includes('mp4') ? 'mp4' : 'webm'

  let audioCtx = null
  let audioDest = null
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
      audioDest = audioCtx.createMediaStreamDestination()
    }
  } catch (err) {
    console.warn('[Stitcher] AudioContext unavailable, video will be silent:', err.message)
  }

  const canvasStream = canvas.captureStream(fps)
  const tracks = [...canvasStream.getVideoTracks()]
  if (audioDest && audioDest.stream) {
    tracks.push(...audioDest.stream.getAudioTracks())
  }
  const combinedStream = new MediaStream(tracks)

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 6000000
  })

  const recordedChunks = []
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data)
    }
  }

  recorder.start(100)
  onProgress({ percent: 5, message: 'Preparing scene renderer...' })

  let globalTimeOffset = 0

  for (let partIdx = 0; partIdx < parts.length; partIdx++) {
    const part = parts[partIdx]
    const partDuration = Math.max(0.5, part.duration || 3)
    const trimStart = Math.max(0, part.trimStart || 0)

    onProgress({
      percent: Math.round((globalTimeOffset / totalDuration) * 90),
      message: `Assembling Part ${part.partNumber || partIdx + 1} (${part.name || 'Scene'})...`
    })

    await new Promise((resolve) => {
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.playsInline = true
      video.muted = false
      video.src = part.previewUrl
      video.currentTime = trimStart

      let sourceNode = null
      let animationFrameId = null
      let checkTimer = null
      let isDone = false

      const cleanup = () => {
        if (isDone) return
        isDone = true
        if (animationFrameId) cancelAnimationFrame(animationFrameId)
        if (checkTimer) clearInterval(checkTimer)
        try {
          video.pause()
          video.removeAttribute('src')
          video.load()
        } catch {}
        if (sourceNode && audioDest) {
          try { sourceNode.disconnect() } catch {}
        }
        resolve()
      }

      video.onloadedmetadata = () => {
        video.currentTime = trimStart
      }

      video.onseeked = async () => {
        if (isDone) return

        if (audioCtx && audioDest) {
          try {
            sourceNode = audioCtx.createMediaElementSource(video)
            const gain = audioCtx.createGain()
            gain.gain.value = Math.max(0, Math.min(1, volume / 100))
            sourceNode.connect(gain)
            gain.connect(audioDest)
          } catch (audioErr) {
            console.warn('[Stitcher] Audio node connection skipped:', audioErr.message)
          }
        }

        try {
          await video.play()
        } catch (playErr) {
          // If autoplay with sound is blocked, fallback to muted
          video.muted = true
          try { await video.play() } catch {}
        }

        const renderFrame = () => {
          if (isDone) return

          const currentElapsed = Math.max(0, video.currentTime - trimStart)
          const currentGlobalTime = globalTimeOffset + currentElapsed

          // Clear frame
          ctx.fillStyle = '#0a0a0f'
          ctx.fillRect(0, 0, canvasWidth, canvasHeight)

          // Center crop cover draw
          const vw = video.videoWidth || canvasWidth
          const vh = video.videoHeight || canvasHeight
          const scale = Math.max(canvasWidth / vw, canvasHeight / vh)
          const sw = canvasWidth / scale
          const sh = canvasHeight / scale
          const sx = (vw - sw) / 2
          const sy = (vh - sh) / 2

          // Filter
          ctx.filter = filterToCanvasFilter(selectedFilter)
          try {
            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvasWidth, canvasHeight)
          } catch {}
          ctx.filter = 'none'

          // Draw Text Overlays
          const progressPct = (currentGlobalTime / totalDuration) * 100
          for (const text of textOverlays) {
            if (progressPct >= (text.startTime ?? 0) && progressPct <= (text.endTime ?? 100)) {
              ctx.save()
              ctx.font = `bold ${Math.round((text.fontSize || 24) * 1.5)}px Inter, system-ui, sans-serif`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'

              let textY = canvasHeight - 200
              if (text.position === 'top') textY = 160
              if (text.position === 'center') textY = canvasHeight / 2

              const metrics = ctx.measureText(text.content || '')
              const boxPadding = 18
              const boxWidth = metrics.width + boxPadding * 2
              const boxHeight = (text.fontSize || 24) * 2

              ctx.fillStyle = text.bgColor || 'rgba(0,0,0,0.6)'
              ctx.roundRect?.(
                (canvasWidth - boxWidth) / 2,
                textY - boxHeight / 2,
                boxWidth,
                boxHeight,
                12
              ) || ctx.fillRect((canvasWidth - boxWidth) / 2, textY - boxHeight / 2, boxWidth, boxHeight)
              ctx.fill()

              ctx.fillStyle = text.color || '#ffffff'
              ctx.fillText(text.content || '', canvasWidth / 2, textY)
              ctx.restore()
            }
          }

          // Draw stickers
          for (const sticker of stickers) {
            if (progressPct >= (sticker.startTime ?? 0) && progressPct <= (sticker.endTime ?? 100)) {
              ctx.save()
              ctx.font = '72px sans-serif'
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              let sY = canvasHeight / 2
              if (sticker.position === 'top') sY = 220
              if (sticker.position === 'bottom') sY = canvasHeight - 280
              ctx.fillText(sticker.emoji, canvasWidth / 2, sY)
              ctx.restore()
            }
          }

          const currentPartPct = Math.min(100, Math.round((currentElapsed / partDuration) * 100))
          const overallPct = Math.min(95, Math.round(((globalTimeOffset + Math.min(currentElapsed, partDuration)) / totalDuration) * 100))
          onProgress({
            percent: overallPct,
            message: `Rendering Part ${part.partNumber || partIdx + 1} (${part.name || 'Beat'}): ${currentPartPct}%`
          })

          if (currentElapsed >= partDuration - 0.03 || video.ended) {
            cleanup()
            return
          }

          animationFrameId = requestAnimationFrame(renderFrame)
        }

        animationFrameId = requestAnimationFrame(renderFrame)
      }

      video.onerror = () => cleanup()

      // Safety timeout in case video hangs
      checkTimer = setTimeout(cleanup, (partDuration + 3) * 1000)
    })

    globalTimeOffset += partDuration
  }

  onProgress({ percent: 96, message: 'Finalizing export stream...' })

  return new Promise((resolve) => {
    recorder.onstop = () => {
      onProgress({ percent: 100, message: 'Export complete!' })
      const finalBlob = new Blob(recordedChunks, { type: mimeType })
      const downloadUrl = URL.createObjectURL(finalBlob)
      const filename = `viral-reel-user-export-${Date.now()}.${fileExt}`

      if (audioCtx) {
        try { audioCtx.close() } catch {}
      }

      resolve({
        success: true,
        blob: finalBlob,
        downloadUrl,
        filename,
        mimeType,
        durationSeconds: totalDuration,
        partsAssembled: parts.length
      })
    }

    recorder.stop()
  })
}
