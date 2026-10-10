import { useState, useEffect } from 'react'
import { Flame, Search, RefreshCw, Play, X, Sparkles, MapPin, Calendar, Clock, ExternalLink } from 'lucide-react'
import { fetchTrending } from '../services/api'
import { platformInfo, industryCategories, industryAliases, southeastAsiaCountries } from '../data/mockData'
import ReelCard from './ReelCard'

const platforms = [
  { id: 'all', label: 'All Platforms', color: '#6366f1' },
  { id: 'youtube', label: 'YouTube Shorts', color: '#ff0000' },
  { id: 'instagram', label: 'Instagram', color: '#dc2743' },
  { id: 'tiktok', label: 'TikTok', color: '#00f2ea' }
]

function matchesIndustry(video, selectedIndustry) {
  if (selectedIndustry === 'all') return true
  const searchable = [
    video.industry,
    video.category,
    video.title,
    video.description,
    ...(video.tags || [])
  ].filter(Boolean).join(' ').toLowerCase().replace(/[&\s-]/g, '')
  const aliases = industryAliases[selectedIndustry] || [selectedIndustry]
  return aliases.some(alias => searchable.includes(alias.toLowerCase().replace(/[&\s-]/g, '')))
}

export default function TrendingFeed({ onSelectReel }) {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [platform, setPlatform] = useState('all')
  const [region, setRegion] = useState('all')
  const [industry, setIndustry] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [selectedVideo, setSelectedVideo] = useState(null)

  useEffect(() => {
    loadTrending()
  }, [platform, region, industry])

  const loadTrending = async () => {
    setLoading(true)
    const data = await fetchTrending(platform, region, industry)
    if (Array.isArray(data)) {
      setVideos(data)
    } else {
      setVideos(data?.data || [])
    }
    setLoading(false)
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return 'Unknown date'
    const now = new Date()
    const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    if (diff < 7) return `${diff} days ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const filtered = (videos || []).filter(v => {
    if (!matchesIndustry(v, industry)) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return v.title?.toLowerCase().includes(q) ||
             v.creator?.toLowerCase().includes(q) ||
             v.tags?.some(t => t.toLowerCase().includes(q)) ||
             v.location?.toLowerCase().includes(q) ||
             v.industry?.toLowerCase().includes(q) ||
             v.category?.toLowerCase().includes(q)
    }
    return true
  }).sort((a, b) => {
    if (sortBy === 'views') return (b.views || 0) - (a.views || 0)
    if (sortBy === 'likes') return (b.likes || 0) - (a.likes || 0)
    if (sortBy === 'shares') return (b.shares || 0) - (a.shares || 0)
    if (sortBy === 'recent') return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)
    return (a.trendingRank || 999) - (b.trendingRank || 999)
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {platforms.map(p => (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${platform === p.id ? 'text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
              style={platform === p.id ? { background: p.color } : {}}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 mr-1">Industry:</span>
          {industryCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setIndustry(cat.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${industry === cat.id ? 'bg-brand-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by title, creator, industry, country, tags..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-brand-500/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/40"
          />
        </div>
        <select
          value={region}
          onChange={e => setRegion(e.target.value)}
          className="px-3 py-2.5 rounded-lg bg-white/5 border border-brand-500/10 text-sm text-white focus:outline-none focus:border-brand-500/40"
        >
          {southeastAsiaCountries.map(r => <option key={r.id} value={r.id} className="bg-slate-800">{r.label}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="px-3 py-2.5 rounded-lg bg-white/5 border border-brand-500/10 text-sm text-white focus:outline-none focus:border-brand-500/40"
        >
          <option value="recent" className="bg-slate-800">Most Recent</option>
          <option value="trendingRank" className="bg-slate-800">Trending</option>
          <option value="views" className="bg-slate-800">Most Viewed</option>
          <option value="likes" className="bg-slate-800">Most Liked</option>
          <option value="shares" className="bg-slate-800">Most Shared</option>
        </select>
        <button
          onClick={loadTrending}
          className="px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="glass rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-[9/16] bg-slate-800" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-slate-700 rounded w-3/4" />
                <div className="h-3 bg-slate-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(video => (
            <ReelCard
              key={`${video.id}-${video.region || 'global'}`}
              video={video}
              onSelect={() => setSelectedVideo(video)}
              onUse={() => onSelectReel(video)}
            />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          <Flame className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400">No videos found. Try changing country, platform, industry or search filters.</p>
        </div>
      )}

      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setSelectedVideo(null)}>
          <div className="glass rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-brand-500/10">
              <h3 className="font-semibold text-white">Video Details</h3>
              <button onClick={() => setSelectedVideo(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-6 p-6">
              <div>
                <div className="relative aspect-[9/16] rounded-xl overflow-hidden">
                  <img src={selectedVideo.thumbnail} alt={selectedVideo.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-12 h-12 text-white/80" fill="white" />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <span className={`platform-badge platform-${selectedVideo.platform}`}>
                    {platformInfo[selectedVideo.platform]?.name || selectedVideo.platform}
                  </span>
                  <h2 className="text-lg font-bold text-white mt-2">{selectedVideo.title}</h2>
                  {selectedVideo.creatorUrl ? (
                    <a href={selectedVideo.creatorUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1 mt-1">
                      {selectedVideo.creator}<ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <p className="text-sm text-slate-400 mt-1">{selectedVideo.creator}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-400" />
                  <div><p className="text-xs text-slate-400">Published</p><p className="text-sm text-white">{formatDate(selectedVideo.uploadedAt)}</p></div>
                </div>
                {selectedVideo.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand-400" />
                    <div><p className="text-xs text-slate-400">Location</p><p className="text-sm text-white">{selectedVideo.location}</p></div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-400" />
                  <div><p className="text-xs text-slate-400">Duration</p><p className="text-sm text-white">{selectedVideo.duration}</p></div>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Industry</p>
                  <p className="text-sm text-white capitalize">{selectedVideo.industry || selectedVideo.category || 'General SME'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Description</p>
                  <p className="text-sm text-slate-300">{selectedVideo.description}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedVideo.tags?.map(tag => <span key={tag} className="px-2 py-1 rounded bg-brand-500/10 text-brand-300 text-xs">#{tag}</span>)}
                  </div>
                </div>
                <a href={selectedVideo.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300">
                  View original video <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => { onSelectReel(selectedVideo); setSelectedVideo(null) }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 text-white font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Open in AI Editor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
