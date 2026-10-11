import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

import trendingRouter from './routes/trending.js'
import aiRouter from './routes/ai.js'
import editorRouter from './routes/editor.js'
import settingsRouter from './routes/settings.js'
import { getSupabaseStatus } from './services/supabaseStore.js'
import { getInstagramConfig } from './services/instagramScraper.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const app = express()

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// API Routes - registered on both /api/path and /path so serverless rewrites match consistently
app.use('/api/trending', trendingRouter)
app.use('/trending', trendingRouter)
app.use('/api/ai', aiRouter)
app.use('/ai', aiRouter)
app.use('/api/editor', editorRouter)
app.use('/editor', editorRouter)
app.use('/api/settings', settingsRouter)
app.use('/settings', settingsRouter)

// Health check
const handleHealth = (req, res) => {
  res.json({
    status: 'ok',
    services: {
      youtube: !!process.env.YOUTUBE_API_KEY,
      instagram: getInstagramConfig().enabled && getInstagramConfig().tokenConfigured,
      tiktok: process.env.TIKTOK_SCRAPING_ENABLED === 'true',
      ai: !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY || !!process.env.GEMINI_API_KEY,
      supabase: getSupabaseStatus().configured
    },
    storage: {
      supabase: getSupabaseStatus()
    }
  })
}

app.get('/api/health', handleHealth)
app.get('/health', handleHealth)

export default app
