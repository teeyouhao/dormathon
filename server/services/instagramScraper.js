// Server-only Apify provider. Never log request URLs, tokens or upstream error bodies.
const ACTOR_URL = 'https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items'
export const INSTAGRAM_HASHTAGS = Object.freeze(['mostviewed', 'trending', 'viral'])

function boundedNumber(value, fallback, min, max) {
  const number = value === undefined || value === '' ? fallback : Number(value)
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback
}

export function getInstagramConfig(env = process.env) {
  return {
    enabled: env.INSTAGRAM_SCRAPING_ENABLED === 'true',
    tokenConfigured: Boolean(env.APIFY_TOKEN?.trim()),
    resultsPerHashtag: Math.floor(boundedNumber(env.APIFY_INSTAGRAM_RESULTS_LIMIT, 3, 1, 30)),
    onlyPostsNewerThan: (env.APIFY_INSTAGRAM_ONLY_POSTS_NEWER_THAN ?? '7 days').trim(),
    cacheMinutes: boundedNumber(env.APIFY_INSTAGRAM_CACHE_MINUTES, 30, 1, 1440),
    maxChargeUsd: boundedNumber(env.APIFY_INSTAGRAM_MAX_CHARGE_USD, 0.1, 0.01, 1),
    timeoutSeconds: Math.floor(boundedNumber(env.APIFY_INSTAGRAM_TIMEOUT_SECONDS, 180, 10, 240))
  }
}

export function buildInstagramInput(config = getInstagramConfig()) {
  return {
    resultsType: 'reels',
    directUrls: INSTAGRAM_HASHTAGS.map(tag => `https://www.instagram.com/explore/tags/${tag}/`),
    resultsLimit: config.resultsPerHashtag,
    ...(config.onlyPostsNewerThan ? { onlyPostsNewerThan: config.onlyPostsNewerThan } : {})
  }
}

function metric(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

function httpsUrl(value) {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch { return null }
}

export function normalizeInstagramReel(item) {
  if (!item || item.productType !== 'clips') return null
  const videoUrl = httpsUrl(item.videoUrl)
  if (!videoUrl) return null
  const shortCode = typeof item.shortCode === 'string' && /^[\w-]+$/.test(item.shortCode) ? item.shortCode : null
  const externalId = shortCode || (item.id != null ? String(item.id) : null)
  if (!externalId) return null
  const caption = typeof item.caption === 'string' ? item.caption : ''
  const hashtags = Array.isArray(item.hashtags) ? [...new Set(item.hashtags.filter(tag => typeof tag === 'string'))] : []
  const ownerUsername = typeof item.ownerUsername === 'string' ? item.ownerUsername : ''
  const likesHidden = item.likesCount === -1
  const likesCount = likesHidden ? -1 : metric(item.likesCount)
  const commentsCount = metric(item.commentsCount)
  const videoViewCount = metric(item.videoViewCount)
  const videoPlayCount = metric(item.videoPlayCount)
  const timestamp = typeof item.timestamp === 'string' && Number.isFinite(Date.parse(item.timestamp)) ? item.timestamp : null
  const seconds = metric(item.videoDuration)
  const duration = seconds === null ? null : `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

  return {
    id: `instagram-${externalId}`,
    platform: 'instagram',
    source: 'apify-instagram',
    productType: 'clips',
    videoUrl,
    caption,
    hashtags,
    ownerUsername,
    likesCount,
    commentsCount,
    videoViewCount,
    videoPlayCount,
    timestamp,
    shortCode,
    likesHidden,
    title: caption.slice(0, 100) || 'Instagram Reel',
    description: caption,
    tags: hashtags,
    creator: ownerUsername ? `@${ownerUsername}` : '',
    creatorUrl: ownerUsername ? `https://www.instagram.com/${encodeURIComponent(ownerUsername)}/` : '',
    thumbnail: httpsUrl(item.displayUrl) || '',
    views: videoViewCount ?? videoPlayCount,
    likes: likesHidden ? null : likesCount,
    comments: commentsCount,
    shares: null,
    duration,
    region: 'all', // Global hashtag discovery cannot infer the creator's country.
    location: typeof item.locationName === 'string' ? item.locationName : '',
    url: shortCode ? `https://www.instagram.com/reel/${shortCode}/` : '',
    uploadedAt: timestamp
  }
}

export class InstagramFetchError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'InstagramFetchError'
    this.code = code
  }
}

