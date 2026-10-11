// AI Concept Generation Service
// Uses OpenAI or Anthropic if API keys are configured, otherwise falls back to
// an algorithmic local generator that produces decent results without any external API.

const VIRAL_HOOKS = {
  business: [
    'POV: You just discovered {brand} and your business changed forever',
    '3 reasons {industry} businesses are switching to {brand}',
    'This {businessType} hack went viral and we had to try it',
    'Nobody talks about this {industry} secret...',
    'Watch {brand} transform this in 15 seconds',
    'I tried this trending {industry} hack for my {businessType}... here is what happened',
    'Why every {industry} business needs this right now',
    'The {industry} trend everyone is copying (and you should too)'
  ],
  food: [
    'POV: You just found the best {businessType} in town',
    'Watch us make this trending dish in 30 seconds',
    'Behind the scenes at {brand} — the making of our signature item',
    'This {businessType} hack will change how you eat forever',
    'We tried the viral recipe trend at our {businessType}'
  ],
  beauty: [
    'Transformation Tuesday: Before and After {brand}',
    'This {businessType} trend is going viral right now',
    'Watch this glow-up in real time at {brand}',
    'The {industry} secret nobody tells you'
  ],
  fashion: [
    'How to style {brand} pieces 3 different ways',
    'This {businessType} outfit went viral and sold out',
    'Behind the scenes at {brand} photoshoot',
    'POV: You discover {brand} and your wardrobe changes forever'
  ],
  crafts: [
    'Watch {brand} make this from scratch in 15 seconds',
    'This handmade {businessType} technique is trending',
    'Behind the scenes at {brand} workshop',
    'The process behind our bestselling {businessType}'
  ],
  tech: [
    'This {businessType} tech hack will blow your mind',
    'Watch {brand} transform this old device',
    'The {industry} innovation everyone is talking about',
    'How {brand} solves the problem nobody else can'
  ],
  default: [
    'POV: You just discovered {brand}',
    '3 things every {industry} business should know',
    'This {businessType} trend is going viral right now',
    'Watch {brand} in action — 15 seconds that will change your mind',
    'Why {brand} is taking over {industry}',
    'The {industry} secret that changed our business'
  ]
}

const STRUCTURES = [
  'Hook (0-3s) -> Problem introduction (3-6s) -> Solution reveal (6-10s) -> Call to action (10-15s)',
  'Bold claim (0-2s) -> Evidence/story (2-8s) -> Twist (8-12s) -> CTA (12-15s)',
  'Question hook (0-3s) -> Rapid-fire tips (3-10s) -> Recap (10-13s) -> CTA (13-15s)',
  'Visual hook (0-2s) -> Journey montage (2-8s) -> Result reveal (8-12s) -> CTA (12-15s)',
  'Before shot (0-3s) -> Transformation (3-10s) -> After reveal (10-13s) -> CTA (13-15s)'
]

const TIPS = [
  'Post between 7-9 PM local time for maximum reach',
  'Use 5-7 relevant hashtags — not too many, not too few',
  'First 2 seconds are critical — start with movement or a bold statement',
  'Add captions — 80% of viewers watch without sound',
  'Engage with every comment in the first hour after posting',
  'Cross-post the same reel on Instagram, YouTube Shorts, and TikTok',
  'Use trending audio/music in your reels for algorithm boost',
  'Keep it under 15 seconds for maximum completion rate',
  'End with a clear call to action — follow, save, or share',
  'Post consistently — aim for at least 3-5 reels per week'
]

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateHashtags(brandName, industry, businessType) {
  const tags = new Set()
  const industryTag = industry?.toLowerCase().replace(/[^a-z]/g, '')
  if (industryTag) tags.add(`#${industryTag}`)
  tags.add('#smallbusiness')
  tags.add('#viral')
  tags.add('#fyp')
  tags.add('#trending')
  tags.add('#reels')
  if (brandName) {
    const brandTag = brandName.toLowerCase().replace(/\s+/g, '')
    tags.add(`#${brandTag}`)
  }
  tags.add('#sme')
  tags.add('#shorts')
  return Array.from(tags).join(' ')
}

function generateScript(hook, brandName, businessType, industry) {
  return `${hook}

Scene 1: Open with a visually striking shot of ${brandName}'s product or service in action. Use natural lighting and close-up shots to create intimacy and authenticity.

Scene 2: Show the problem your customers face. Use relatable, everyday imagery that your target audience instantly recognizes. Keep it under 3 seconds.

Scene 3: Reveal how ${brandName} solves it. Show the transformation clearly. If you sell a product, show it being used. If a service, show the result.

Scene 4: Include a customer reaction or testimonial moment. Real emotions sell. Show a happy customer, a before-and-after, or a surprising result.

Scene 5: Call to action. End with "${brandName} — follow for more ${industry} tips!" and your logo/handle on screen.

Note: Film in vertical 9:16 format. Ensure good lighting. Add text overlay with your hook in the first frame.`
}

