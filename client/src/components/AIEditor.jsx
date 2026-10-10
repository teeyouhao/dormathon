import { useState, useRef, useEffect } from 'react'
import {
  Scissors, Sparkles, Film, X, Play, Pause, Type, Music2,
  Palette, Crop, Zap, TrendingUp, Copy, Check, Loader2,
  Hash, Upload, Download, Undo2, Redo2, Plus, Trash2,
  Volume2, Sliders, Sticker, Wand2, ArrowLeft, ArrowRight,
  Clock, Save
} from 'lucide-react'
import { generateReelConcept, submitVideoEdit, saveProject, exportReel, createRemixPlan } from '../services/api'

const editorModes = [
  { id: 'edit', label: 'Edit', icon: Scissors },
  { id: 'generate', label: 'AI Concept', icon: Sparkles },
  { id: 'remix', label: 'Remix', icon: Film }
]

const capcutTools = [
  { id: 'trim', label: 'Trim', icon: Crop },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'audio', label: 'Audio', icon: Music2 },
  { id: 'filter', label: 'Filters', icon: Sliders },
  { id: 'sticker', label: 'Sticker', icon: Sticker },
  { id: 'effect', label: 'Effects', icon: Wand2 },
]

const musicTracks = [
  { id: 'trending1', name: 'Trending Beat #1', bpm: 128, mood: 'Energetic', duration: '0:30' },
  { id: 'trending2', name: 'Chill Vibes', bpm: 90, mood: 'Chill', duration: '0:30' },
  { id: 'trending3', name: 'Hype Up', bpm: 140, mood: 'Hype', duration: '0:30' },
  { id: 'trending4', name: 'Emotional Piano', bpm: 70, mood: 'Emotional', duration: '0:30' },
  { id: 'trending5', name: 'Corporate Upbeat', bpm: 120, mood: 'Professional', duration: '0:30' },
  { id: 'trending6', name: 'Summer Pop', bpm: 115, mood: 'Happy', duration: '0:30' },
]

const filterPresets = [
  { id: 'original', name: 'Original', style: { filter: 'none' } },
  { id: 'vivid', name: 'Vivid', style: { filter: 'saturate(1.5) contrast(1.1)' } },
  { id: 'warm', name: 'Warm', style: { filter: 'sepia(0.3) saturate(1.2)' } },
  { id: 'cool', name: 'Cool', style: { filter: 'hue-rotate(180deg) saturate(1.2)' } },
  { id: 'cinematic', name: 'Cinematic', style: { filter: 'contrast(1.3) saturate(0.8) brightness(0.9)' } },
  { id: 'vintage', name: 'Vintage', style: { filter: 'sepia(0.5) contrast(0.9) brightness(1.1)' } },
  { id: 'noir', name: 'Noir', style: { filter: 'grayscale(1) contrast(1.3)' } },
  { id: 'bright', name: 'Bright', style: { filter: 'brightness(1.3) saturate(1.3)' } },
]

