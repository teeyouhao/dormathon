import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import app from './app.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001

// Serve static files from client build and generated export packages
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist')
const outputsPath = path.join(__dirname, 'outputs')
app.use('/outputs', express.static(outputsPath))
app.use(express.static(clientBuildPath))

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
