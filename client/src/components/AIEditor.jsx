import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Scissors, Sparkles, Film, X, Play, Pause, Type, Music2,
  Palette, Crop, Zap, TrendingUp, Copy, Check, Loader2,
  Hash, Upload, Download, Undo2, Redo2, Plus, Trash2,
  Volume2, Sliders, Sticker, Wand2, ArrowLeft, ArrowRight,
  Clock, Save
} from 'lucide-react'
import { generateReelConcept, submitVideoEdit, saveProject, exportReel, createRemixPlan } from '../services/api'
import { isReferenceReel, referenceParts, buildReferenceClips, buildPartAsset, partUploadClips, validatePartFile, assemblyPlan } from '../data/referenceReel'
import { readReferenceDraft, writeReferenceDraft, deleteReferenceDraft, readVideoDuration } from '../services/referenceDrafts'
import ClipVideo from './ClipVideo'
import PartUploadPanel from './PartUploadPanel'
import { assembleAndExportVideo } from '../utils/videoStitcher'

const editorModes = [
  { id: 'edit', label: 'Edit', icon: Scissors },
  { id: 'generate', label: 'AI Concept', icon: Sparkles },
  { id: 'remix', label: 'Remix', icon: Film }
]

const capcutTools = [
  { id: 'guidance', label: 'Guidance', icon: Film },
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

const parseDurationToSeconds = (duration) => {
  if (typeof duration === 'number' && Number.isFinite(duration)) return duration
  if (typeof duration === 'string') {
    if (duration.includes(':')) {
      const parts = duration.split(':').map(Number)
      if (parts.length === 2 && parts.every(Number.isFinite)) {
        return parts[0] * 60 + parts[1]
      }
    }
    const numericDuration = Number(duration)
    if (Number.isFinite(numericDuration)) return numericDuration
  }
  return 30
}

const formatSeconds = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0))
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const splitDurationIntoClips = (totalSeconds) => {
  const safeTotal = Math.max(1, Math.round(totalSeconds || 10))
  const clips = []
  let remaining = safeTotal

  while (remaining > 4) {
    clips.push(3)
    remaining -= 3
  }

  clips.push(remaining)
  return clips
}

const clipBeatBlueprints = [
  {
    id: 'hook',
    name: 'Hook',
    originalLabel: 'Hook Reference',
    uploadLabel: 'Hook Clip',
    goal: 'stop the scroll immediately',
    originalAnalysis: 'The first beat should prove why the reference short catches attention in the first seconds.',
    uploadAnalysis: 'Open with the cleanest visual moment from the upload so viewers instantly understand the subject.',
    originalCamera: 'Start with a bold frame, then pan gently from left to right to reveal the main action.',
    uploadCamera: 'Start tight on the hero subject, then add a short push-in or slight lateral move.',
    originalNeed: 'Strong first frame, clean lighting, product or hero action ready before the cut starts',
    uploadNeed: 'Best hero shot from the upload, stable framing, clear focal point, bright key light',
    overlay: 'Short punchy hook or bold statement in 3-5 words',
    peopleNeeded: 1,
  },
  {
    id: 'problem',
    name: 'Problem',
    originalLabel: 'Problem Reference',
    uploadLabel: 'Problem Clip',
    goal: 'show the pain point or before-state',
    originalAnalysis: 'This beat explains the pain point, tension, or setup that makes the payoff meaningful.',
    uploadAnalysis: 'Use the uploaded clip to show the issue, obstacle, or before-state with simple readable action.',
    originalCamera: 'Hold the frame long enough to read the problem, then finish with a subtle tilt or slide.',
    uploadCamera: 'Keep the camera mostly locked, then reframe slightly to emphasize the problem area.',
    originalNeed: 'Mess, pain point, context props, readable facial expression or before-state',
    uploadNeed: 'Visible before-state, clear environment detail, action that shows what is wrong',
    overlay: 'Name the problem in one sentence',
    peopleNeeded: 1,
  },
  {
    id: 'showcase',
    name: 'Showcase',
    originalLabel: 'Feature Reference',
    uploadLabel: 'Feature Clip',
    goal: 'demonstrate the key action or highlight clearly',
    originalAnalysis: 'This section works as the core showcase moment where the audience sees the process or transformation.',
    uploadAnalysis: 'Use this uploaded clip to demonstrate the key action, product usage, or hands-on movement.',
    originalCamera: 'Follow the hands or subject smoothly and keep the action centered throughout the move.',
    uploadCamera: 'Track the action smoothly from left to right and let the motion finish inside frame.',
    originalNeed: 'Demonstration props, stable movement, enough light to show product details',
    uploadNeed: 'Hands-on action, product in focus, stable motion, uncluttered background',
    overlay: 'Quick how-to or feature callout',
    peopleNeeded: 1,
  },
  {
    id: 'proof',
    name: 'Proof',
    originalLabel: 'Proof Reference',
    uploadLabel: 'Proof Clip',
    goal: 'deliver evidence, payoff, or social proof',
    originalAnalysis: 'The reference uses this beat to prove the result with reaction, transformation, or payoff.',
    uploadAnalysis: 'Use the uploaded clip to show proof of results, transformation, or customer confidence.',
    originalCamera: 'Hold on the result, then add a slow reveal or slight push for emphasis.',
    uploadCamera: 'Land on the finished result and keep the frame steady so the payoff reads clearly.',
    originalNeed: 'After-state, testimonial cue, reaction shot, result-oriented framing',
    uploadNeed: 'Visible result, reaction, transformation, or supporting proof detail',
    overlay: 'Proof point, metric, or transformation caption',
    peopleNeeded: 1,
  },
  {
    id: 'cta',
    name: 'CTA',
    originalLabel: 'CTA Reference',
    uploadLabel: 'CTA Clip',
    goal: 'end with a strong call to action',
    originalAnalysis: 'This final beat wraps the short with a clear next step or memorable closing frame.',
    uploadAnalysis: 'End with the cleanest brand or product frame so the CTA feels intentional and easy to act on.',
    originalCamera: 'Center the hero subject and finish with a stable hold for the CTA text.',
    uploadCamera: 'Lock the frame, leave clean space for text, and keep the subject centered for the final hold.',
    originalNeed: 'Logo/product hero frame, clean background, room for CTA text',
    uploadNeed: 'Brand-safe ending frame, product hero, logo or face visible, clean negative space',
    overlay: 'CTA, offer, or handle',
    peopleNeeded: 1,
  },
]

