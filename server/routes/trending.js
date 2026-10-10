import { Router } from 'express'
import { fetchYouTubeTrending } from '../services/youtubeService.js'
import { fetchInstagramTrending } from '../services/instagramScraper.js'
import { fetchTikTokTrending } from '../services/tiktokScraper.js'
import { mockTrendingVideos, southeastAsiaCountries } from '../data/mockData.js'
import { upsertReels, getStoredReels, getSupabaseStatus, getReelsTableSql } from '../services/supabaseStore.js'

const router = Router()

function localizeMockVideos(videos, region) {
  if (!region || region === 'all') return videos
  const country = southeastAsiaCountries.find(c => c.id === region)
  if (!country) return videos.filter(v => v.region === region)

  return videos.map((video, index) => ({
    ...video,
    id: `${video.id}-${region}`,
    region,
    location: country.location,
    creatorUrl: video.creatorUrl || video.creator_url || '',
    views: Math.max(1000, Math.round(video.views * (0.55 + ((index % 5) * 0.08)))),
    likes: Math.max(100, Math.round(video.likes * (0.55 + ((index % 5) * 0.08)))),
    shares: Math.max(50, Math.round(video.shares * (0.55 + ((index % 5) * 0.08)))),
    comments: Math.max(10, Math.round(video.comments * (0.55 + ((index % 5) * 0.08))))
  }))
}

function filterByPlatform(videos, platform) {
  return platform === 'all' ? videos : videos.filter(v => v.platform === platform)
}

function filterByIndustry(videos, industry) {
  if (!industry || industry === 'all') return videos
  const aliases = {
    business: ['business', 'marketing', 'smallbusiness', 'growth'],
    fnb: ['fnb', 'food', 'restaurant', 'cafe', 'bakery', 'coffee'],
    car: ['car', 'automotive', 'mechanic', 'detailing', 'repair'],
    retail: ['retail', 'ecommerce', 'fashion', 'boutique', 'packaging', 'orders'],
    beauty: ['beauty', 'salon', 'wellness', 'glowup', 'transformation'],
    services: ['services', 'repair', 'customer', 'localbusiness'],
    education: ['education', 'course', 'training', 'tips'],
    health: ['health', 'fitness', 'gym', 'wellness'],
    'real-estate': ['realestate', 'property', 'housing'],
    travel: ['travel', 'hotel', 'hospitality'],
    finance: ['finance', 'accounting', 'insurance'],
    technology: ['technology', 'tech', 'software'],
    creative: ['creative', 'media', 'content', 'handmade']
  }[industry] || [industry]

  return videos.filter(video => {
    const haystack = [video.industry, video.category, video.title, video.description, ...(video.tags || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .replace(/[&\s-]/g, '')
    return aliases.some(alias => haystack.includes(alias.toLowerCase().replace(/[&\s-]/g, '')))
  })
}

// GET /api/trending?platform=all&region=SG&industry=fnb
router.get('/', async (req, res) => {
  const { platform = 'all', region = 'all', industry = 'all' } = req.query

  try {
    const results = []

    if (platform === 'all' || platform === 'youtube') {
      const ytRegion = region === 'all' ? 'US' : region
      const ytVideos = await fetchYouTubeTrending(process.env.YOUTUBE_API_KEY, ytRegion, 10)
      if (ytVideos) results.push(...ytVideos)
    }

    if (platform === 'all' || platform === 'instagram') {
      if (process.env.INSTAGRAM_SCRAPING_ENABLED === 'true') {
        const igReels = await fetchInstagramTrending({ maxResults: 10, region })
        if (igReels) results.push(...igReels)
      }
    }

    if (platform === 'all' || platform === 'tiktok') {
      if (process.env.TIKTOK_SCRAPING_ENABLED === 'true') {
        const ttVideos = await fetchTikTokTrending({ maxResults: 10, region })
        if (ttVideos) results.push(...ttVideos)
      }
    }

    if (results.length === 0) {
      const filtered = filterByIndustry(filterByPlatform(localizeMockVideos(mockTrendingVideos, region), platform), industry)
      const storage = await upsertReels(filtered, { source: 'mock', region, industry })
      return res.json({
        data: filtered,
        source: 'mock',
        region,
        industry,
        storage,
        message: 'Using fallback data. Configure API keys and enable scrapers in Settings for live data.'
      })
    }

    const filteredLive = filterByIndustry(results, industry)
    filteredLive.sort((a, b) => (b.views || 0) - (a.views || 0))
    filteredLive.forEach((v, i) => v.trendingRank = i + 1)

    const storage = await upsertReels(filteredLive, { source: 'live', region, industry })

    res.json({
      data: filteredLive,
      source: 'live',
      region,
      industry,
      storage,
      platforms: [...new Set(filteredLive.map(v => v.platform))]
    })
  } catch (err) {
    console.error('[Trending] Error:', err.message)
    const filtered = filterByIndustry(filterByPlatform(localizeMockVideos(mockTrendingVideos, region), platform), industry)
    const storage = await upsertReels(filtered, { source: 'mock-error-fallback', region, industry })
    res.json({ data: filtered, source: 'mock', region, industry, storage, error: err.message })
  }
})

// GET /api/trending/stored?platform=all&region=SG&industry=fnb
router.get('/stored', async (req, res) => {
  const { platform = 'all', region = 'all', industry = 'all', limit = 100 } = req.query
  const result = await getStoredReels({ platform, region, industry, limit: Number(limit) || 100 })
  res.json(result)
})

// GET /api/trending/storage-status
router.get('/storage-status', (req, res) => {
  res.json({ supabase: getSupabaseStatus(), schemaSql: getReelsTableSql() })
})

export default router
