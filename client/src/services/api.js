import axios from 'axios'
import { mockTrendingVideos } from '../data/mockData'

const API_BASE = '/api'

function localTrendingFallback(platform = 'all', region = 'all') {
  let data = platform === 'all' ? mockTrendingVideos : mockTrendingVideos.filter(v => v.platform === platform)
  if (region !== 'all') {
    const exact = data.filter(v => v.region === region)
    data = exact.length > 0 ? exact : data.map(v => ({ ...v, region }))
  }
  return data
}

export async function fetchTrending(platform = 'all', region = 'all', industry = 'all') {
  try {
    const res = await axios.get(`${API_BASE}/trending`, { params: { platform, region, industry } })
    return res.data
  } catch (err) {
    console.warn('[API] Falling back to local data for trending:', err.message)
    return { data: localTrendingFallback(platform, region), source: 'local' }
  }
}

export async function generateReelConcept({ trendingVideo, businessType, brandName, industry }) {
  try {
    const res = await axios.post(`${API_BASE}/ai/concept`, {
      trendingVideo, businessType, brandName, industry
    })
    return res.data
  } catch (err) {
    console.warn('[API] AI concept fallback:', err.message)
    return generateLocalConcept(trendingVideo, businessType, brandName, industry)
  }
}

export async function createRemixPlan({ reel, brandInfo, files, preferences }) {
  try {
    const res = await axios.post(`${API_BASE}/editor/remix`, { reel, brandInfo, files, preferences })
    return res.data
  } catch (err) {
    console.warn('[API] Remix fallback:', err.message)
    return {
      success: true,
      message: 'Local remix plan generated',
      plan: buildLocalRemixPlan(reel, brandInfo, files, preferences)
    }
  }
}

export async function submitVideoEdit(editConfig) {
  try {
    const res = await axios.post(`${API_BASE}/editor/edit`, editConfig)
    return res.data
  } catch (err) {
    console.warn('[API] Edit fallback:', err.message)
    return { success: false, message: 'Editor service not running. Your edits remain saved in the browser project.' }
  }
}

export async function exportReel({ videoId, platforms, editConfig }) {
  try {
    const res = await axios.post(`${API_BASE}/editor/export`, { videoId, platforms, editConfig })
    return res.data
  } catch (err) {
    console.warn('[API] Export fallback:', err.message)
    return { success: false, message: 'Export service not running.' }
  }
}

export async function fetchProjects() {
  try {
    const res = await axios.get(`${API_BASE}/editor/projects`)
    return res.data.data || []
  } catch (err) {
    const saved = localStorage.getItem('viralReels_projects')
    if (!saved) return []
    try { return JSON.parse(saved) } catch { return [] }
  }
}

export async function saveProject(project) {
  try {
    const res = await axios.post(`${API_BASE}/editor/projects`, project)
    return res.data.data || res.data
  } catch (err) {
    const existing = JSON.parse(localStorage.getItem('viralReels_projects') || '[]')
    const savedProject = { ...project, id: project.id || `local_${Date.now()}`, savedAt: project.savedAt || Date.now() }
    const updated = [savedProject, ...existing.filter(p => p.id !== savedProject.id)]
    localStorage.setItem('viralReels_projects', JSON.stringify(updated))
    return savedProject
  }
}

export async function deleteProject(projectId) {
  try {
    await axios.delete(`${API_BASE}/editor/projects/${projectId}`)
    return { success: true }
  } catch (err) {
    const existing = JSON.parse(localStorage.getItem('viralReels_projects') || '[]')
    localStorage.setItem('viralReels_projects', JSON.stringify(existing.filter(p => p.id !== projectId)))
    return { success: true }
  }
}

export async function getHealth() {
  try {
    const res = await axios.get(`${API_BASE}/health`)
    return res.data
  } catch (err) {
    return { status: 'offline', services: {} }
  }
}

