import { useEffect, useRef, useState } from 'react'

// Native playback with real source-time bounds; no simulated video or render.
export default function ClipVideo({ src, poster, start = 0, end, playing, volume = 80, onPlayingChange, onProgress, onEnded, className, style }) {
  const ref = useRef(null)
  const callbacks = useRef({ onPlayingChange, onProgress, onEnded })
  callbacks.current = { onPlayingChange, onProgress, onEnded }
  const desiredPlaying = useRef(playing)
  desiredPlaying.current = playing
  const active = useRef(false)
  const finished = useRef(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const video = ref.current
    active.current = true
    finished.current = false
    const finish = () => {
      if (finished.current || !active.current) return
      finished.current = true
      video.pause()
      if (Number.isFinite(end)) video.currentTime = Math.min(end, video.duration || end)
      callbacks.current.onProgress?.(end)
      callbacks.current.onEnded?.()
    }
    const prepare = () => {
      video.currentTime = start
      if (desiredPlaying.current) video.play().catch(() => { if (active.current && desiredPlaying.current) callbacks.current.onPlayingChange(false) })
    }
    const progress = () => {
      if (!active.current) return
      callbacks.current.onProgress?.(video.currentTime)
      if (end != null && video.currentTime >= end - 0.015) finish()
    }
    const play = () => {
      if (video.currentTime < start || (end != null && video.currentTime >= end - 0.04)) video.currentTime = start
      finished.current = false
      callbacks.current.onPlayingChange(true)
    }
    const pause = () => {
      if (active.current && !finished.current && !video.ended) callbacks.current.onPlayingChange(false)
    }
    const seek = () => {
      if (video.currentTime < start - 0.02 || (end != null && video.currentTime > end + 0.02)) video.currentTime = start
    }
    video.addEventListener('loadedmetadata', prepare)
    video.addEventListener('timeupdate', progress)
    video.addEventListener('ended', finish)
    video.addEventListener('play', play)
    video.addEventListener('pause', pause)
    video.addEventListener('seeking', seek)
    if (video.readyState >= 1) prepare()
    const timer = setInterval(() => { if (!video.paused) progress() }, 25)
    return () => {
      active.current = false
      clearInterval(timer)
      video.removeEventListener('loadedmetadata', prepare)
      video.removeEventListener('timeupdate', progress)
      video.removeEventListener('ended', finish)
      video.removeEventListener('play', play)
      video.removeEventListener('pause', pause)
      video.removeEventListener('seeking', seek)
      video.pause()
    }
  }, [src, start, end])

  useEffect(() => {
    const video = ref.current
    video.volume = Math.min(1, Math.max(0, volume / 100))
    if (!playing) video.pause()
    else if (video.readyState >= 1) video.play().catch(() => { if (active.current && desiredPlaying.current) callbacks.current.onPlayingChange(false) })
  }, [playing, volume])

  return <>
    <video ref={ref} src={src} poster={poster} controls playsInline preload="metadata"
      aria-label="Selected clip preview" className={className} style={style}
      onError={() => { setError('This video could not be played. Try an MP4/H.264 or WebM file.'); onPlayingChange(false) }} />
    {error && <div role="alert" className="absolute inset-0 flex items-center justify-center bg-slate-100 p-5 text-center text-sm text-slate-800">{error}</div>}
  </>
}
