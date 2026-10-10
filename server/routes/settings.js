import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const settingsFile = path.join(__dirname, '..', 'settings.json')

function readSettings() {
  try {
    if (fs.existsSync(settingsFile)) {
      return JSON.parse(fs.readFileSync(settingsFile, 'utf-8'))
    }
  } catch {}
  return {
    youtube: { apiKey: '' },
    instagram: { enabled: false },
    tiktok: { enabled: false },
    ai: { provider: 'local', apiKey: '' },
    supabase: { url: process.env.SUPABASE_URL || '', table: process.env.SUPABASE_REELS_TABLE || 'reels' }
  }
}

function writeSettings(data) {
  fs.writeFileSync(settingsFile, JSON.stringify(data, null, 2))
}

// GET /api/settings
router.get('/', (req, res) => {
  const settings = readSettings()
  // Mask API keys for security
  const masked = {
    ...settings,
    youtube: {
      apiKey: settings.youtube?.apiKey
        ? settings.youtube.apiKey.substring(0, 6) + '...' + settings.youtube.apiKey.slice(-4)
        : ''
    },
    ai: {
      ...settings.ai,
      apiKey: settings.ai?.apiKey
        ? settings.ai.apiKey.substring(0, 6) + '...'
        : ''
    },
    supabase: {
      url: settings.supabase?.url || process.env.SUPABASE_URL || '',
      table: settings.supabase?.table || process.env.SUPABASE_REELS_TABLE || 'reels',
      keyConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY)
    }
  }
  res.json(masked)
})

// POST /api/settings
router.post('/', (req, res) => {
  const current = readSettings()
  const updated = { ...current, ...req.body }
  writeSettings(updated)

  // Also update environment variables for the current session
  if (updated.youtube?.apiKey) {
    process.env.YOUTUBE_API_KEY = updated.youtube.apiKey
  }
  if (updated.instagram?.enabled !== undefined) {
    process.env.INSTAGRAM_SCRAPING_ENABLED = updated.instagram.enabled.toString()
  }
  if (updated.tiktok?.enabled !== undefined) {
    process.env.TIKTOK_SCRAPING_ENABLED = updated.tiktok.enabled.toString()
  }
  if (updated.ai?.apiKey) {
    if (updated.ai.provider === 'openai') process.env.OPENAI_API_KEY = updated.ai.apiKey
    if (updated.ai.provider === 'anthropic') process.env.ANTHROPIC_API_KEY = updated.ai.apiKey
  }
  if (updated.supabase?.url) {
    process.env.SUPABASE_URL = updated.supabase.url
  }
  if (updated.supabase?.table) {
    process.env.SUPABASE_REELS_TABLE = updated.supabase.table
  }

  res.json({ success: true, message: 'Settings saved and applied' })
})

export default router
