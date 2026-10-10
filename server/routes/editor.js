import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { processVideoEdit, exportVideo } from '../services/videoEditor.js'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', 'data-store')
const projectsFile = path.join(dataDir, 'projects.json')

function ensureStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(projectsFile)) fs.writeFileSync(projectsFile, '[]')
}

function readProjects() {
  ensureStore()
  try { return JSON.parse(fs.readFileSync(projectsFile, 'utf-8')) } catch { return [] }
}

function writeProjects(projects) {
  ensureStore()
  fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 2))
}

function buildRemixPlan({ reel, brandInfo, files, preferences }) {
  const duration = preferences?.duration || '15 seconds'
  const style = preferences?.style || 'Match trending pattern'
  const brand = brandInfo?.brandName || 'your brand'
  return {
    scenes: [
      `Scene 1 (0-3s): Use the strongest uploaded clip with a hook inspired by "${reel?.title || 'the selected trend'}"`,
      'Scene 2 (3-6s): Show the customer problem, before-state, or attention-grabbing context',
      `Scene 3 (6-10s): Reveal how ${brand} solves the problem with a fast visual transition`,
      'Scene 4 (10-13s): Add proof — customer reaction, result, testimonial, or before/after',
      'Scene 5 (13-15s): End with CTA, logo/handle, and platform-safe captions'
    ],
    features: [
      'Auto-subtitle plan',
      `${duration} vertical 9:16 cut`,
      `${style} pacing`,
      `${files?.length || 0} uploaded file(s) analyzed`,
      'Export plan for TikTok, Instagram Reels, and YouTube Shorts'
    ],
    duration,
    style,
    sourceTrend: reel?.id || null
  }
}

// GET /api/editor/projects
router.get('/projects', (req, res) => {
  const projects = readProjects().sort((a, b) => (b.savedAt || b.createdAt || 0) - (a.savedAt || a.createdAt || 0))
  res.json({ data: projects })
})

// POST /api/editor/projects
router.post('/projects', (req, res) => {
  const incoming = req.body || {}
  const projects = readProjects()
  const id = incoming.id || `project_${Date.now()}`
  const savedProject = {
    ...incoming,
    id,
    savedAt: incoming.savedAt || Date.now(),
    updatedAt: Date.now()
  }
  const next = [savedProject, ...projects.filter(p => p.id !== id)]
  writeProjects(next)
  res.json({ success: true, data: savedProject })
})

// DELETE /api/editor/projects/:id
router.delete('/projects/:id', (req, res) => {
  const projects = readProjects()
  writeProjects(projects.filter(p => p.id !== req.params.id))
  res.json({ success: true })
})

// POST /api/editor/remix
router.post('/remix', (req, res) => {
  const { reel, brandInfo, files = [], preferences = {} } = req.body
  if (!reel && files.length === 0) {
    return res.status(400).json({ error: 'A source reel or uploaded files are required' })
  }
  res.json({
    success: true,
    message: 'AI remix plan generated',
    plan: buildRemixPlan({ reel, brandInfo, files, preferences })
  })
})

// POST /api/editor/edit
router.post('/edit', async (req, res) => {
  const { videoId, videoUrl, trim, text, textOverlays, music, brandLogo, filter, stickers, effect, volume } = req.body

  if (!videoId && !videoUrl) {
    return res.status(400).json({ error: 'videoId or videoUrl is required' })
  }

  try {
    const result = await processVideoEdit({
      videoUrl: videoUrl || videoId,
      videoId,
      trim,
      text,
      textOverlays,
      music,
      brandLogo,
      filter,
      stickers,
      effect,
      volume
    })
    res.json(result)
  } catch (err) {
    console.error('[Editor] Error:', err.message)
    res.status(500).json({ error: 'Edit failed', details: err.message })
  }
})

// POST /api/editor/export
router.post('/export', async (req, res) => {
  const { videoId, platforms, editConfig } = req.body

  if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
    return res.status(400).json({ error: 'platforms array is required' })
  }

  try {
    const result = await exportVideo({ videoId, platforms, editConfig })
    res.json(result)
  } catch (err) {
    console.error('[Export] Error:', err.message)
    res.status(500).json({ error: 'Export failed', details: err.message })
  }
})

export default router
