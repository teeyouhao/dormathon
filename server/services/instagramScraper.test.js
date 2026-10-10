import test from 'node:test'
import assert from 'node:assert/strict'
import { buildInstagramInput, createInstagramFetcher, getInstagramConfig, normalizeInstagramReel } from './instagramScraper.js'
import { normalizeReel } from './supabaseStore.js'
import { generateConcept } from './aiService.js'

// All API responses are fixtures. These tests never read .env or start a paid Actor.
const environment = (overrides = {}) => ({
  APIFY_TOKEN: 'test-token-not-a-real-key',
  INSTAGRAM_SCRAPING_ENABLED: 'true',
  ...overrides
})
const item = (overrides = {}) => ({
  id: '123', shortCode: 'ABC_123', productType: 'clips',
  videoUrl: 'https://cdn.example.com/reel.mp4', displayUrl: 'https://cdn.example.com/image.jpg',
  caption: 'A reel #viral', hashtags: ['viral'], ownerUsername: 'creator',
  likesCount: 20, commentsCount: 4, videoViewCount: 100, videoPlayCount: 120,
  timestamp: '2026-10-09T12:00:00.000Z', videoDuration: 12.8,
  ...overrides
})
const response = (items = [item()]) => ({ ok: true, json: async () => items })

function harness({ env = environment(), result, fetchImpl, clock = () => 0 } = {}) {
  const calls = []
  const fetcher = createInstagramFetcher({
    getEnv: () => env,
    now: clock,
    fetchImpl: async (url, options) => {
      calls.push({ url: new URL(url), options })
      return fetchImpl ? fetchImpl(url, options) : response(result)
    }
  })
  return { fetcher, calls, env }
}

test('input uses only the three requested hashtag URLs and reels mode', () => {
  const input = buildInstagramInput(getInstagramConfig(environment()))
  assert.deepEqual(input, {
    resultsType: 'reels',
    directUrls: ['mostviewed', 'trending', 'viral'].map(tag => `https://www.instagram.com/explore/tags/${tag}/`),
    resultsLimit: 3,
    onlyPostsNewerThan: '7 days'
  })
  assert.equal('search' in input, false)
  assert.equal('searchType' in input, false)
})

test('bounds server limits and permits omitting freshness', () => {
  const config = getInstagramConfig(environment({
    APIFY_INSTAGRAM_RESULTS_LIMIT: '999', APIFY_INSTAGRAM_MAX_CHARGE_USD: '10',
    APIFY_INSTAGRAM_TIMEOUT_SECONDS: '500', APIFY_INSTAGRAM_CACHE_MINUTES: '0',
    APIFY_INSTAGRAM_ONLY_POSTS_NEWER_THAN: ''
  }))
  assert.equal(config.resultsPerHashtag, 30)
  assert.equal(config.maxChargeUsd, 1)
  assert.equal(config.timeoutSeconds, 240)
  assert.equal(config.cacheMinutes, 1)
  assert.equal('onlyPostsNewerThan' in buildInstagramInput(config), false)
  assert.equal(getInstagramConfig(environment({ APIFY_INSTAGRAM_RESULTS_LIMIT: 'bad' })).resultsPerHashtag, 3)
  assert.equal(getInstagramConfig(environment({ APIFY_INSTAGRAM_RESULTS_LIMIT: '-1' })).resultsPerHashtag, 1)
  assert.equal(getInstagramConfig(environment()).APIFY_TOKEN, undefined)
})

test('does not contact Apify when disabled or token missing', async () => {
  const disabled = harness({ env: environment({ INSTAGRAM_SCRAPING_ENABLED: 'false' }) })
  assert.equal(await disabled.fetcher(), null)
  assert.equal(disabled.calls.length, 0)
  const missing = harness({ env: environment({ APIFY_TOKEN: '  ' }) })
  await assert.rejects(missing.fetcher(), { code: 'NOT_CONFIGURED' })
  assert.equal(missing.calls.length, 0)
})