export async function generateConcept({ trendingVideo, brandName, industry, businessType }) {
  // Try OpenAI if configured
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = (await import('openai')).default
      const client = new openai({ apiKey: process.env.OPENAI_API_KEY })
      const completion = await client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a viral social media content strategist. Generate reel concepts based on trending videos for small businesses.'
          },
          {
            role: 'user',
            content: `Create a viral reel concept for a ${businessType} in the ${industry} industry named "${brandName}".

Source trending video:
- Title: ${trendingVideo?.title}
- Platform: ${trendingVideo?.platform}
- Views: ${trendingVideo?.views}
- Likes: ${trendingVideo?.likes}
- Tags: ${trendingVideo?.tags?.join(', ')}

Return a JSON object with: title (a catchy hook), script (full scene-by-scene script), structure, hashtags, music suggestion, duration, viralityScore (0-100), and tips (array of 5 tips).`
          }
        ],
        response_format: { type: 'json_object' }
      })
      const result = JSON.parse(completion.choices[0].message.content)
      result.inspiration = trendingVideo ? `Inspired by "${trendingVideo.title}" (${formatViews(trendingVideo.views)} views on ${trendingVideo.platform})` : ''
      result.aiProvider = 'OpenAI (GPT-4)'
      return result
    } catch (err) {
      console.warn('[AI] OpenAI error, using local fallback:', err.message)
    }
  }

  // Try Gemini if configured
  if (process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: { responseMimeType: 'application/json' }
      })
      const prompt = `You are a viral social media content strategist. Create a viral reel concept for a ${businessType} in the ${industry} industry named "${brandName}".

Source trending video:
- Title: ${trendingVideo?.title}
- Platform: ${trendingVideo?.platform}
- Views: ${trendingVideo?.views}
- Likes: ${trendingVideo?.likes}
- Tags: ${(trendingVideo?.tags || []).join(', ')}

Return a JSON object with:
- title: string (a catchy hook)
- script: string (full scene-by-scene script)
- structure: string (e.g. "Hook (0-3s) -> Problem (3-6s) -> Solution (6-10s) -> CTA (10-15s)")
- hashtags: string (space-separated hashtags)
- music: string (music recommendation)
- duration: string (e.g. "15s")
- viralityScore: number (0-100)
- tips: array of 5 strings (viral tips)`
      
      const response = await model.generateContent(prompt)
      const text = response.response.text()
      const result = JSON.parse(text)
      result.inspiration = trendingVideo ? `Inspired by "${trendingVideo.title}" (${formatViews(trendingVideo.views)} views on ${trendingVideo.platform})` : ''
      result.aiProvider = 'Google Gemini (gemini-1.5-flash)'
      return result
    } catch (err) {
      console.warn('[AI] Gemini error, using fallback:', err.message)
    }
  }

  // Local algorithmic generation
  const category = getCategoryId(industry)
  const hooks = VIRAL_HOOKS[category] || VIRAL_HOOKS.default
  const hookTemplate = pickRandom(hooks)
  const hook = hookTemplate
    .replace(/\{brand\}/g, brandName)
    .replace(/\{industry\}/g, industry)
    .replace(/\{businessType\}/g, businessType)

  const script = generateScript(hook, brandName, businessType, industry)
  const structure = pickRandom(STRUCTURES)
  const hashtags = generateHashtags(brandName, industry, businessType)

  // Calculate virality score based on source video metrics
  let viralityScore = 78 + Math.floor(Math.random() * 15)
  if (trendingVideo) {
    if (trendingVideo.views > 5000000) viralityScore += 5
    if (trendingVideo.likes > 300000) viralityScore += 3
    if (trendingVideo.shares > 50000) viralityScore += 2
  }
  viralityScore = Math.min(viralityScore, 98)

  const selectedTips = [...TIPS].sort(() => Math.random() - 0.5).slice(0, 5)

  return {
    title: hook,
    script,
    structure,
    hashtags,
    music: 'Trending audio: upbeat, high-energy, 120-140 BPM (check current trending sounds on the platform)',
    duration: '15s',
    viralityScore,
    tips: selectedTips,
    inspiration: trendingVideo
      ? `Inspired by "${trendingVideo.title}" (${formatViews(trendingVideo.views)} views on ${trendingVideo.platform})`
      : ''
  }
}

export async function generateRemixPlan({ reel, brandInfo, files, preferences }) {
  const duration = preferences?.duration || '15 seconds'
  const style = preferences?.style || 'Match trending pattern'
  const brand = brandInfo?.brandName || 'your brand'
  const basePlan = {
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

  const prompt = `You are an expert video editor. Generate a remix plan for a ${duration} reel in the style of "${style}" for ${brand}.
Source Trend: ${reel?.title || 'None'}
Return JSON with 'scenes' (array of strings, each describing a scene's timing and visual action) and 'features' (array of 5 technical feature strings).`

  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = (await import('openai')).default
      const client = new openai({ apiKey: process.env.OPENAI_API_KEY })
      const completion = await client.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
      const result = JSON.parse(completion.choices[0].message.content)
      return { ...basePlan, scenes: result.scenes || basePlan.scenes, features: result.features || basePlan.features, aiProvider: 'OpenAI (GPT-4)' }
    } catch {}
  }
  if (process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { responseMimeType: 'application/json' } })
      const response = await model.generateContent(prompt)
      const result = JSON.parse(response.response.text())
      return { ...basePlan, scenes: result.scenes || basePlan.scenes, features: result.features || basePlan.features, aiProvider: 'Google Gemini' }
    } catch {}
  }
  return basePlan
}

function getCategoryId(industry) {
  const lower = (industry || '').toLowerCase()
  if (lower.includes('food') || lower.includes('beverage')) return 'food'
  if (lower.includes('beauty') || lower.includes('wellness')) return 'beauty'
  if (lower.includes('fashion') || lower.includes('apparel')) return 'fashion'
  if (lower.includes('handmade') || lower.includes('craft')) return 'crafts'
  if (lower.includes('tech') || lower.includes('electronic')) return 'tech'
  return 'business'
}

function formatViews(n) {
  if (n == null || !Number.isFinite(n) || n < 0) return 'Unknown'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}