const inferClipSubject = ({ reel, fileName }) => {
  const raw = fileName || reel?.industry || reel?.category || reel?.title || 'product'
  return raw
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const getBeatBlueprint = (index, totalClips) => {
  if (totalClips <= 1) return clipBeatBlueprints[0]
  if (totalClips === 2) return [clipBeatBlueprints[0], clipBeatBlueprints[4]][index] || clipBeatBlueprints[4]
  if (totalClips === 3) return [clipBeatBlueprints[0], clipBeatBlueprints[2], clipBeatBlueprints[4]][index] || clipBeatBlueprints[4]
  if (totalClips === 4) return [clipBeatBlueprints[0], clipBeatBlueprints[1], clipBeatBlueprints[2], clipBeatBlueprints[4]][index] || clipBeatBlueprints[4]
  return clipBeatBlueprints[index] || clipBeatBlueprints[clipBeatBlueprints.length - 1]
}

const inferPeopleNeeded = ({ source, fileName, reel, beat }) => {
  const combined = `${fileName || ''} ${reel?.title || ''} ${reel?.description || ''}`.toLowerCase()
  if (/(team|staff|customer|people|group|family|friends)/.test(combined)) return 2
  if (beat.id === 'proof') return 2
  return source === 'upload' ? 1 : beat.peopleNeeded
}

const createClipGuidance = ({ source, durationSec, reel, fileName, startSec, endSec, clipIndex, totalClips }) => {
  const beat = getBeatBlueprint(clipIndex, totalClips)
  const platformName = reel?.platform === 'youtube' ? 'YouTube Shorts' : reel?.platform || 'the reference reel'
  const subject = inferClipSubject({ reel, fileName })
  const peopleNeeded = inferPeopleNeeded({ source, fileName, reel, beat })
  const label = source === 'original' ? beat.originalLabel : beat.uploadLabel

  return {
    title: `${label} plan`,
    label,
    stage: beat.name,
    analysis: source === 'original'
      ? `AI analysis: this ${durationSec}s reference beat is best used to ${beat.goal}. ${beat.originalAnalysis}`
      : `AI analysis: this ${durationSec}s uploaded beat is best used to ${beat.goal} for ${subject}. ${beat.uploadAnalysis}`,
    description: source === 'original'
      ? `Mirror the pacing of this ${platformName} reference clip and translate it into a ${beat.name.toLowerCase()} beat for your own reel.`
      : `Turn this uploaded clip into the ${beat.name.toLowerCase()} beat for ${subject}. Keep the message readable inside ${durationSec} seconds.`,
    cameraDirection: source === 'original' ? beat.originalCamera : beat.uploadCamera,
    thingsNeeded: source === 'original'
      ? `${beat.originalNeed}, reference product angle, scroll-stopping composition`
      : `${beat.uploadNeed}, ${subject}, good lighting, usable audio or clean b-roll`,
    peopleNeeded,
    notes: `Clip window: ${formatSeconds(startSec)}-${formatSeconds(endSec)}. Suggested overlay: ${beat.overlay}.`,
    overlaySuggestion: beat.overlay,
  }
}

const buildOriginalClips = (reel) => {
  if (isReferenceReel(reel)) return buildReferenceClips(reel)
  const totalSeconds = parseDurationToSeconds(reel?.duration)
  const chunks = splitDurationIntoClips(totalSeconds)
  let cursor = 0

  return chunks.map((durationSec, index) => {
    const startSec = cursor
    const endSec = cursor + durationSec
    cursor = endSec
    const guidance = createClipGuidance({
      source: 'original',
      durationSec,
      reel,
      fileName: reel?.title,
      startSec,
      endSec,
      clipIndex: index,
      totalClips: chunks.length,
    })

    return {
      id: `original-${reel?.id || 'reel'}-clip-${index + 1}`,
      partId: `part-${index + 1}`,
      partNumber: index + 1,
      source: 'original',
      label: guidance.label,
      stage: guidance.stage,
      durationSec,
      startSec,
      endSec,
      startPct: (startSec / totalSeconds) * 100,
      endPct: (endSec / totalSeconds) * 100,
      previewUrl: reel?.thumbnail,
      mediaType: 'image',
      fileName: reel?.title,
      guidance,
    }
  })
}

const buildUploadAssetClips = ({ assetId, durationSec, previewUrl, fileName, fileType, reel }) => {
  const totalSeconds = Math.max(1, Math.round(durationSec || 10))
  const chunks = splitDurationIntoClips(totalSeconds)
  let cursor = 0

  return chunks.map((clipDuration, index) => {
    const startSec = cursor
    const endSec = cursor + clipDuration
    cursor = endSec
    const guidance = createClipGuidance({
      source: 'upload',
      durationSec: clipDuration,
      reel,
      fileName,
      startSec,
      endSec,
      clipIndex: index,
      totalClips: chunks.length,
    })

    const cleanFileName = fileName ? fileName.replace(/\.[a-z0-9]+$/i, '') : 'User Clip'
    const label = chunks.length === 1
      ? cleanFileName
      : `Clip ${index + 1}: ${guidance.stage}`

    return {
      id: `${assetId}-clip-${index + 1}`,
      assetId,
      source: 'upload',
      label,
      durationSec: clipDuration,
      localStartSec: startSec,
      localEndSec: endSec,
      previewUrl,
      mediaType: fileType || 'video/mp4',
      fileName,
      guidance,
    }
  })
}

const flattenUploadedTrackClips = (uploadedAssets) => {
  const totalDuration = Math.max(1, uploadedAssets.reduce((sum, asset) => sum + (asset.durationSec || 0), 0))
  let offsetSeconds = 0

  return uploadedAssets.flatMap(asset => {
    const assetOffset = offsetSeconds
    offsetSeconds += asset.durationSec || 0

    return (asset.clips || []).map(clip => ({
      ...clip,
      assetName: asset.name,
      startSec: assetOffset + clip.localStartSec,
      endSec: assetOffset + clip.localEndSec,
      startPct: ((assetOffset + clip.localStartSec) / totalDuration) * 100,
      endPct: ((assetOffset + clip.localEndSec) / totalDuration) * 100,
      previewUrl: asset.previewUrl,
    }))
  })
}

const getVideoDuration = (file, previewUrl) => new Promise((resolve) => {
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.src = previewUrl || URL.createObjectURL(file)
  video.onloadedmetadata = () => {
    resolve(Math.max(1, Math.round(video.duration || 10)))
  }
  video.onerror = () => resolve(10)
})

export default function AIEditor({ selectedReel, brandInfo, onSaveBrandInfo, onReelChange, onClose }) {
  const sourceProject = selectedReel?.sourceVideo ? selectedReel : null
  const sourceReel = sourceProject?.sourceVideo || selectedReel
  const reel = sourceReel
  const isThreePart = isReferenceReel(reel)
  const initialOriginalClips = sourceProject?.edits?.originalClips || buildOriginalClips(sourceReel)

  const [mode, setMode] = useState('edit')
  const [activeTool, setActiveTool] = useState('guidance')
  const [isPlaying, setIsPlaying] = useState(false)
  const [playhead, setPlayhead] = useState(0)
  const [originalClips, setOriginalClips] = useState(initialOriginalClips)
  const [uploadedAssets, setUploadedAssets] = useState(isThreePart ? [] : sourceProject?.edits?.uploadedAssets || [])
  const [selectedClipId, setSelectedClipId] = useState(sourceProject?.edits?.selectedClipId || initialOriginalClips[0]?.id || null)
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
  const fileInputRef = useRef(null)
  const partInputRef = useRef(null)
  const uploadTarget = useRef(null)
  const ownedUrls = useRef(new Set())
  const mounted = useRef(true)
  const operationBusy = useRef(false)
  const draftStorageId = useRef(sourceProject?.edits?.referenceDraftId || null)
  const projectId = useRef(sourceProject?.id || (isThreePart ? `remake-${crypto.randomUUID()}` : undefined))
  const [uploadBusy, setUploadBusy] = useState(false)
  const [restoring, setRestoring] = useState(Boolean(isThreePart && sourceProject))
  const [saving, setSaving] = useState(false)
  const [clipError, setClipError] = useState('')
  const [sequenceMode, setSequenceMode] = useState(false)
  const [previewVersion, setPreviewVersion] = useState(0)
  const liveState = useRef(null)
  liveState.current = { originalClips, uploadedAssets, selectedClipId, textOverlays, selectedMusic, selectedFilter, stickers, selectedEffect, volume }

  useEffect(() => {
    mounted.current = true
    let cancelled = false
    if (isThreePart && sourceProject) {
      const metadata = sourceProject.edits?.uploadedAssets || []
      const restore = async () => {
        try {
          const files = draftStorageId.current ? await readReferenceDraft(draftStorageId.current) : {}
          if (cancelled) return
          const restored = metadata.filter(asset => files[asset.partId]).map(asset => {
            const previewUrl = URL.createObjectURL(files[asset.partId])
            ownedUrls.current.add(previewUrl)
            return { ...asset, file: files[asset.partId], previewUrl }
          })
          setUploadedAssets(restored)
          if (restored.length < metadata.length) setClipError('Some saved footage is unavailable in this browser. Please upload those parts again.')
        } catch (error) { if (!cancelled) setClipError(error.message) }
        finally { if (!cancelled) setRestoring(false) }
      }
      restore()
    }
    return () => {
      cancelled = true
      mounted.current = false
      for (const url of ownedUrls.current) URL.revokeObjectURL(url)
      ownedUrls.current.clear()
    }
  }, [])

  if (!reel) return null

  const currentFilter = filterPresets.find(f => f.id === selectedFilter)
  const originalDurationSec = Math.max(1, parseDurationToSeconds(reel.duration))

  const reelParts = useMemo(() => {
    return originalClips.map((clip, index) => {
      const partNum = index + 1
      const partId = clip.partId || `part-${partNum}`
      return {
        id: partId,
        number: partNum,
        name: clip.stage || clip.guidance?.stage || `Part ${partNum}`,
        label: clip.label || `Part ${partNum}`,
        duration: clip.durationSec,
        start: clip.startSec,
        end: clip.endSec,
        startPct: clip.startPct,
        endPct: clip.endPct,
        guidance: clip.guidance,
      }
    })
  }, [originalClips])

  const uploadedTrackClips = useMemo(() => {
    return reelParts.map(part => {
      const asset = uploadedAssets.find(a => a.partId === part.id)
      if (!asset) return null
      const trimStart = asset.trimStart || 0
      return {
        id: `upload-${part.id}`,
        partId: part.id,
        partNumber: part.number,
        source: 'upload',
        label: `Part ${part.number} · ${part.name}`,
        stage: part.name,
        fileName: asset.name,
        assetName: asset.name,
        durationSec: part.duration,
        sourceDurationSec: asset.sourceDurationSec || part.duration,
        localStartSec: trimStart,
        localEndSec: trimStart + part.duration,
        startSec: part.start,
        endSec: part.end,
        startPct: part.startPct,
        endPct: part.endPct,
        previewUrl: asset.previewUrl,
        file: asset.file,
        guidance: part.guidance,
      }
    }).filter(Boolean)
  }, [reelParts, uploadedAssets])

  const allClips = [...originalClips, ...uploadedTrackClips]
  const selectedClip = allClips.find(clip => clip.id === selectedClipId) || (uploadedTrackClips.length > 0 ? uploadedTrackClips[0] : originalClips[0]) || null
  const selectedPart = reelParts.find(p => p.id === selectedClip?.partId || p.number === selectedClip?.partNumber) || reelParts[0] || null
  const selectedAsset = uploadedAssets.find(asset => asset.partId === selectedPart?.id) || null
  const readyParts = uploadedTrackClips.length
  const activeTimelineDuration = originalDurationSec
  const previewUrl = selectedClip?.source === 'upload' ? selectedClip.previewUrl : reel.videoUrl
  const previewStart = selectedClip?.localStartSec ?? selectedClip?.startSec ?? 0
  const previewEnd = selectedClip?.localEndSec ?? selectedClip?.endSec
  const effectClass = selectedEffect === 'Zoom In'
    ? 'scale-110'
    : selectedEffect === 'Zoom Out'
      ? 'scale-95'
      : selectedEffect === 'Blur Transition'
        ? 'blur-[1px]'
        : ''

  useEffect(() => {
    if (!selectedClipId) {
      if (uploadedTrackClips.length > 0) {
        setSelectedClipId(uploadedTrackClips[0].id)
        setPlayhead(0)
      } else if (originalClips[0]) {
        setSelectedClipId(originalClips[0].id)
        setPlayhead(originalClips[0].startPct)
      }
    }
  }, [selectedClipId, originalClips, uploadedTrackClips.length])

  useEffect(() => {
    if (!restoring && selectedClipId && allClips.length > 0 && !allClips.some(clip => clip.id === selectedClipId)) {
      setSelectedClipId(uploadedTrackClips[0]?.id || originalClips[0]?.id || null)
    }
  }, [allClips.length])

  useEffect(() => {
    if (!isPlaying || !selectedClip || previewUrl) return undefined

    const clipStart = selectedClip.startPct ?? 0
    const clipEnd = selectedClip.endPct ?? 100
    const interval = setInterval(() => {
      setPlayhead(prev => {
        const next = prev + 0.6
        return next >= clipEnd ? clipStart : next
      })
    }, 80)

    return () => clearInterval(interval)
  }, [isPlaying, selectedClip?.id, selectedClip?.startPct, selectedClip?.endPct])

  const handlePreviewProgress = time => {
    if (!Number.isFinite(time) || !selectedClip) return
    const offset = Math.max(0, time - previewStart)
    setPlayhead(Math.min(selectedClip.endPct, selectedClip.startPct + offset / activeTimelineDuration * 100))
  }

  const handlePreviewEnd = () => {
    if (sequenceMode) {
      const currentPartNum = selectedClip?.partNumber || (selectedPart?.number ?? 1)
      const nextPart = reelParts.find(p => p.number === currentPartNum + 1)
      if (nextPart) {
        const nextClip = uploadedTrackClips.find(clip => clip.partId === nextPart.id) || originalClips.find(clip => clip.partId === nextPart.id)
        if (nextClip) {
          setSelectedClipId(nextClip.id)
          setPlayhead(nextClip.startPct)
          setIsPlaying(true)
          return
        }
      }
    }
    setIsPlaying(false)
    setSequenceMode(false)
  }

  const previewSequence = () => {
    setPreviewVersion(version => version + 1)
    const firstPart = reelParts[0]
    const firstClip = uploadedTrackClips.find(c => c.partId === firstPart?.id) || originalClips[0]
    if (firstClip) {
      setSelectedClipId(firstClip.id)
      setPlayhead(firstClip.startPct || 0)
    }
    setSequenceMode(true)
    setIsPlaying(true)
  }

  const captureState = () => {
    setHistory(prev => [
      ...prev.slice(-19),
      { ...liveState.current }
    ])
    setFuture([])
  }

  const restoreState = (state) => {
    setIsPlaying(false)
    setSequenceMode(false)
    setPreviewVersion(version => version + 1)
    setOriginalClips(state.originalClips || buildOriginalClips(reel))
    setUploadedAssets(state.uploadedAssets || [])
    setSelectedClipId(state.selectedClipId || state.originalClips?.[0]?.id || buildOriginalClips(reel)[0]?.id || null)
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
    setFuture(prev => [{
      originalClips,
      uploadedAssets,
      selectedClipId,
      textOverlays,
      selectedMusic,
      selectedFilter,
      stickers,
      selectedEffect,
      volume,
    }, ...prev])
    setHistory(prev => prev.slice(0, -1))
    restoreState(previous)
  }

  const handleRedo = () => {
    if (future.length === 0) return
    const next = future[0]
    setHistory(prev => [...prev, {
      originalClips,
      uploadedAssets,
      selectedClipId,
      textOverlays,
      selectedMusic,
      selectedFilter,
      stickers,
      selectedEffect,
      volume,
    }])
    setFuture(prev => prev.slice(1))
    restoreState(next)
  }

  const togglePlay = () => {
    if (!selectedClip) return
    setIsPlaying(prev => !prev)
  }

  const handleClipSelect = (clip) => {
    setSequenceMode(false)
    setClipError('')
    setSelectedClipId(clip.id)
    setActiveTool('guidance')
    setPlayhead(clip.startPct ?? 0)
    setIsPlaying(false)
  }

  const choosePartUpload = (part = selectedPart) => {
    if (!part || uploadBusy || restoring || saving) return
    uploadTarget.current = part
    partInputRef.current?.click()
  }

  const uploadPart = async (file, part) => {
    if (!file || !part || operationBusy.current || restoring || saving) return
    if (!file.type?.startsWith('video/') && !/\.(mp4|mov|webm|m4v)$/i.test(file.name || '')) {
      setClipError('Please choose a valid video file (MP4, MOV, or WebM).')
      return
    }
    operationBusy.current = true
    setUploadBusy(true)
    setClipError('')
    const url = URL.createObjectURL(file)
    ownedUrls.current.add(url)
    try {
      const duration = await getVideoDuration(file, url)
      if (!mounted.current) return
      captureState()
      const newAsset = {
        id: `upload-${part.id}-${Date.now()}`,
        partId: part.id,
        partNumber: part.number,
        name: file.name,
        file,
        previewUrl: url,
        durationSec: part.duration,
        sourceDurationSec: duration,
        trimStart: 0,
        clips: [{
          id: `upload-${part.id}`,
          partId: part.id,
          partNumber: part.number,
          source: 'upload',
          label: `Part ${part.number} · ${part.name}`,
          durationSec: part.duration,
          localStartSec: 0,
          localEndSec: part.duration,
          mediaType: file.type || 'video/mp4',
          fileName: file.name,
          guidance: part.guidance
        }]
      }
      const nextAssets = [
        ...liveState.current.uploadedAssets.filter(item => item.partId !== part.id),
        newAsset
      ]
      setUploadedAssets(nextAssets)
      setSelectedClipId(`upload-${part.id}`)
      setPlayhead(part.startPct)
      setIsPlaying(false)
      setSaveStatus(`Part ${part.number} clip imported`)
    } catch (error) {
      URL.revokeObjectURL(url)
      ownedUrls.current.delete(url)
      if (mounted.current) setClipError(error.message)
    } finally {
      operationBusy.current = false
      if (mounted.current) setUploadBusy(false)
    }
  }

  const trimSelectedPart = (value) => {
    if (!selectedAsset || !selectedPart) return
    const maxTrim = Math.max(0, (selectedAsset.sourceDurationSec || selectedPart.duration) - selectedPart.duration)
    const trimStart = Math.min(Math.max(0, Number(value)), maxTrim)
    setUploadedAssets(assets => assets.map(asset => asset.id === selectedAsset.id ? {
      ...asset,
      trimStart,
      clips: (asset.clips || []).map(clip => ({
        ...clip,
        localStartSec: trimStart,
        localEndSec: trimStart + selectedPart.duration
      }))
    } : asset))
  }

  const handleUploadClips = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    captureState()
    setUploadBusy(true)
    setClipError('')

    try {
      if (uploadTarget.current && files.length === 1) {
        await uploadPart(files[0], uploadTarget.current)
        uploadTarget.current = null
        return
      }

      // Distribute files across parts
      let targetParts = reelParts.filter(p => !uploadedAssets.some(a => a.partId === p.id))
      if (targetParts.length === 0) targetParts = [...reelParts]

      const newAssets = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const part = targetParts[i] || reelParts[i % reelParts.length]
        if (!part) continue

        const previewUrl = URL.createObjectURL(file)
        ownedUrls.current.add(previewUrl)
        const duration = await getVideoDuration(file, previewUrl)

        newAssets.push({
          id: `upload-${part.id}-${Date.now()}-${i}`,
          partId: part.id,
          partNumber: part.number,
          name: file.name,
          file,
          previewUrl,
          durationSec: part.duration,
          sourceDurationSec: duration,
          trimStart: 0,
          clips: [{
            id: `upload-${part.id}`,
            partId: part.id,
            partNumber: part.number,
            source: 'upload',
            label: `Part ${part.number} · ${part.name}`,
            durationSec: part.duration,
            localStartSec: 0,
            localEndSec: part.duration,
            mediaType: file.type || 'video/mp4',
            fileName: file.name,
            guidance: part.guidance
          }]
        })
      }

      const nextAssets = [
        ...uploadedAssets.filter(item => !newAssets.some(na => na.partId === item.partId)),
        ...newAssets
      ]
      setUploadedAssets(nextAssets)
      if (newAssets[0]) {
        setSelectedClipId(`upload-${newAssets[0].partId}`)
      }
      setSaveStatus(`${newAssets.length} clip(s) imported to parts`)
    } catch (err) {
      setClipError(err.message)
    } finally {
      uploadTarget.current = null
      setUploadBusy(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleRemovePart = (partId) => {
    captureState()
    const remainingAssets = uploadedAssets.filter(asset => asset.partId !== partId)
    setUploadedAssets(remainingAssets)
    const fallback = originalClips.find(c => c.partId === partId) || originalClips[0]
    if (fallback) {
      setSelectedClipId(fallback.id)
      setPlayhead(fallback.startPct)
    }
  }

  const handleRemoveUploadedAsset = (assetId) => {
    const asset = uploadedAssets.find(a => a.id === assetId)
    if (asset) {
      handleRemovePart(asset.partId)
    } else {
      captureState()
      const remainingAssets = uploadedAssets.filter(a => a.id !== assetId)
      setUploadedAssets(remainingAssets)
      setSelectedClipId(originalClips[0]?.id || null)
    }
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

  const updateSelectedClipGuidance = (field, value) => {
    if (!selectedClip) return

    if (selectedClip.source === 'original') {
      setOriginalClips(prev => prev.map(clip => clip.id === selectedClip.id
        ? { ...clip, guidance: { ...clip.guidance, [field]: value } }
        : clip
      ))
      return
    }

    setUploadedAssets(prev => prev.map(asset => asset.id === selectedClip.assetId
      ? {
        ...asset,
        clips: asset.clips.map(clip => clip.id === selectedClip.id
          ? { ...clip, guidance: { ...clip.guidance, [field]: value } }
          : clip
        )
      }
      : asset
    ))
  }

  const currentEdits = () => {
    const hasUploads = uploadedAssets.length > 0
    return {
      originalClips: hasUploads ? [] : originalClips,
      uploadedAssets: uploadedAssets.map(asset => ({
        id: asset.id,
        name: asset.name,
        durationSec: asset.durationSec,
        clipCount: asset.clips?.length || 0,
        file: asset.file,
        previewUrl: asset.previewUrl
      })),
      selectedClipId,
      textOverlays,
      selectedMusic,
      selectedFilter,
      stickers,
      selectedEffect,
      volume,
      sourceType: hasUploads ? 'user_imported_clips' : 'reference_trend',
      primaryVideoName: hasUploads ? (uploadedAssets[0]?.name || 'User Footage') : (reel?.title || 'Trending Reel'),
      excludeOriginal: hasUploads
    }
  }

  const handleApplyEdits = async () => {
    if (isThreePart) {
      setEditResult({ success: false, message: 'Preview settings applied. Export prepares the 8-second assembly plan; MP4 rendering is not connected.' })
      return
    }
    setEditing(true)
    const res = await submitVideoEdit({
      videoId: reel.id,
      // Keep the editor's existing reference workflow; direct media is previewed in the feed.
      videoUrl: reel.url,
      selectedClip: selectedClip ? {
        id: selectedClip.id,
        label: selectedClip.label,
        source: selectedClip.source,
        fileName: selectedClip.fileName,
        startSec: selectedClip.localStartSec ?? selectedClip.startSec,
        endSec: selectedClip.localEndSec ?? selectedClip.endSec,
        guidance: selectedClip.guidance,
      } : null,
      uploadedAssets: uploadedAssets.map(asset => ({
        id: asset.id,
        name: asset.name,
        durationSec: asset.durationSec,
        clipCount: asset.clips?.length || 0,
      })),
      textOverlays,
      text: textOverlays[0] ? {
        content: textOverlays[0].content,
        position: textOverlays[0].position,
        style: { fontSize: textOverlays[0].fontSize, color: textOverlays[0].color }
      } : null,
      music: selectedMusic,
      filter: selectedFilter,
      stickers,
      effect: selectedEffect,
      volume,
    })
    setEditResult(res)
    setEditing(false)
  }

  const handleSaveProject = async (lastExport) => {
    if (operationBusy.current || restoring || saving) return
    setSaving(true)
    setSaveStatus('Saving...')
    let nextStorageId
    let committed = false
    try {
      const edits = currentEdits()
      if (isThreePart) {
        nextStorageId = `${projectId.current}:${crypto.randomUUID()}`
        await writeReferenceDraft(nextStorageId, uploadedAssets)
        edits.referenceDraftId = nextStorageId
        edits.uploadedAssets = uploadedAssets.map(({ file, previewUrl, ...asset }) => ({
          ...asset, clips: asset.clips.map(({ previewUrl, ...clip }) => clip),
        }))
      }
      const saved = await saveProject({
        id: projectId.current, title: reel.title, thumbnail: reel.thumbnail,
        platform: reel.platform, sourceVideo: reel, savedAt: Date.now(), edits, editResult,
        ...(lastExport && (lastExport.status || lastExport.exports) ? { lastExport } : {}),
      })
      committed = true
      projectId.current = saved.id
      if (nextStorageId) draftStorageId.current = nextStorageId
      if (mounted.current) {
        onReelChange?.(saved)
        setSaveStatus(isThreePart ? 'Saved to Projects. Footage stays in this browser.' : 'Saved to Projects')
      }
      // Keep older file versions: online and fallback metadata may reference different saves.
    } catch (error) {
      if (nextStorageId && !committed) await deleteReferenceDraft(nextStorageId).catch(() => {})
      if (mounted.current) setSaveStatus(error.message || 'Save failed. Keep this tab open and try again.')
      throw error
    } finally { if (mounted.current) setSaving(false) }
  }

  const formatTimelineTime = (pct) => formatSeconds((pct / 100) * activeTimelineDuration)

  const selectedClipGuidance = selectedClip?.guidance || null
  const previewLabel = selectedClip?.source === 'upload'
    ? `${selectedClip.label} · ${selectedClip.assetName || selectedClip.fileName}`
    : selectedClip?.label || 'Original Clip'

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col" role="dialog" aria-label="AI video editor">
      <div className="flex items-center justify-between px-4 py-3 bg-[#12121a] border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-slate-400 hover:text-white transition flex items-center gap-1">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm hidden sm:inline">Back</span>
          </button>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            {editorModes.map(m => {
              const Icon = m.icon
              return (
                <button
                  key={m.id}
                  onClick={() => { setIsPlaying(false); setSequenceMode(false); setMode(m.id) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${mode === m.id ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <Icon className="w-3.5 h-3.5" /> {m.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button aria-label="Undo" onClick={handleUndo} disabled={history.length === 0 || uploadBusy || restoring || saving} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition disabled:opacity-30">
            <Undo2 className="w-4 h-4" />
          </button>
          <button aria-label="Redo" onClick={handleRedo} disabled={future.length === 0 || uploadBusy || restoring || saving} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition disabled:opacity-30">
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="h-6 w-px bg-white/10 mx-1" />
          {saveStatus && <span className="hidden sm:inline text-xs text-green-400">{saveStatus}</span>}
          <button
            onClick={() => handleSaveProject().catch(() => {})}
            disabled={uploadBusy || restoring || saving}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Save
          </button>
          <button
            onClick={() => { setIsPlaying(false); setShowExport(true) }}
            disabled={uploadBusy || restoring || saving}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-purple-600 text-white text-xs font-semibold transition hover:opacity-90 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {mode === 'edit' && (
        <div className="flex-1 flex overflow-hidden">
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

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex items-center justify-center bg-black/40 p-4 min-h-0">
              <div className="relative aspect-[9/16] w-full max-w-sm max-h-full rounded-lg overflow-hidden shadow-2xl bg-black" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                {previewUrl ? (
                  <ClipVideo
                    key={`${selectedClip.id}-${previewStart}-${previewVersion}`}
                    src={previewUrl} poster={selectedClip.source === 'original' ? reel.thumbnail : undefined}
                    start={previewStart} end={previewEnd} playing={isPlaying} volume={volume}
                    onPlayingChange={setIsPlaying} onProgress={handlePreviewProgress} onEnded={handlePreviewEnd}
                    className={`h-full w-full object-contain ${effectClass}`}
                    style={currentFilter?.style}
                  />
                ) : (
                  <img
                    src={reel.thumbnail}
                    alt={reel.title}
                    className={`h-full w-full object-cover ${effectClass}`}
                    style={currentFilter?.style}
                  />
                )}

                {selectedEffect === 'Glitch' && <div className="absolute inset-0 bg-cyan-400/10 mix-blend-screen translate-x-1 pointer-events-none" />}
                {selectedEffect === 'Flash' && <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />}
                {selectedEffect === 'Shake' && <div className="absolute inset-0 border-4 border-red-400/20 animate-pulse pointer-events-none" />}

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

                <div className="absolute left-2 top-2 flex items-center gap-2 pointer-events-none">
                  <span className={`platform-badge platform-${reel.platform}`}>{selectedClip?.source === 'upload' ? 'Uploaded clip' : reel.platform === 'youtube' ? 'YouTube Shorts' : reel.platform}</span>
                  {selectedClip && <span className="px-2 py-1 rounded-full bg-black/60 text-[10px] text-white">{selectedClip.label}</span>}
                </div>

                {!previewUrl && <div className="absolute left-3 right-3 bottom-3 rounded-xl bg-black/60 border border-white/10 p-3 text-white backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                    <span>{selectedClip?.source === 'upload' ? 'Uploaded clip' : 'Original reference'}</span>
                    <span>{selectedClip ? `${formatSeconds(selectedClip.localStartSec ?? selectedClip.startSec)}-${formatSeconds(selectedClip.localEndSec ?? selectedClip.endSec)}` : '0:00-0:00'}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{previewLabel}</p>
                  <p className="mt-1 text-xs text-slate-300 line-clamp-2">{selectedClipGuidance?.description || 'Select a clip from the timeline to preview it here.'}</p>
                </div>}
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 py-2 bg-[#12121a] border-t border-white/5">
              <span className="text-xs text-slate-400 font-mono">{formatTimelineTime(playhead)}</span>
              <button
                aria-label={isPlaying ? 'Pause clip' : 'Play clip'}
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-brand-600 hover:bg-brand-700 flex items-center justify-center transition"
              >
                {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" fill="white" />}
              </button>
              <span className="text-xs text-slate-400 font-mono">{formatTimelineTime(selectedClip?.endPct ?? 100)}</span>
              <button
                onClick={previewSequence}
                disabled={uploadBusy || restoring}
                className="rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-300 font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {sequenceMode ? 'Restart Sequence' : `Play All ${reelParts.length} Parts`}
              </button>
            </div>

            <div className="bg-[#0e0e14] border-t border-white/5 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Clip Timeline</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      {uploadedTrackClips.length} of {reelParts.length} Parts Uploaded
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {uploadedTrackClips.length === 0
                      ? `Upload clips for each part below. Export will assemble only your clips.`
                      : uploadedTrackClips.length < reelParts.length
                        ? `Click empty part slots to upload. Upload all ${reelParts.length} parts to complete the full reel.`
                        : `🎉 All ${reelParts.length} parts ready! Click Export to assemble and download your finished reel.`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input ref={fileInputRef} type="file" accept="video/*" multiple className="hidden" onChange={handleUploadClips} />
                  <input ref={partInputRef} type="file" accept="video/*,.mp4,.mov,.webm,.m4v" className="hidden" aria-label="Upload selected part video" onChange={event => { const file = event.target.files[0]; event.target.value = ''; if (file) uploadPart(file, uploadTarget.current) }} />
                  <button
                    onClick={() => { uploadTarget.current = null; fileInputRef.current?.click() }}
                    disabled={uploadBusy || restoring || saving}
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 shadow-sm transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploadedTrackClips.length > 0 ? 'Upload More Clips' : 'Upload Clips by Part'}
                  </button>
                </div>
              </div>

              <div className="flex justify-between text-[9px] text-slate-600 mb-1 px-1">
                {[0, 25, 50, 75, 100].map(p => <span key={p}>{formatTimelineTime(p)}</span>)}
              </div>

              <div ref={timelineRef} className="relative space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-500 w-14 text-right">Reference</span>
                  <div className="flex-1 h-12 bg-white/5 rounded relative overflow-hidden border border-white/5 opacity-80 hover:opacity-100 transition">
                    {originalClips.map(clip => (
                      <button
                        key={clip.id}
                        aria-label={`Original ${clip.label}`}
                        onClick={() => handleClipSelect(clip)}
                        className={`absolute inset-y-1 rounded-md overflow-hidden border text-left ${selectedClip?.id === clip.id ? 'border-brand-400 ring-1 ring-brand-400/60' : 'border-white/10 hover:border-white/30'}`}
                        style={{ left: `${clip.startPct}%`, width: `${clip.endPct - clip.startPct}%` }}
                      >
                        <img src={reel.thumbnail} alt="" className="w-full h-full object-cover opacity-70" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/20 p-2 flex flex-col justify-between">
                          <span className="text-[10px] font-semibold text-white truncate">{clip.label}</span>
                          <span className="text-[9px] text-slate-200">{clip.durationSec}s</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-14 text-right pt-2 flex flex-col items-end">
                    <span className="text-[9px] font-semibold text-emerald-400">Your Clips</span>
                    {uploadedTrackClips.length > 0 && (
                      <span className="text-[8px] px-1 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                        {uploadedTrackClips.length}/{reelParts.length}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-h-12 bg-emerald-950/20 rounded relative overflow-hidden border border-emerald-500/20 px-1 py-1">
                    {reelParts.map(part => {
                      const clip = uploadedTrackClips.find(item => item.partId === part.id)
                      const isSelected = selectedClip?.partId === part.id && (selectedClip?.source === 'upload' || !clip)
                      const widthPct = part.endPct - part.startPct

                      if (clip) {
                        return (
                          <button
                            key={part.id}
                            aria-label={`Uploaded clip for Part ${part.number} (${part.name})`}
                            onClick={() => handleClipSelect(clip)}
                            className={`absolute inset-y-1 rounded-md px-2 py-1 border text-left cursor-pointer transition flex flex-col justify-between overflow-hidden group ${
                              isSelected
                                ? 'border-emerald-400 ring-2 ring-emerald-400/80 bg-emerald-600/30'
                                : 'border-emerald-500/40 bg-emerald-950/60 hover:border-emerald-400/70 hover:bg-emerald-900/40'
                            }`}
                            style={{ left: `${part.startPct}%`, width: `calc(${widthPct}% - 4px)` }}
                          >
                            <div className="flex items-center justify-between gap-1 w-full">
                              <span className="text-[10px] font-bold text-white truncate flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>Part {part.number} · {part.name}</span>
                              </span>
                              <span className="text-[8px] font-mono text-emerald-300 bg-emerald-950/80 px-1 py-0.5 rounded shrink-0">
                                {part.duration}s
                              </span>
                            </div>
                            <span className="text-[9px] text-emerald-200 truncate w-full font-medium">
                              {clip.fileName}
                            </span>
                          </button>
                        )
                      }

                      return (
                        <button
                          key={part.id}
                          aria-label={`Upload clip for Part ${part.number} (${part.name})`}
                          onClick={() => choosePartUpload(part)}
                          className="absolute inset-y-1 rounded-md border border-dashed border-emerald-500/40 hover:border-emerald-400 bg-white/[0.02] hover:bg-emerald-950/30 px-2 py-1 text-left cursor-pointer transition flex flex-col justify-center items-center text-center group"
                          style={{ left: `${part.startPct}%`, width: `calc(${widthPct}% - 4px)` }}
                        >
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 group-hover:text-emerald-300">
                            <Upload className="w-3 h-3 shrink-0" />
                            <span className="truncate">+ Upload Part {part.number}</span>
                          </div>
                          <span className="text-[8px] text-slate-400 truncate mt-0.5">
                            {part.name} · {part.duration}s slot
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] text-slate-500 w-14 text-right">Audio</span>
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

                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] text-slate-500 w-14 text-right">Text</span>
                  <div className="flex-1 h-6 bg-white/5 rounded relative overflow-hidden">
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

                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-500 w-14 text-right">Filter</span>
                  <div className="flex-1 h-6 bg-white/5 rounded flex items-center px-2">
                    <span className="text-[10px] text-slate-400">{currentFilter?.name || 'Original'}</span>
                  </div>
                </div>

                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none"
                  style={{ left: `calc(4rem + (100% - 4rem) * ${playhead / 100})`, height: '100%' }}
                >
                  <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="w-72 bg-[#12121a] border-l border-white/5 overflow-y-auto flex-shrink-0">
            {activeTool === 'guidance' && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Part Guidelines & Upload</h3>
                    <p className="text-[10px] text-slate-500">Upload your clips by part to assemble your reel.</p>
                  </div>
                  <button onClick={() => choosePartUpload(selectedPart)} className="px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-[10px] text-white font-medium flex items-center gap-1 transition">
                    <Upload className="w-3 h-3" /> Upload Part {selectedPart?.number || 1}
                  </button>
                </div>

                {restoring && <p role="status" className="text-xs text-slate-400">Restoring saved footage…</p>}
                {uploadBusy && <p role="status" className="text-xs text-slate-400">Reading video…</p>}
                {clipError && <p role="alert" className="text-xs text-amber-400">{clipError}</p>}
                {selectedPart && (
                  <PartUploadPanel
                    part={selectedPart}
                    asset={selectedAsset}
                    busy={uploadBusy || restoring || saving}
                    onUpload={() => choosePartUpload(selectedPart)}
                    onDrop={file => uploadPart(file, selectedPart)}
                    onReference={() => handleClipSelect(originalClips.find(clip => clip.partId === selectedPart.id))}
                    onMine={() => handleClipSelect(uploadedTrackClips.find(clip => clip.partId === selectedPart.id))}
                    onTrim={trimSelectedPart}
                    onTrimStart={captureState}
                    onRemove={() => handleRemovePart(selectedPart.id)}
                  />
                )}

                {selectedClip ? (
                  <>
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white">{selectedClip.label}</span>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{selectedClip.source}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{selectedClip.assetName || selectedClip.fileName || reel.title}</p>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                        <div className="rounded-lg bg-black/20 px-2 py-1.5">Stage: <span className="text-white">{selectedClipGuidance?.stage || 'Beat'}</span></div>
                        <div className="rounded-lg bg-black/20 px-2 py-1.5">Duration: <span className="text-white">{selectedClip.durationSec}s</span></div>
                        <div className="rounded-lg bg-black/20 px-2 py-1.5 col-span-2">Range: <span className="text-white">{formatSeconds(selectedClip.localStartSec ?? selectedClip.startSec)}-{formatSeconds(selectedClip.localEndSec ?? selectedClip.endSec)}</span></div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-brand-500/20 bg-brand-500/10 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-brand-200">{isThreePart ? 'Shot guide' : 'AI analysis'}</span>
                        <span className="text-[10px] text-brand-100">{selectedClipGuidance?.title}</span>
                      </div>
                      <p className="text-xs text-slate-200">{selectedClipGuidance?.analysis}</p>
                      <div className="rounded-lg bg-black/20 px-2 py-2 text-[11px] text-slate-300">
                        Suggested overlay: <span className="text-white">{selectedClipGuidance?.overlaySuggestion || 'Keep the caption short and readable'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400">Clip description</label>
                      <textarea
                        value={selectedClipGuidance?.description || ''}
                        onChange={e => updateSelectedClipGuidance('description', e.target.value)}
                        className="mt-1 w-full min-h-20 rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-xs text-white"
                        placeholder="Describe what should happen in this clip"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-400">Camera direction</label>
                      <textarea
                        value={selectedClipGuidance?.cameraDirection || ''}
                        onChange={e => updateSelectedClipGuidance('cameraDirection', e.target.value)}
                        className="mt-1 w-full min-h-20 rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-xs text-white"
                        placeholder="Example: Pan the camera from left to right"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-400">Things needed</label>
                      <textarea
                        value={selectedClipGuidance?.thingsNeeded || ''}
                        onChange={e => updateSelectedClipGuidance('thingsNeeded', e.target.value)}
                        className="mt-1 w-full min-h-16 rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-xs text-white"
                        placeholder="Props, lighting, product, background, wardrobe"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-400">Amount of people needed</label>
                      <input
                        type="number"
                        min="0"
                        value={selectedClipGuidance?.peopleNeeded ?? 1}
                        onChange={e => updateSelectedClipGuidance('peopleNeeded', parseInt(e.target.value || '0', 10))}
                        className="mt-1 w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-400">Extra notes</label>
                      <textarea
                        value={selectedClipGuidance?.notes || ''}
                        onChange={e => updateSelectedClipGuidance('notes', e.target.value)}
                        className="mt-1 w-full min-h-20 rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-xs text-white"
                        placeholder="Tell the editor what makes this shot useful"
                      />
                    </div>

                    {uploadedAssets.length > 0 && (
                      <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Uploaded files</p>
                        {uploadedAssets.map(asset => (
                          <div key={asset.id} className="flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2 py-2">
                            <div className="min-w-0">
                              <p className="text-xs text-white truncate">{asset.name}</p>
                              <p className="text-[10px] text-slate-500">{asset.durationSec}s · {asset.clips?.length || 0} clips</p>
                            </div>
                            <button aria-label={`Remove ${asset.name}`} disabled={uploadBusy || restoring || saving} onClick={() => handleRemoveUploadedAsset(asset.id)} className="text-red-400 hover:text-red-300">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-500">Choose a clip from the timeline to fill out the guideline panel.</p>
                )}
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

      {mode === 'generate' && (
        <GenerateMode reel={reel} brandInfo={brandInfo} onClose={onClose} />
      )}

      {mode === 'remix' && (
        <RemixMode brandInfo={brandInfo} reel={reel} onSavePlan={() => handleSaveProject().catch(() => {})} />
      )}

      {showExport && (
        <ExportModal
          reel={reel}
          onClose={() => setShowExport(false)}
          edits={currentEdits()}
          onSavedExport={handleSaveProject}
          reelParts={reelParts}
          uploadedTrackClips={uploadedTrackClips}
        />
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

  const formatViews = (n) => {
    if (n == null || !Number.isFinite(n) || n < 0) return 'Unknown'
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return String(n)
  }

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
              {concept.aiProvider && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  {concept.aiProvider}
                </span>
              )}
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
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-green-400">
                <Check className="w-5 h-5" />
                <span className="font-semibold">{result.message}</span>
              </div>
              {result.plan?.aiProvider && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  {result.plan.aiProvider}
                </span>
              )}
            </div>
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
function ExportModal({ reel, onClose, edits, onSavedExport, reelParts = [], uploadedTrackClips = [] }) {
  const [selectedPlatforms, setSelectedPlatforms] = useState(['youtube', 'instagram', 'tiktok'])
  const [exporting, setExporting] = useState(false)
  const [done, setDone] = useState(false)
  const [exportResult, setExportResult] = useState(null)
  const [exportError, setExportError] = useState('')
  const [exportProgress, setExportProgress] = useState({ percent: 0, message: '' })

  const platforms = [
    { id: 'youtube', name: 'YouTube Shorts', res: '1080x1920' },
    { id: 'instagram', name: 'Instagram Reels', res: '1080x1920' },
    { id: 'tiktok', name: 'TikTok', res: '1080x1920' },
  ]

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  const readyClips = (uploadedTrackClips && uploadedTrackClips.length > 0)
    ? uploadedTrackClips
    : (edits.uploadedAssets || []).map((asset, idx) => ({
        partNumber: asset.partNumber || idx + 1,
        stage: asset.name,
        durationSec: asset.durationSec || 3,
        localStartSec: asset.trimStart || 0,
        previewUrl: asset.previewUrl,
        file: asset.file,
        fileName: asset.name
      }))

  const hasUserUploads = readyClips.length > 0
  const totalPartsCount = reelParts.length || 3

  const handleExport = async () => {
    if (!hasUserUploads) {
      setExportError('Please upload at least one video clip for your parts to export.')
      return
    }

    setExporting(true)
    setExportError('')
    setExportProgress({ percent: 5, message: 'Starting export assembly...' })

    try {
      const partsToRender = readyClips.map(clip => ({
        partNumber: clip.partNumber,
        name: clip.stage || clip.label,
        duration: clip.durationSec,
        trimStart: clip.localStartSec || 0,
        previewUrl: clip.previewUrl,
        file: clip.file,
        fileName: clip.fileName
      }))

      // 1. Client-side video assembly and rendering into real playable video
      const rendered = await assembleAndExportVideo({
        parts: partsToRender,
        textOverlays: edits.textOverlays || [],
        selectedFilter: edits.selectedFilter || 'original',
        stickers: edits.stickers || [],
        volume: edits.volume ?? 80,
        onProgress: setExportProgress
      })

      // 2. Server package manifest creation
      const serverResult = await exportReel({
        videoId: `user_parts_${Date.now()}`,
        platforms: selectedPlatforms,
        editConfig: {
          ...edits,
          partsAssembled: partsToRender.map(p => ({
            part: p.partNumber,
            name: p.name,
            duration: p.duration,
            fileName: p.fileName
          })),
          excludeOriginal: true,
          outputVideo: rendered.filename
        }
      }).catch(err => {
        console.warn('[Export] Server export package warning:', err.message)
        return { success: true, exports: selectedPlatforms.map(p => ({ platform: p, status: 'rendered-ready' })) }
      })

      // 3. Auto-trigger download of the rendered video file
      if (rendered.downloadUrl) {
        const link = document.createElement('a')
        link.href = rendered.downloadUrl
        link.download = rendered.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      const combinedResult = {
        ...serverResult,
        assembledVideoUrl: rendered.downloadUrl,
        assembledFilename: rendered.filename,
        assembledBlob: rendered.blob,
        durationSeconds: rendered.durationSeconds,
        partsAssembledCount: rendered.partsAssembled,
        readyClips
      }

      await onSavedExport?.(combinedResult)
      setExportResult(combinedResult)
      setDone(true)
    } catch (error) {
      console.error('[Export] Error:', error)
      setExportError(error.message || 'Export assembly failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div role="dialog" aria-label="Export reel" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={onClose}>
      <div className="glass rounded-2xl max-w-lg w-full p-6 border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {done ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Reel Export Complete!</h3>
              <p className="text-xs text-slate-300 mt-1">
                Your video has been assembled from your {exportResult?.partsAssembledCount || readyClips.length} uploaded part clip(s).
                <br />
                <span className="text-emerald-400 font-medium">Saved to your downloads folder.</span> (Original reference excluded)
              </p>
            </div>

            {/* Assembled Video Preview */}
            {exportResult?.assembledVideoUrl && (
              <div className="rounded-xl overflow-hidden bg-black border border-emerald-500/30 shadow-xl max-h-56 mx-auto flex items-center justify-center">
                <video
                  src={exportResult.assembledVideoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-56 object-contain"
                />
              </div>
            )}

            {/* Download Assembled Reel Button */}
            {exportResult?.assembledVideoUrl && (
              <button
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = exportResult.assembledVideoUrl
                  link.download = exportResult.assembledFilename
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Assembled Reel ({exportResult.assembledFilename})</span>
              </button>
            )}

            {/* Individual Parts Download Section */}
            {readyClips.length > 0 && (
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-left space-y-2">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Individual Part Clips ({readyClips.length} parts)
                </p>
                <div className="space-y-1.5">
                  {readyClips.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-black/30 border border-white/5">
                      <div className="min-w-0 pr-2">
                        <span className="font-semibold text-emerald-300">Part {c.partNumber || i + 1}</span>
                        <span className="text-slate-300 ml-1.5 truncate">({c.stage || c.label})</span>
                        <p className="text-[10px] text-slate-400 truncate">{c.fileName}</p>
                      </div>
                      <a
                        href={c.previewUrl}
                        download={`part_${c.partNumber || i + 1}_${c.fileName || 'clip.mp4'}`}
                        className="text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 shrink-0 transition"
                      >
                        <Download className="w-3 h-3" /> Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Platform Packages */}
            <div className="space-y-1.5 text-left">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Platform Deployment Packages</p>
              {(exportResult?.exports || selectedPlatforms.map(p => ({ platform: p, status: 'ready' }))).map(item => (
                <div key={item.platform} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-xs font-medium text-white capitalize">{item.platform} Package (9:16)</span>
                  {item.downloadUrl ? (
                    <a href={item.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-semibold">
                      <Download className="w-3 h-3" /> View Package
                    </a>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-medium">Ready</span>
                  )}
                </div>
              ))}
            </div>

            <button onClick={onClose} className="w-full mt-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Export Assembled Reel</h3>
                <p className="text-xs text-slate-400">Export your user uploaded clips into 9:16 vertical video.</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Part Breakdown Status Card */}
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Exporting User Clips Only</span>
                </p>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] font-bold">
                  {readyClips.length} of {totalPartsCount} Parts Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                The original reference video is <span className="font-semibold text-white">EXCLUDED</span>. Only your uploaded part footage will be stitched and exported.
              </p>

              {/* Part Slots Status List */}
              <div className="space-y-1.5 pt-1">
                {reelParts.map(part => {
                  const clip = readyClips.find(c => c.partId === part.id || c.partNumber === part.number)
                  return (
                    <div key={part.id} className="flex items-center justify-between py-1 px-2 rounded bg-black/30 text-[11px]">
                      <span className="text-white font-medium">Part {part.number}: {part.name} ({part.duration}s)</span>
                      {clip ? (
                        <span className="text-emerald-300 flex items-center gap-1 font-semibold truncate max-w-[180px]">
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{clip.fileName}</span>
                        </span>
                      ) : (
                        <span className="text-amber-400 text-[10px]">Slot empty</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {readyClips.length < totalPartsCount && readyClips.length > 0 && (
                <p className="text-[10px] text-amber-300 pt-1">
                  💡 Note: {totalPartsCount - readyClips.length} part(s) are empty. Export will assemble the {readyClips.length} available part(s).
                </p>
              )}
            </div>

            {exportError && (
              <p role="alert" className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg mb-3">
                {exportError}
              </p>
            )}

            {/* Target Platforms */}
            <div className="space-y-2 mb-4">
              <label className="text-xs font-semibold text-slate-300">Target Platforms (9:16 Vertical)</label>
              <div className="grid grid-cols-3 gap-2">
                {platforms.map(p => (
                  <label
                    key={p.id}
                    className={`flex flex-col items-center p-2.5 rounded-xl border cursor-pointer transition text-center ${
                      selectedPlatforms.includes(p.id)
                        ? 'border-brand-500 bg-brand-500/10 text-white'
                        : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.includes(p.id)}
                      onChange={() => togglePlatform(p.id)}
                      className="hidden"
                    />
                    <span className="text-xs font-semibold">{p.name}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{p.res}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Applied Edits Info */}
            <div className="text-xs text-slate-400 mb-4 bg-white/5 rounded-xl p-3 space-y-1">
              <div className="flex justify-between">
                <span>Text Overlays:</span>
                <span className="text-white font-medium">{edits.textOverlays?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Color Filter:</span>
                <span className="text-white font-medium capitalize">{edits.selectedFilter || 'Original'}</span>
              </div>
              <div className="flex justify-between">
                <span>Volume:</span>
                <span className="text-white font-medium">{edits.volume ?? 80}%</span>
              </div>
              <div className="flex justify-between">
                <span>Original Reference Video:</span>
                <span className="text-emerald-400 font-semibold">Excluded</span>
              </div>
            </div>

            {/* Exporting Progress Bar */}
            {exporting && (
              <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">{exportProgress.message || 'Assembling video...'}</span>
                  <span className="text-emerald-400 font-mono font-bold">{exportProgress.percent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-black/40 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-200"
                    style={{ width: `${exportProgress.percent}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={exporting}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={exporting || selectedPlatforms.length === 0 || !hasUserUploads}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {exporting ? 'Assembling Reel...' : `Assemble & Export Reel`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