test('sends one bounded POST with token and no restart', async () => {
  const { fetcher, calls } = harness()
  await fetcher()
  assert.equal(calls.length, 1)
  const { url, options } = calls[0]
  assert.equal(url.origin, 'https://api.apify.com')
  assert.equal(url.pathname, '/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items')
  assert.equal(url.searchParams.get('token'), environment().APIFY_TOKEN)
  assert.equal(url.searchParams.get('maxItems'), '9')
  assert.equal(url.searchParams.get('limit'), '9')
  assert.equal(url.searchParams.get('maxTotalChargeUsd'), '0.1')
  assert.equal(url.searchParams.get('timeout'), '180')
  assert.equal(url.searchParams.get('restartOnError'), 'false')
  assert.equal(options.method, 'POST')
  assert.equal(options.headers['Content-Type'], 'application/json')
  assert.ok(options.signal instanceof AbortSignal)
  assert.deepEqual(JSON.parse(options.body), buildInstagramInput(getInstagramConfig(environment())))
})

test('preserves requested metadata, source, permalink and direct media separately', () => {
  const original = item()
  const reel = normalizeInstagramReel(original)
  for (const key of ['videoUrl', 'caption', 'hashtags', 'ownerUsername', 'likesCount', 'commentsCount', 'videoViewCount', 'videoPlayCount', 'timestamp', 'shortCode']) {
    assert.deepEqual(reel[key], original[key], key)
  }
  assert.equal(reel.id, 'instagram-ABC_123')
  assert.equal(reel.source, 'apify-instagram')
  assert.equal(reel.url, 'https://www.instagram.com/reel/ABC_123/')
  assert.equal(reel.duration, '0:12')
  assert.equal(reel.region, 'all')
  assert.equal(reel.shares, null)
})

test('strictly rejects non-clips and missing or unsafe video URLs', () => {
  for (const value of [null, {}, item({ productType: 'feed' }), item({ productType: undefined }), item({ videoUrl: '' }), item({ videoUrl: undefined }), item({ videoUrl: 'javascript:alert(1)' }), item({ videoUrl: 'http://cdn.example.com/test.mp4' })]) {
    assert.equal(normalizeInstagramReel(value), null)
  }
})

test('hidden likes are not errors or fake zeroes', () => {
  const reel = normalizeInstagramReel(item({ likesCount: -1 }))
  assert.equal(reel.likesCount, -1)
  assert.equal(reel.likesHidden, true)
  assert.equal(reel.likes, null)
  const row = normalizeReel(reel, { source: 'live', region: 'SG' })
  assert.equal(row.likes, null)
  assert.equal(row.source, 'apify-instagram')
  assert.equal(row.external_id, 'ABC_123')
  assert.equal(row.raw.likesCount, -1)
  assert.equal(row.raw.videoUrl, reel.videoUrl)
  assert.equal(row.region, 'all')
})

test('unknown metrics/dates remain null, zero views are retained and plays are a fallback', () => {
  const reel = normalizeInstagramReel(item({ likesCount: undefined, commentsCount: null, videoViewCount: undefined, videoPlayCount: 70, timestamp: 'invalid', videoDuration: undefined }))
  assert.equal(reel.views, 70)
  assert.equal(reel.likes, null)
  assert.equal(reel.likesHidden, false)
  assert.equal(reel.comments, null)
  assert.equal(reel.timestamp, null)
  assert.equal(reel.duration, null)
  assert.equal(normalizeInstagramReel(item({ videoViewCount: 0 })).views, 0)
  assert.equal(normalizeInstagramReel(item({ videoViewCount: undefined, videoPlayCount: undefined })).views, null)
})

test('filters and deduplicates before sorting/limiting; cached results are isolated copies', async () => {
  const { fetcher, calls } = harness({ result: [item(), item(), item({ productType: 'feed' }), item({ shortCode: 'B', videoViewCount: 999 })] })
  const first = await fetcher({ maxResults: 1, region: 'SG' })
  assert.equal(first.length, 1)
  assert.equal(first[0].shortCode, 'B')
  first[0].source = 'mutated'
  first[0].tags.push('mutated')
  const next = await fetcher({ maxResults: 10, region: 'MY' })
  assert.equal(next.length, 2)
  assert.equal(next[0].source, 'apify-instagram')
  assert.deepEqual(next[0].tags, ['viral'])
  assert.equal(calls.length, 1)
})

test('coalesces simultaneous requests into one paid run', async () => {
  let finish
  const { fetcher, calls } = harness({ fetchImpl: () => new Promise(resolve => { finish = resolve }) })
  const first = fetcher()
  const second = fetcher()
  finish(response())
  assert.deepEqual(await first, await second)
  assert.equal(calls.length, 1)
})