export async function getSettings() {
  try {
    const res = await axios.get(`${API_BASE}/settings`)
    return res.data
  } catch (err) {
    return { youtube: { apiKey: '' }, instagram: { enabled: false }, tiktok: { enabled: false }, ai: { provider: 'local', apiKey: '' }, supabase: { url: '', table: 'reels', keyConfigured: false } }
  }
}

export async function saveSettings(settings) {
  try {
    const res = await axios.post(`${API_BASE}/settings`, settings)
    return res.data
  } catch (err) {
    return { success: false, message: 'Settings service not running.' }
  }
}

function generateLocalConcept(video, businessType, brandName, industry) {
  const safeBrand = brandName || 'your brand'
  const safeIndustry = industry || 'SME'
  const hooks = [
    `POV: You just discovered ${safeBrand} and your life changed forever`,
    `3 reasons ${safeIndustry} businesses are switching to ${safeBrand}`,
    `This ${businessType || safeIndustry} hack went viral and we had to try it`,
    `Nobody talks about this ${safeIndustry} secret...`,
    `Watch ${safeBrand} transform this in 15 seconds`
  ]
  const structures = [
    'Hook (0-3s) -> Problem introduction (3-6s) -> Solution reveal (6-10s) -> Call to action (10-15s)',
    'Bold claim (0-2s) -> Evidence/story (2-8s) -> Twist (8-12s) -> CTA (12-15s)',
    'Question hook (0-3s) -> Rapid-fire tips (3-10s) -> Recap (10-13s) -> CTA (13-15s)'
  ]
  const hashtags = [
    `#${safeIndustry.replace(/\s+/g, '')}`, '#smallbusiness', '#viral', '#fyp', '#trending',
    `#${safeBrand.replace(/\s+/g, '').toLowerCase()}`, '#reels', '#sme'
  ]

  return {
    title: hooks[Math.floor(Math.random() * hooks.length)],
    script: `${hooks[Math.floor(Math.random() * hooks.length)]}\n\nScene 1: Open with a visually striking shot of your product/service in action.\n\nScene 2: Show the problem your customers face.\n\nScene 3: Reveal how ${safeBrand} solves it. Keep it punchy.\n\nScene 4: Show a satisfied customer reaction or result.\n\nScene 5: Call to action — "Follow ${safeBrand} for more ${safeIndustry} tips!"`,
    structure: structures[Math.floor(Math.random() * structures.length)],
    hashtags: hashtags.join(' '),
    music: 'Trending audio: upbeat, high-energy, 120-140 BPM',
    duration: '15s',
    inspiration: video ? `Inspired by "${video.title}" (${video.views} views on ${video.platform})` : '',
    viralityScore: Math.floor(Math.random() * 20) + 78,
    tips: [
      'Post between 7-9 PM local time for maximum reach',
      'Use 5-7 relevant hashtags — not too many',
      'First 2 seconds are critical — start with movement or a bold statement',
      'Add captions — 80% of viewers watch without sound',
      'Engage with every comment in the first hour after posting'
    ]
  }
}

function buildLocalRemixPlan(reel, brandInfo, files, preferences) {
  const duration = preferences?.duration || '15 seconds'
  const style = preferences?.style || 'Match trending pattern'
  const fileCount = files?.length || 0
  return {
    scenes: [
      `Scene 1 (0-3s): Open with the strongest uploaded clip and a hook inspired by "${reel?.title || 'the trend'}"`,
      'Scene 2 (3-6s): Show the customer problem or before-state',
      `Scene 3 (6-10s): Place ${brandInfo?.brandName || 'your brand'} as the solution`,
      'Scene 4 (10-13s): Add proof: transformation, result, testimonial, or fast montage',
      'Scene 5 (13-15s): End with CTA, logo, handle, and platform-safe captions'
    ],
    features: ['Auto-subtitles', `${duration} 9:16 cut`, `${style} pacing`, `${fileCount} uploaded file(s) analyzed`, 'Platform export plan for TikTok, Instagram, YouTube Shorts'],
    duration,
    style
  }
}