function responseError(status) {
  if (status === 401 || status === 403) return new InstagramFetchError('AUTH', 'Instagram: Apify rejected authentication. Check the server APIFY_TOKEN and Actor access.')
  if (status === 402) return new InstagramFetchError('CREDIT', 'Instagram: Apify credits or billing limits prevented the run.')
  if (status === 429) return new InstagramFetchError('RATE_LIMIT', 'Instagram: Apify rate limit reached. Please wait before retrying.')
  if (status === 400) return new InstagramFetchError('INPUT', 'Instagram: Apify rejected the reels/hashtag input. Check the Actor input schema; no alternative input mode was used.')
  if (status === 408) return new InstagramFetchError('TIMEOUT', 'Instagram: Apify timed out. The remote run may still be active; check its status before starting another run.')
  return new InstagramFetchError('UPSTREAM', `Instagram: Apify returned HTTP ${status}. No automatic retry was made.`)
}

// Injectable dependencies keep automated tests offline and prevent accidental paid runs.
export function createInstagramFetcher({ fetchImpl = globalThis.fetch, getEnv = () => process.env, now = Date.now } = {}) {
  let cache = null
  let inFlight = null
  let failure = null

  return async function fetchInstagramTrending(options = {}) {
    const env = getEnv()
    const config = getInstagramConfig(env)
    if (!config.enabled) return null
    if (!config.tokenConfigured) throw new InstagramFetchError('NOT_CONFIGURED', 'Instagram: configure APIFY_TOKEN on the server to enable live reels.')
    const input = buildInstagramInput(config)
    const token = env.APIFY_TOKEN.trim()
    const key = JSON.stringify([input, config.maxChargeUsd, config.timeoutSeconds, token])
    const maxResults = Math.floor(boundedNumber(options.maxResults, 10, 1, 90))
    const copy = result => {
      if (typeof options.onWarning === 'function') {
        for (const warning of result.warnings) options.onWarning(warning)
      }
      return structuredClone(result.data.slice(0, maxResults))
    }

    // Region/industry/display-limit changes never start a second identical paid run unless force is requested.
    if (!options.force && cache?.key === key && cache.expiresAt > now()) return copy(cache.result)
    if (!options.force && failure?.key === key && failure.retryAt > now()) throw failure.error
    if (inFlight) {
      // Even configuration changes cannot launch parallel billable runs in this process.
      const pending = inFlight
      if (pending.key === key) return copy(await pending.promise)
      await pending.promise.catch(() => {})
      return fetchInstagramTrending(options)
    }

    const promise = (async () => {
      try {
        const maxItems = config.resultsPerHashtag * INSTAGRAM_HASHTAGS.length
        const url = new URL(ACTOR_URL)
        url.searchParams.set('token', token)
        url.searchParams.set('timeout', String(config.timeoutSeconds))
        url.searchParams.set('maxItems', String(maxItems))
        url.searchParams.set('maxTotalChargeUsd', String(config.maxChargeUsd))
        url.searchParams.set('limit', String(maxItems))
        url.searchParams.set('restartOnError', 'false')
        const response = await fetchImpl(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(input),
          // A remote run timeout and an HTTP deadline are separate safeguards.
          signal: AbortSignal.timeout((config.timeoutSeconds + 15) * 1000)
        })
        if (!response.ok) {
          await response.body?.cancel().catch(() => {})
          throw responseError(response.status)
        }
        const items = await response.json()
        if (!Array.isArray(items)) throw new InstagramFetchError('INVALID_DATA', 'Instagram: Apify returned an unexpected dataset response.')
        const unique = new Map()
        for (const item of items.slice(0, maxItems)) {
          const reel = normalizeInstagramReel(item)
          if (reel && !unique.has(reel.id)) unique.set(reel.id, reel)
        }
        const data = [...unique.values()].sort((a, b) => (b.views ?? -1) - (a.views ?? -1))
        const hasErrors = items.some(item => item?.error || item?.errorDescription)
        if (!data.length && hasErrors) {
          throw new InstagramFetchError('DATASET_ERROR', 'Instagram: Apify returned dataset errors, not playable reels. Check the Actor run; no alternative input mode was used.')
        }
        const result = {
          data,
          warnings: hasErrors ? ['Instagram: some hashtag requests returned errors. Showing the playable clips that succeeded; check the Actor run for details.'] : []
        }
        cache = { key, result, expiresAt: now() + config.cacheMinutes * 60000 }
        failure = null
        return result
      } catch (error) {
        // Never forward an upstream message: it can contain the token-bearing URL.
        const safe = error instanceof InstagramFetchError ? error : new InstagramFetchError(
          error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK',
          'Instagram: the Apify request failed or timed out. Check the Actor run before retrying; it may still incur charges.'
        )
        failure = { key, error: safe, retryAt: now() + Math.max(5, config.cacheMinutes) * 60000 }
        throw safe
      }
    })()
    inFlight = { key, promise }
    try { return copy(await promise) } finally { inFlight = null }
  }
}

export const fetchInstagramTrending = createInstagramFetcher()
