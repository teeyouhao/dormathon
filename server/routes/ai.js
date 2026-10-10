import { Router } from 'express'
import { generateConcept } from '../services/aiService.js'

const router = Router()

// POST /api/ai/concept
router.post('/concept', async (req, res) => {
  const { trendingVideo, brandName, industry, businessType } = req.body

  if (!brandName || !industry) {
    return res.status(400).json({ error: 'brandName and industry are required' })
  }

  try {
    const concept = await generateConcept({
      trendingVideo,
      brandName,
      industry,
      businessType
    })
    res.json(concept)
  } catch (err) {
    console.error('[AI] Concept error:', err.message)
    res.status(500).json({ error: 'Failed to generate concept', details: err.message })
  }
})

export default router