test('empty results are cached, avoiding repeat charges for filtered datasets', async () => {
  const { fetcher, calls } = harness({ result: [item({ productType: 'feed' })] })
  assert.deepEqual(await fetcher(), [])
  assert.deepEqual(await fetcher(), [])
  assert.equal(calls.length, 1)
})

test('cache expires only after the configured TTL', async () => {
  let time = 0
  const { fetcher, calls } = harness({ clock: () => time })
  await fetcher()
  time = 29 * 60000
  await fetcher()
  assert.equal(calls.length, 1)
  time = 31 * 60000
  await fetcher()
  assert.equal(calls.length, 2)
})

test('token rotation does not reuse previous token cache', async () => {
  const { fetcher, calls, env } = harness()
  await fetcher()
  env.APIFY_TOKEN = 'rotated-test-token'
  await fetcher()
  assert.equal(calls.length, 2)
})

for (const [status, code] of [[400, 'INPUT'], [401, 'AUTH'], [403, 'AUTH'], [402, 'CREDIT'], [408, 'TIMEOUT'], [429, 'RATE_LIMIT'], [500, 'UPSTREAM']]) {
  test(`HTTP ${status} is sanitized and enters cooldown without retrying`, async () => {
    const { fetcher, calls } = harness({ fetchImpl: async () => ({ ok: false, status }) })
    for (let attempt = 0; attempt < 2; attempt++) await assert.rejects(fetcher(), error => {
      assert.equal(error.code, code)
      assert.equal(error.message.includes(environment().APIFY_TOKEN), false)
      return true
    })
    assert.equal(calls.length, 1)
  })
}

test('network exceptions cannot leak the token and are not automatically retried', async () => {
  const { fetcher, calls } = harness({ fetchImpl: async () => { throw new Error(`Failed URL?token=${environment().APIFY_TOKEN}`) } })
  await assert.rejects(fetcher(), error => error.code === 'NETWORK' && !error.message.includes(environment().APIFY_TOKEN))
  await assert.rejects(fetcher(), { code: 'NETWORK' })
  assert.equal(calls.length, 1)
})

test('timeouts are identified and cooled down', async () => {
  const { fetcher } = harness({ fetchImpl: async () => { throw Object.assign(new Error('private upstream details'), { name: 'TimeoutError' }) } })
  await assert.rejects(fetcher(), { code: 'TIMEOUT' })
})

test('invalid envelopes and error datasets are visible failures, not live data', async () => {
  await assert.rejects(harness({ result: { error: 'bad' } }).fetcher(), { code: 'INVALID_DATA' })
  await assert.rejects(harness({ result: [{ error: 'no_items', errorDescription: 'upstream private details' }] }).fetcher(), { code: 'DATASET_ERROR' })
})

test('partial dataset failures retain clips and sanitized warnings across cache hits', async () => {
  const { fetcher, calls } = harness({ result: [item(), { error: 'private upstream error' }] })
  for (let attempt = 0; attempt < 2; attempt++) {
    const warnings = []
    assert.equal((await fetcher({ onWarning: warning => warnings.push(warning) })).length, 1)
    assert.equal(warnings.length, 1)
    assert.equal(warnings[0].includes('private upstream error'), false)
  }
  assert.equal(calls.length, 1)
})

test('unknown Instagram views remain usable in local AI concepts', async () => {
  const previous = process.env.OPENAI_API_KEY
  delete process.env.OPENAI_API_KEY
  try {
    const trendingVideo = normalizeInstagramReel(item({ videoViewCount: undefined, videoPlayCount: undefined }))
    const concept = await generateConcept({ trendingVideo, brandName: 'Test', industry: 'food', businessType: 'cafe' })
    assert.ok(concept.inspiration.includes('Unknown views'))
  } finally {
    if (previous !== undefined) process.env.OPENAI_API_KEY = previous
  }
})

test('failure cooldown eventually permits an explicit later request', async () => {
  let time = 0
  let requests = 0
  const { fetcher } = harness({ clock: () => time, fetchImpl: async () => {
    requests++
    if (requests === 1) throw new Error('network')
    return response()
  } })
  await assert.rejects(fetcher())
  time = 29 * 60000
  await assert.rejects(fetcher())
  assert.equal(requests, 1)
  time = 31 * 60000
  assert.equal((await fetcher()).length, 1)
  assert.equal(requests, 2)
})
