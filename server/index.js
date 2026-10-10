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
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Serve static files from client build and generated export packages
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist')
const outputsPath = path.join(__dirname, 'outputs')
app.use('/outputs', express.static(outputsPath))
app.use(express.static(clientBuildPath))

// API Routes
app.use('/api/trending', trendingRouter)
app.use('/api/ai', aiRouter)
app.use('/api/editor', editorRouter)
app.use('/api/settings', settingsRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    services: {
      youtube: !!process.env.YOUTUBE_API_KEY,
      instagram: getInstagramConfig().enabled && getInstagramConfig().tokenConfigured,
      tiktok: process.env.TIKTOK_SCRAPING_ENABLED === 'true',
      ai: !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY,
      supabase: getSupabaseStatus().configured
    },
    storage: {
      supabase: getSupabaseStatus()
    }
  })
})

// SPA fallback (serve index.html for non-API routes)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'Not found' })
  } else {
    res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
      if (err) res.status(200).json({ message: 'ViralReels API Server', docs: '/api/health' })
    })
  }
})

app.listen(PORT, () => {
  console.log(`\n  ViralReels Server running on http://localhost:${PORT}`)
  console.log(`  Health check: http://localhost:${PORT}/api/health\n`)
})
