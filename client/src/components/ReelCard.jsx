import { Eye, Heart, Share2, Play, Sparkles, Clock, MapPin, Calendar } from 'lucide-react'
import { isReferenceReel } from '../data/referenceReel'

export default function ReelCard({ video, onSelect, onUse }) {
  const reference = isReferenceReel(video)
  const likesHidden = video.likesHidden || video.likesCount === -1

  const formatNumber = (n) => {
    if (n == null || !Number.isFinite(n) || n < 0) return 'N/A'
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toString()
  }

  const formatDate = (dateStr) => {
    if (dateStr == null || dateStr === '') return 'Unknown date'
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return 'Unknown date'
    const now = new Date()
    const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    if (diff > 1 && diff < 7) return `${diff} days ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="reel-card glass rounded-2xl overflow-hidden flex flex-col group cursor-pointer" onClick={onSelect}>
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] overflow-hidden">
        {reference ? (
          <video
            src={video.videoUrl}
            poster={video.thumbnail}
            controls
            playsInline
            preload="none"
            aria-label={video.title}
            className="w-full h-full object-cover"
            onClickCapture={(event) => {
              const media = event.currentTarget
              const bounds = media.getBoundingClientRect()
              // Leave the native control strip and keyboard clicks to the browser.
              if (event.detail === 0 || event.clientY >= bounds.bottom - 64) return
              event.preventDefault()
              event.stopPropagation()
              if (media.paused) media.play().catch(() => {})
              else media.pause()
            }}
            onClick={(event) => event.stopPropagation()}
          />
        ) : (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        {/* Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20${reference ? ' pointer-events-none' : ''}`} />

        {/* Platform Badge */}
        <div className={`absolute top-2 left-2${reference ? ' pointer-events-none' : ''}`}>
          <span className={`platform-badge platform-${video.platform}`}>
            {video.platform}
          </span>
        </div>

        {/* Date Badge */}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-[10px] font-medium text-white flex items-center gap-1${reference ? ' pointer-events-none' : ''}`}>
          <Calendar className="w-2.5 h-2.5" /> {formatDate(video.uploadedAt)}
        </div>

        {/* Play Button */}
        {!reference && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
            </div>
          </div>
        )}

        {/* Duration */}
        {video.duration != null && video.duration !== '' && (
          <div className={`absolute right-2 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white font-medium flex items-center gap-1${reference ? ' bottom-14 pointer-events-none' : ' bottom-2'}`}>
            <Clock className="w-2.5 h-2.5" /> {video.duration}
          </div>
        )}

        {/* Bottom Info */}
        <div className={`absolute left-0 right-0 p-2${reference ? ' bottom-12 pointer-events-none' : ' bottom-0'}`}>
          {/* Location */}
          {video.location && (
            <div className="flex items-center gap-1 text-white/70 text-[10px] mb-0.5">
              <MapPin className="w-2.5 h-2.5" /> {video.location}
            </div>
          )}
          {/* Creator - clickable */}
          {video.creatorUrl ? (
            <a
              href={video.creatorUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`text-blue-300 text-[10px] hover:text-blue-200 hover:underline${reference ? ' pointer-events-auto' : ''}`}
            >
              {video.creator}
            </a>
          ) : (
            <span className="text-white/70 text-[10px]">{video.creator}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="text-sm font-medium text-white line-clamp-2">{video.title}</p>
        {video.source === 'apify-instagram' && <p className="text-[10px] text-slate-500">Source: Apify Instagram</p>}
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span title="Views" className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{formatNumber(video.views)}</span>
          <span title={likesHidden ? 'Hidden by creator' : 'Likes'} className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{likesHidden ? 'Hidden' : formatNumber(video.likes)}</span>
          <span title="Shares" className="flex items-center gap-0.5"><Share2 className="w-2.5 h-2.5" />{formatNumber(video.shares)}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onUse() }}
          className="mt-auto w-full py-2 rounded-lg bg-brand-600/20 hover:bg-brand-600/40 text-brand-300 hover:text-white text-xs font-semibold transition flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3 h-3" /> Use in Editor
        </button>
      </div>
    </div>
  )
}