export default function AIEditor({ selectedReel, brandInfo, onSaveBrandInfo, onReelChange, onClose }) {
  const sourceProject = selectedReel?.sourceVideo ? selectedReel : null
  const sourceReel = sourceProject?.sourceVideo || selectedReel
  const [mode, setMode] = useState('edit')
  const [activeTool, setActiveTool] = useState('trim')
  const [isPlaying, setIsPlaying] = useState(false)
  const [playhead, setPlayhead] = useState(0) // 0-100 percentage
  const [trimStart, setTrimStart] = useState(sourceProject?.edits?.trimStart ?? 0)
  const [trimEnd, setTrimEnd] = useState(sourceProject?.edits?.trimEnd ?? 100)
  const [textOverlays, setTextOverlays] = useState(sourceProject?.edits?.textOverlays || [])
  const [selectedMusic, setSelectedMusic] = useState(sourceProject?.edits?.selectedMusic || null)
  const [selectedFilter, setSelectedFilter] = useState(sourceProject?.edits?.selectedFilter || 'original')
  const [stickers, setStickers] = useState(sourceProject?.edits?.stickers || [])
  const [selectedEffect, setSelectedEffect] = useState(sourceProject?.edits?.selectedEffect || 'none')
  const [volume, setVolume] = useState(sourceProject?.edits?.volume ?? 80)
  const [editing, setEditing] = useState(false)
  const [editResult, setEditResult] = useState(null)
  const [saveStatus, setSaveStatus] = useState('')
  const [showExport, setShowExport] = useState(false)
  const [history, setHistory] = useState([])
  const [future, setFuture] = useState([])
  const timelineRef = useRef(null)

  // Playhead animation
  useEffect(() => {
    let interval
    if (isPlaying) {
      interval = setInterval(() => {
        setPlayhead(prev => {
          if (prev >= trimEnd) { setIsPlaying(false); return trimStart }
          return prev + 0.5
        })
      }, 50)
    }
    return () => clearInterval(interval)
  }, [isPlaying, trimStart, trimEnd])

  const reel = sourceReel
  if (!reel) return null

  const currentFilter = filterPresets.find(f => f.id === selectedFilter)

  const captureState = () => {
    setHistory(prev => [...prev.slice(-19), { trimStart, trimEnd, textOverlays, selectedMusic, selectedFilter, stickers, selectedEffect, volume }])
    setFuture([])
  }

  const restoreState = (state) => {
    setTrimStart(state.trimStart)
    setTrimEnd(state.trimEnd)
    setTextOverlays(state.textOverlays || [])
    setSelectedMusic(state.selectedMusic || null)
    setSelectedFilter(state.selectedFilter || 'original')
    setStickers(state.stickers || [])
    setSelectedEffect(state.selectedEffect || 'none')
    setVolume(state.volume ?? 80)
  }

  const handleUndo = () => {
    if (history.length === 0) return
    const previous = history[history.length - 1]
    setFuture(prev => [{ trimStart, trimEnd, textOverlays, selectedMusic, selectedFilter, stickers, selectedEffect, volume }, ...prev])
    setHistory(prev => prev.slice(0, -1))
    restoreState(previous)
  }

  const handleRedo = () => {
    if (future.length === 0) return
    const next = future[0]
    setHistory(prev => [...prev, { trimStart, trimEnd, textOverlays, selectedMusic, selectedFilter, stickers, selectedEffect, volume }])
    setFuture(prev => prev.slice(1))
    restoreState(next)
  }

  const togglePlay = () => setIsPlaying(!isPlaying)

  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    setPlayhead(Math.max(trimStart, Math.min(trimEnd, pct)))
  }

  const addTextOverlay = () => {
    captureState()
    const newText = {
      id: Date.now(),
      content: 'Your text here',
      position: 'bottom',
      startTime: 0,
      endTime: 100,
      fontSize: 24,
      color: '#ffffff',
      bgColor: 'rgba(0,0,0,0.5)',
    }
    setTextOverlays([...textOverlays, newText])
    setActiveTool('text')
  }

  const updateTextOverlay = (id, updates) => {
    setTextOverlays(textOverlays.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  const removeTextOverlay = (id) => {
    captureState()
    setTextOverlays(textOverlays.filter(t => t.id !== id))
  }

  const addSticker = (emoji) => {
    captureState()
    setStickers([...stickers, { id: Date.now(), emoji, position: 'center', startTime: 0, endTime: 100 }])
  }

  const removeSticker = (id) => {
    captureState()
    setStickers(stickers.filter(s => s.id !== id))
  }

  const currentEdits = () => ({
    trimStart,
    trimEnd,
    textOverlays,
    selectedMusic,
    selectedFilter,
    stickers,
    selectedEffect,
    volume
  })

  const handleApplyEdits = async () => {
    setEditing(true)
    const res = await submitVideoEdit({
      videoId: reel.id,
      videoUrl: reel.url,
      trim: { start: trimStart, end: trimEnd },
      textOverlays,
      text: textOverlays[0] ? { content: textOverlays[0].content, position: textOverlays[0].position, style: { fontSize: textOverlays[0].fontSize, color: textOverlays[0].color } } : null,
      music: selectedMusic,
      filter: selectedFilter,
      stickers,
      effect: selectedEffect,
      volume,
    })
    setEditResult(res)
    setEditing(false)
  }

  const handleSaveProject = async () => {
    setSaveStatus('Saving...')
    const project = {
      id: sourceProject?.id,
      title: reel.title,
      thumbnail: reel.thumbnail,
      platform: reel.platform,
      sourceVideo: reel,
      savedAt: Date.now(),
      edits: currentEdits(),
      editResult
    }
    const saved = await saveProject(project)
    setSaveStatus('Saved to Projects')
    onReelChange?.(saved)
    setTimeout(() => setSaveStatus(''), 2000)
  }

  const formatTime = (pct) => {
    const parts = String(reel.duration || '0:30').split(':').map(Number)
    const totalSec = parts.length === 2 ? (parts[0] * 60 + parts[1]) : Number(reel.duration) || 30
    const sec = (pct / 100) * totalSec
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col">
      {/* ===== Top Bar ===== */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#12121a] border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-slate-400 hover:text-white transition flex items-center gap-1">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm hidden sm:inline">Back</span>
          </button>
          <div className="h-6 w-px bg-white/10" />
          {/* Mode Tabs */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            {editorModes.map(m => {
              const Icon = m.icon
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${mode === m.id ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <Icon className="w-3.5 h-3.5" /> {m.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <button onClick={handleUndo} disabled={history.length === 0} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition disabled:opacity-30">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={handleRedo} disabled={future.length === 0} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition disabled:opacity-30">
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="h-6 w-px bg-white/10 mx-1" />
          {saveStatus && <span className="hidden sm:inline text-xs text-green-400">{saveStatus}</span>}
          <button
            onClick={handleSaveProject}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Save
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-purple-600 text-white text-xs font-semibold transition hover:opacity-90 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* ===== Main Content Area ===== */}
      {mode === 'edit' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Tools Panel */}
          <div className="w-16 md:w-20 bg-[#12121a] border-r border-white/5 flex flex-col items-center py-3 gap-1 flex-shrink-0">
            {capcutTools.map(tool => {
              const Icon = tool.icon
              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    setActiveTool(tool.id)
                    if (tool.id === 'text' && textOverlays.length === 0) addTextOverlay()
                  }}
                  className={`w-full flex flex-col items-center gap-1 py-2 transition ${activeTool === tool.id ? 'text-brand-400' : 'text-slate-500 hover:text-white'}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[9px] font-medium">{tool.label}</span>
                </button>
              )
            })}
          </div>

          {/* Center Preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Preview Window */}
            <div className="flex-1 flex items-center justify-center bg-black/40 p-4 min-h-0">
              <div className="relative aspect-[9/16] max-h-full rounded-lg overflow-hidden shadow-2xl" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                <img
                  src={reel.thumbnail}
                  alt={reel.title}
                  className={`h-full w-full object-cover ${selectedEffect === 'Zoom In' ? 'scale-110' : selectedEffect === 'Zoom Out' ? 'scale-95' : selectedEffect === 'Blur Transition' ? 'blur-[1px]' : ''}`}
                  style={currentFilter?.style}
                />
                {selectedEffect === 'Glitch' && <div className="absolute inset-0 bg-cyan-400/10 mix-blend-screen translate-x-1 pointer-events-none" />}
                {selectedEffect === 'Flash' && <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />}
                {selectedEffect === 'Shake' && <div className="absolute inset-0 border-4 border-red-400/20 animate-pulse pointer-events-none" />}
                {/* Text Overlays */}
                {textOverlays.map(t => {
                  const isVisible = playhead >= t.startTime && playhead <= t.endTime
                  if (!isVisible) return null
                  return (
                    <div
                      key={t.id}
                      className={`absolute left-0 right-0 px-4 text-center ${t.position === 'top' ? 'top-4' : t.position === 'center' ? 'top-1/2 -translate-y-1/2' : 'bottom-16'}`}
                      style={{ fontSize: `${t.fontSize}px`, color: t.color, background: t.bgColor, padding: '8px' }}
                    >
                      {t.content}
                    </div>
                  )
                })}
                {/* Sticker Overlays */}
                {stickers.map(s => {
                  const isVisible = playhead >= s.startTime && playhead <= s.endTime
                  if (!isVisible) return null
                  return (
                    <button
                      key={s.id}
                      onClick={() => removeSticker(s.id)}
                      className={`absolute text-4xl drop-shadow-lg ${s.position === 'top' ? 'top-16 left-1/2 -translate-x-1/2' : s.position === 'bottom' ? 'bottom-28 left-1/2 -translate-x-1/2' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}`}
                      title="Click to remove sticker"
                    >
                      {s.emoji}
                    </button>
                  )
                })}
                {/* Platform Badge */}
                <span className={`platform-badge platform-${reel.platform} absolute top-2 left-2`}>
                  {reel.platform}
                </span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-4 py-2 bg-[#12121a] border-t border-white/5">
              <span className="text-xs text-slate-400 font-mono">{formatTime(playhead)}</span>
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-brand-600 hover:bg-brand-700 flex items-center justify-center transition"
              >
                {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" fill="white" />}
              </button>
              <span className="text-xs text-slate-400 font-mono">{formatTime(trimEnd)}</span>
            </div>

            {/* Timeline */}
            <div className="bg-[#0e0e14] border-t border-white/5 p-3">
              {/* Time ruler */}
              <div className="flex justify-between text-[9px] text-slate-600 mb-1 px-1">
                {[0, 25, 50, 75, 100].map(p => <span key={p}>{formatTime(p)}</span>)}
              </div>
              {/* Tracks */}
              <div ref={timelineRef} className="relative cursor-pointer" onClick={handleTimelineClick}>
                {/* Video Track */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] text-slate-500 w-10 text-right">Video</span>
                  <div className="flex-1 h-10 bg-white/5 rounded relative overflow-hidden">
                    {/* Clip */}
                    <div
                      className="absolute inset-y-0 rounded overflow-hidden"
                      style={{ left: `${trimStart}%`, width: `${trimEnd - trimStart}%` }}
                    >
                      <img src={reel.thumbnail} alt="" className="w-full h-full object-cover opacity-80" />
                      {/* Trim handles */}
                      <div
                        className="absolute left-0 inset-y-0 w-2 bg-brand-500 cursor-w-resize"
                        onClick={(e) => {
                          e.stopPropagation()
                          const onMove = (ev) => {
                            const rect = timelineRef.current.getBoundingClientRect()
                            const pct = Math.max(0, Math.min(trimEnd - 5, ((ev.clientX - rect.left) / rect.width) * 100))
                            setTrimStart(pct)
                          }
                          window.addEventListener('mousemove', onMove)
                          window.addEventListener('mouseup', () => window.removeEventListener('mousemove', onMove), { once: true })
                        }}
                      />
                      <div
                        className="absolute right-0 inset-y-0 w-2 bg-brand-500 cursor-e-resize"
                        onClick={(e) => {
                          e.stopPropagation()
                          const onMove = (ev) => {
                            const rect = timelineRef.current.getBoundingClientRect()
                            const pct = Math.min(100, Math.max(trimStart + 5, ((ev.clientX - rect.left) / rect.width) * 100))
                            setTrimEnd(pct)
                          }
                          window.addEventListener('mousemove', onMove)
                          window.addEventListener('mouseup', () => window.removeEventListener('mousemove', onMove), { once: true })
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Audio Track */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] text-slate-500 w-10 text-right">Audio</span>
                  <div className="flex-1 h-6 bg-white/5 rounded flex items-center px-2 gap-1">
                    {selectedMusic ? (
                      <>
                        <Music2 className="w-3 h-3 text-green-400" />
                        <span className="text-[10px] text-slate-300">{musicTracks.find(t => t.id === selectedMusic)?.name}</span>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-600">No audio selected</span>
                    )}
                  </div>
                </div>

                {/* Text Track */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] text-slate-500 w-10 text-right">Text</span>
                  <div className="flex-1 h-6 bg-white/5 rounded relative">
                    {textOverlays.map(t => (
                      <div
                        key={t.id}
                        className="absolute inset-y-0 bg-amber-500/30 border border-amber-500/40 rounded flex items-center px-2"
                        style={{ left: `${t.startTime}%`, width: `${t.endTime - t.startTime}%` }}
                      >
                        <Type className="w-2.5 h-2.5 text-amber-300 mr-1" />
                        <span className="text-[9px] text-amber-200 truncate">{t.content}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Filter Track */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-500 w-10 text-right">Filter</span>
                  <div className="flex-1 h-6 bg-white/5 rounded flex items-center px-2">
                    <span className="text-[10px] text-slate-400">{currentFilter?.name || 'Original'}</span>
                  </div>
                </div>

                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none"
                  style={{ left: `calc(${playhead}% + 2.5rem)`, height: '100%' }}
                >
                  <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Properties Panel */}
          <div className="w-64 bg-[#12121a] border-l border-white/5 overflow-y-auto flex-shrink-0">
            {activeTool === 'trim' && (
              <div className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white mb-2">Trim Video</h3>
                <div>
                  <label className="text-xs text-slate-400">Start: {formatTime(trimStart)}</label>
                  <input type="range" min="0" max="100" value={trimStart} onMouseDown={captureState} onChange={e => setTrimStart(Math.min(parseInt(e.target.value), trimEnd - 5))} className="w-full accent-brand-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-400">End: {formatTime(trimEnd)}</label>
                  <input type="range" min="0" max="100" value={trimEnd} onMouseDown={captureState} onChange={e => setTrimEnd(Math.max(parseInt(e.target.value), trimStart + 5))} className="w-full accent-brand-500" />
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[0, 25, 50, 75].map(p => (
                    <button key={p} onClick={() => { captureState(); setTrimStart(p); setTrimEnd(p + 25) }} className="py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-slate-400">
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTool === 'text' && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Text Overlays</h3>
                  <button onClick={addTextOverlay} className="w-6 h-6 rounded bg-brand-600 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
                {textOverlays.length === 0 ? (
                  <p className="text-xs text-slate-500">Click + to add text overlay</p>
                ) : (
                  textOverlays.map(t => (
                    <div key={t.id} className="bg-white/5 rounded-lg p-2 space-y-2">
                      <input
                        type="text"
                        value={t.content}
                        onChange={e => updateTextOverlay(t.id, { content: e.target.value })}
                        className="w-full px-2 py-1 rounded bg-black/30 text-xs text-white border border-white/10"
                      />
                      <div className="flex gap-1">
                        {['top', 'center', 'bottom'].map(pos => (
                          <button key={pos} onClick={() => updateTextOverlay(t.id, { position: pos })} className={`flex-1 py-1 rounded text-[10px] ${t.position === pos ? 'bg-brand-600 text-white' : 'bg-white/5 text-slate-400'}`}>
                            {pos}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="range" min="12" max="48" value={t.fontSize} onChange={e => updateTextOverlay(t.id, { fontSize: parseInt(e.target.value) })} className="flex-1 accent-brand-500" />
                        <input type="color" value={t.color} onChange={e => updateTextOverlay(t.id, { color: e.target.value })} className="w-6 h-6 rounded cursor-pointer" />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500">Start:</span>
                        <input type="range" min="0" max="100" value={t.startTime} onChange={e => updateTextOverlay(t.id, { startTime: parseInt(e.target.value) })} className="flex-1 accent-amber-500" />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500">End:</span>
                        <input type="range" min="0" max="100" value={t.endTime} onChange={e => updateTextOverlay(t.id, { endTime: parseInt(e.target.value) })} className="flex-1 accent-amber-500" />
                      </div>
                      <button onClick={() => removeTextOverlay(t.id)} className="w-full py-1 rounded bg-red-500/10 text-red-400 text-[10px] flex items-center justify-center gap-1">
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTool === 'audio' && (
              <div className="p-4 space-y-2">
                <h3 className="text-sm font-semibold text-white mb-2">Music Library</h3>
                <div className="flex items-center gap-2 mb-3">
                  <Volume2 className="w-4 h-4 text-slate-400" />
                  <input type="range" min="0" max="100" value={volume} onChange={e => setVolume(parseInt(e.target.value))} className="flex-1 accent-brand-500" />
                  <span className="text-xs text-slate-400 w-8">{volume}%</span>
                </div>
                {musicTracks.map(track => (
                  <button
                    key={track.id}
                    onClick={() => { captureState(); setSelectedMusic(track.id) }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition ${selectedMusic === track.id ? 'bg-brand-600/20 border border-brand-500/40 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                  >
                    <div>
                      <span className="font-medium">{track.name}</span>
                      <span className="block text-[10px] text-slate-500">{track.bpm} BPM - {track.mood}</span>
                    </div>
                    {selectedMusic === track.id && <Check className="w-3 h-3 text-green-400" />}
                  </button>
                ))}
              </div>
            )}

            {activeTool === 'filter' && (
              <div className="p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Filters</h3>
                <div className="grid grid-cols-2 gap-2">
                  {filterPresets.map(f => (
                    <button
                      key={f.id}
                      onClick={() => { captureState(); setSelectedFilter(f.id) }}
                      className={`relative rounded-lg overflow-hidden border-2 transition ${selectedFilter === f.id ? 'border-brand-500' : 'border-transparent'}`}
                    >
                      <div className="aspect-square" style={{ ...f.style, backgroundImage: `url(${reel.thumbnail})`, backgroundSize: 'cover' }} />
                      <span className="absolute bottom-0 left-0 right-0 text-[9px] text-white bg-black/60 py-0.5">{f.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTool === 'sticker' && (
              <div className="p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Stickers</h3>
                <div className="grid grid-cols-3 gap-2">
                  {['🔥', '💯', '✨', '🚀', '👀', '⭐', '👍', '❤️', '🎯'].map(s => (
                    <button key={s} onClick={() => addSticker(s)} className="aspect-square rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-2xl">
                      {s}
                    </button>
                  ))}
                </div>
                {stickers.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] text-slate-500">Active stickers</p>
                    {stickers.map(s => (
                      <div key={s.id} className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                        <span className="text-xl">{s.emoji}</span>
                        <select value={s.position} onChange={e => setStickers(stickers.map(item => item.id === s.id ? { ...item, position: e.target.value } : item))} className="flex-1 bg-black/30 text-xs text-white rounded px-2 py-1">
                          <option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option>
                        </select>
                        <button onClick={() => removeSticker(s.id)} className="text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTool === 'effect' && (
              <div className="p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Effects</h3>
                <div className="space-y-2">
                  {['none', 'Zoom In', 'Zoom Out', 'Shake', 'Glitch', 'Flash', 'Blur Transition'].map(e => (
                    <button key={e} onClick={() => { captureState(); setSelectedEffect(e) }} className={`w-full px-3 py-2 rounded-lg text-xs transition text-left ${selectedEffect === e ? 'bg-brand-600/20 border border-brand-500/40 text-white' : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'}`}>
                      {e === 'none' ? 'No Effect' : e}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Apply Button */}
            <div className="p-4 sticky bottom-0 bg-[#12121a] border-t border-white/5">
              <button
                onClick={handleApplyEdits}
                disabled={editing}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-brand-600 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {editing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {editing ? 'Processing...' : 'Apply Edits'}
              </button>
              {editResult && (
                <p className={`text-[10px] mt-2 text-center ${editResult.success ? 'text-green-400' : 'text-amber-400'}`}>
                  {editResult.success ? 'Edits applied!' : editResult.message || 'Edits saved locally'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generate Mode */}
      {mode === 'generate' && (
        <GenerateMode reel={reel} brandInfo={brandInfo} onClose={onClose} />
      )}

      {/* Remix Mode */}
      {mode === 'remix' && (
        <RemixMode brandInfo={brandInfo} reel={reel} onSavePlan={handleSaveProject} />
      )}

      {/* Export Modal */}
      {showExport && (
        <ExportModal reel={reel} onClose={() => setShowExport(false)} edits={currentEdits()} onSavedExport={async (lastExport) => {
          const saved = await saveProject({
            id: sourceProject?.id,
            title: reel.title,
            thumbnail: reel.thumbnail,
            platform: reel.platform,
            sourceVideo: reel,
            savedAt: Date.now(),
            edits: currentEdits(),
            lastExport
          })
          onReelChange?.(saved)
        }} />
      )}
    </div>
  )
}

// ===== Generate Mode =====
function GenerateMode({ reel, brandInfo }) {
  const [generating, setGenerating] = useState(false)
  const [concept, setConcept] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    const result = await generateReelConcept({
      trendingVideo: reel,
      businessType: brandInfo.businessType,
      brandName: brandInfo.brandName,
      industry: brandInfo.industry
    })
    setConcept(result)
    setGenerating(false)
  }

  const copyScript = () => {
    if (!concept) return
    navigator.clipboard.writeText(`${concept.title}\n\n${concept.script}\n\n${concept.hashtags}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatViews = (n) => n >= 1000000 ? (n/1000000).toFixed(1)+'M' : (n/1000).toFixed(0)+'K'

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
      {/* Source Info */}
      <div className="glass rounded-xl p-4 flex gap-4 mb-4">
        <img src={reel.thumbnail} alt="" className="w-20 h-32 rounded-lg object-cover" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`platform-badge platform-${reel.platform}`}>{reel.platform}</span>
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400">{formatViews(reel.views)} views</span>
          </div>
          <p className="text-sm font-medium text-white mt-2">{reel.title}</p>
          <p className="text-xs text-slate-400">{reel.creator}</p>
          {reel.location && <p className="text-xs text-slate-500 mt-1">📍 {reel.location}</p>}
        </div>
      </div>

      {!concept && (
        <button
          onClick={handleGenerate}
          disabled={generating || !brandInfo.brandName}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 text-white font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {generating ? 'AI analyzing...' : !brandInfo.brandName ? 'Set brand info first' : 'Generate AI Reel Concept'}
        </button>
      )}

      {concept && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass rounded-xl p-4 flex items-center gap-4">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                <circle cx="32" cy="32" r="28" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray={`${concept.viralityScore * 1.76} 176`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center"><span className="text-lg font-bold text-white">{concept.viralityScore}</span></div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Virality Score</p>
              <p className="text-xs text-slate-400">{concept.inspiration}</p>
            </div>
          </div>

          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-amber-400" /><h3 className="text-xs uppercase tracking-wider text-slate-400">Hook</h3></div>
            <p className="text-lg font-bold text-white">{concept.title}</p>
          </div>

          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs uppercase tracking-wider text-slate-400">Script</h3>
              <button onClick={copyScript} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}{copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="text-sm text-slate-200 whitespace-pre-wrap font-sans">{concept.script}</pre>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-xl p-4"><h3 className="text-xs text-slate-400 mb-1">Structure</h3><p className="text-sm text-white">{concept.structure}</p></div>
            <div className="glass rounded-xl p-4"><h3 className="text-xs text-slate-400 mb-1">Duration</h3><p className="text-sm text-white">{concept.duration}</p></div>
          </div>

          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><Hash className="w-4 h-4 text-brand-400" /><h3 className="text-xs uppercase tracking-wider text-slate-400">Hashtags</h3></div>
            <div className="flex flex-wrap gap-2">{concept.hashtags.split(' ').map(tag => <span key={tag} className="px-2 py-1 rounded bg-brand-500/10 text-brand-300 text-xs">{tag}</span>)}</div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleGenerate} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium flex items-center justify-center gap-2"><Wand2 className="w-4 h-4" /> Regenerate</button>
            <button onClick={copyScript} className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold flex items-center justify-center gap-2">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied!' : 'Copy Script'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== Remix Mode =====
function RemixMode({ brandInfo, reel, onSavePlan }) {
  const [uploaded, setUploaded] = useState([])
  const [remixing, setRemixing] = useState(false)
  const [result, setResult] = useState(null)
  const [duration, setDuration] = useState('15 seconds')
  const [style, setStyle] = useState('Match trending pattern')

  const handleUpload = (e) => {
    setUploaded(Array.from(e.target.files).map(f => ({ name: f.name, size: (f.size / 1024 / 1024).toFixed(1) + 'MB', type: f.type })))
  }

  const handleRemix = async () => {
    setRemixing(true)
    const remix = await createRemixPlan({
      reel,
      brandInfo,
      files: uploaded,
      preferences: { duration, style }
    })
    setResult(remix)
    setRemixing(false)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
      <div className="glass rounded-2xl p-8 border-2 border-dashed border-brand-500/20 hover:border-brand-500/40 transition text-center">
        <div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
          <Upload className="w-8 h-8 text-brand-400" />
        </div>
        <p className="text-white font-semibold mb-1">Upload Your Footage</p>
        <p className="text-xs text-slate-400 mb-4">Upload raw videos — AI will remix them into a viral reel matching trending patterns</p>
        <label className="inline-block px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition cursor-pointer">
          Choose Files
          <input type="file" accept="video/*" multiple className="hidden" onChange={handleUpload} />
        </label>
        {uploaded.length > 0 && (
          <div className="mt-4 space-y-1">
            {uploaded.map((f, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/5 text-xs">
                <span className="text-slate-300">{f.name}</span><span className="text-slate-500">{f.size}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {uploaded.length > 0 && !result && (
        <>
          <div className="glass rounded-xl p-4 mt-4">
            <h3 className="text-sm font-semibold text-white mb-3">Remix Preferences</h3>
            <div className="grid grid-cols-2 gap-3">
              <select value={duration} onChange={e => setDuration(e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-brand-500/10 text-sm text-white"><option className="bg-slate-800">15 seconds</option><option className="bg-slate-800">30 seconds</option><option className="bg-slate-800">60 seconds</option></select>
              <select value={style} onChange={e => setStyle(e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-brand-500/10 text-sm text-white"><option className="bg-slate-800">Match trending pattern</option><option className="bg-slate-800">High-energy</option><option className="bg-slate-800">Cinematic</option><option className="bg-slate-800">ASMR</option></select>
            </div>
          </div>
          <button onClick={handleRemix} disabled={remixing} className="w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 text-white font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50">
            {remixing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Film className="w-5 h-5" />}
            {remixing ? 'AI remixing...' : 'Start AI Remix'}
          </button>
        </>
      )}

      {result && (
        <div className="space-y-4 animate-fade-in mt-4">
          <div className="glass rounded-xl p-4 border-green-500/20">
            <div className="flex items-center gap-2 text-green-400 mb-3"><Check className="w-5 h-5" /><span className="font-semibold">{result.message}</span></div>
            <div className="space-y-2">
              <h4 className="text-xs uppercase text-slate-400">Scene Plan</h4>
              {result.plan.scenes.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-200"><Film className="w-3 h-3 text-brand-400 mt-0.5 flex-shrink-0" />{s}</div>
              ))}
              <h4 className="text-xs uppercase text-slate-400 mt-3">AI Features</h4>
              <div className="flex flex-wrap gap-2">{result.plan.features.map((f, i) => <span key={i} className="px-2 py-1 rounded bg-green-500/10 text-green-400 text-[10px]">{f}</span>)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onSavePlan?.()} className="py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold">Save Remix Project</button>
            <button onClick={() => { setResult(null); setUploaded([]) }} className="py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium">Start New Remix</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== Export Modal =====
function ExportModal({ reel, onClose, edits, onSavedExport }) {
  const [selectedPlatforms, setSelectedPlatforms] = useState(['youtube', 'instagram', 'tiktok'])
  const [exporting, setExporting] = useState(false)
  const [done, setDone] = useState(false)
  const [exportResult, setExportResult] = useState(null)

  const platforms = [
    { id: 'youtube', name: 'YouTube Shorts', res: '1080x1920' },
    { id: 'instagram', name: 'Instagram Reels', res: '1080x1920' },
    { id: 'tiktok', name: 'TikTok', res: '1080x1920' },
  ]

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  const handleExport = async () => {
    setExporting(true)
    const result = await exportReel({ videoId: reel.id, platforms: selectedPlatforms, editConfig: edits })
    setExportResult(result)
    await onSavedExport?.(result)
    setExporting(false)
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <div className="glass rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        {done ? (
          <div className="text-center">
            <Check className="w-16 h-16 text-green-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Export Complete!</h3>
            <p className="text-sm text-slate-400 mb-4">Your reel has been processed for {selectedPlatforms.length} platform(s)</p>
            {(exportResult?.exports || selectedPlatforms.map(p => ({ platform: p, status: 'planned' }))).map(item => (
              <div key={item.platform} className="flex items-center justify-between p-2 rounded-lg bg-white/5 mb-1">
                <span className="text-sm text-white capitalize">{item.platform}</span>
                {item.downloadUrl ? (
                  <a href={item.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"><Download className="w-3 h-3" /> Download</a>
                ) : (
                  <span className="text-xs text-amber-400">{item.status || 'planned'}</span>
                )}
              </div>
            ))}
            <button onClick={onClose} className="w-full mt-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold">Done</button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-white mb-4">Export Reel</h3>
            <p className="text-xs text-slate-400 mb-4">Select target platforms (9:16 vertical format)</p>
            <div className="space-y-2 mb-4">
              {platforms.map(p => (
                <label key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10">
                  <input type="checkbox" checked={selectedPlatforms.includes(p.id)} onChange={() => togglePlatform(p.id)} className="accent-brand-500 w-4 h-4" />
                  <div>
                    <p className="text-sm text-white">{p.name}</p>
                    <p className="text-[10px] text-slate-500">{p.res}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="text-xs text-slate-500 mb-4 space-y-1">
              <p>Trim: {edits.trimStart}% - {edits.trimEnd}%</p>
              <p>Text overlays: {edits.textOverlays.length}</p>
              <p>Music: {edits.selectedMusic ? 'Selected' : 'None'}</p>
              <p>Filter: {edits.selectedFilter}</p>
              <p>Stickers: {edits.stickers?.length || 0}</p>
              <p>Effect: {edits.selectedEffect || 'none'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium">Cancel</button>
              <button onClick={handleExport} disabled={exporting || selectedPlatforms.length === 0} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-brand-600 to-purple-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {exporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
