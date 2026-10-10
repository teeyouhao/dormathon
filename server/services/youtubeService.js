import axios from 'axios'

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

function isoDurationToClock(duration = 'PT30S') {
  const match = String(duration).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return '0:30'
  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')
  const total = hours * 3600 + minutes * 60 + seconds
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export async function fetchYouTubeTrending(apiKey, region = 'US', maxResults = 10) {
  if (!apiKey) {
    return null // Signal to use mock data
  }

  try {
    // Step 1: Get most popular videos (trending)
    const popularRes = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
      params: {
        key: apiKey,
        part: 'snippet,statistics,contentDetails',
        chart: 'mostPopular',
        regionCode: region,
        maxResults: maxResults,
        videoCategoryId: '0' // All categories
      }
    })

    const videos = popularRes.data.items.map((item, idx) => ({
      id: `yt-${item.id}`,
      platform: 'youtube',
      title: item.snippet.title,
      creator: item.snippet.channelTitle,
      creatorUrl: `https://youtube.com/channel/${item.snippet.channelId}`,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      views: parseInt(item.statistics.viewCount) || 0,
      likes: parseInt(item.statistics.likeCount) || 0,
      shares: 0, // YouTube API doesn't provide share count
      comments: parseInt(item.statistics.commentCount) || 0,
      duration: isoDurationToClock(item.contentDetails?.duration),
      region,
      location: region,
      category: item.snippet.categoryId || 'general',
      industry: 'general',
      url: `https://youtube.com/watch?v=${item.id}`,
      trendingRank: idx + 1,
      uploadedAt: item.snippet.publishedAt,
      description: item.snippet.description?.substring(0, 500),
      tags: item.snippet.tags || []
    }))

    // Sort by views (most viewed = most viral)
    videos.sort((a, b) => b.views - a.views)
    videos.forEach((v, i) => v.trendingRank = i + 1)

    return videos
  } catch (err) {
    console.error('[YouTube] Error fetching trending:', err.response?.data?.error?.message || err.message)
    return null
  }
}
