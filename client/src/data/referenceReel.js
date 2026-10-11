// A hand-authored demo breakdown. Other reels keep their existing beat workflow.
export const referenceReel = {
  id: 'instagram-DOOmrjGjWB4', shortCode: 'DOOmrjGjWB4', platform: 'instagram',
  title: 'On the go delivery', creator: '@judysfamilycafe',
  creatorUrl: 'https://www.instagram.com/judysfamilycafe/',
  caption: 'On the go delivery. Song by: Lastra',
  description: 'On the go delivery. Song by: Lastra',
  url: 'https://www.instagram.com/reel/DOOmrjGjWB4/',
  videoUrl: '/reference-DOOmrjGjWB4.mp4', thumbnail: '/reference-DOOmrjGjWB4.jpg',
  duration: '0:08', industry: 'Food & Beverage', category: 'food',
  tags: ['food', 'cafe', 'delivery'], views: null, likes: null, shares: null,
  region: 'all', uploadedAt: null,
}

export const referenceParts = [
  {
    id: 'part-1', number: 1, name: 'Meme intro', start: 0, end: 2,
    outputStart: 0, outputEnd: 2, duration: 2, locked: true,
    description: 'Keep the original 0–2s meme intro. No filming or upload is needed.',
    cameraDirection: 'Use the original opening unchanged.', peopleNeeded: 0,
    thingsNeeded: 'Original meme intro', notes: 'Included automatically. No replacement needed.',
    overlaySuggestion: 'Keep the original opening',
  },
  {
    id: 'part-2', number: 2, name: 'Car delivery', start: 2, end: 4,
    outputStart: 2, outputEnd: 4, duration: 2, locked: false,
    description: 'Film a 2-second video: a tiny-looking person in a silver helmet holds your food, tucked directly against the driver in a car. Use your own people and food.',
    cameraDirection: 'Match the reference framing. Keep both people, the silver helmet and the food clearly visible. Use perspective to make the passenger look tiny.',
    peopleNeeded: 2, thingsNeeded: 'Food, silver helmet and a parked car',
    notes: 'Film only in a parked car. Never distract a moving driver. Upload this scene to Part 2 only.',
    overlaySuggestion: 'Your food, delivered differently',
  },
  {
    id: 'part-3', number: 3, name: 'Chef reveal', start: 5, end: 8,
    outputStart: 4, outputEnd: 8, duration: 4, locked: false,
    description: 'Film a 4-second video: one chef holds and introduces your food, making it appealing and inviting the customer to try it.',
    cameraDirection: 'Frame the chef and dish clearly. Bring the food slightly toward the camera and finish with a welcoming expression or short invitation.',
    peopleNeeded: 1, thingsNeeded: 'Your food',
    notes: 'Reference: 5–8s (3s). Your replacement is 4s, as requested. Keep the food visible throughout.',
    overlaySuggestion: 'Freshly made. Come try it.',
  },
]

export function isReferenceReel(item) {
  const reel = item?.sourceVideo || item
  return reel?.id === referenceReel.id || reel?.shortCode === referenceReel.shortCode ||
    /instagram\.com\/reel\/DOOmrjGjWB4(?:\/|\?|$)/.test(reel?.url || '')
}

export function pinReferenceReel(videos = []) {
  return [referenceReel, ...(videos || []).filter(video => !isReferenceReel(video))]
}

export function partGuidance(part) {
  return {
    title: `Part ${part.number} shooting guide`, label: `Part ${part.number} · ${part.name}`,
    stage: part.name, analysis: part.description, description: part.description,
    cameraDirection: part.cameraDirection, peopleNeeded: part.peopleNeeded,
    thingsNeeded: part.thingsNeeded, notes: part.notes, overlaySuggestion: part.overlaySuggestion,
  }
}

export function buildReferenceClips(reel = referenceReel) {
  return referenceParts.map(part => ({
    id: `original-${part.id}`, partId: part.id, source: 'original',
    label: `Part ${part.number} · ${part.name}`, durationSec: part.end - part.start,
    startSec: part.start, endSec: part.end, startPct: part.start / 8 * 100, endPct: part.end / 8 * 100,
    previewUrl: reel.videoUrl || referenceReel.videoUrl, mediaType: 'video/mp4',
    fileName: reel.title, guidance: partGuidance(part),
  }))
}

export function validatePartFile(file, duration, part) {
  if (!part || part.locked) return 'Part 1 keeps the original meme. Choose Part 2 or Part 3.'
  if (!file || !(file.type?.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name || ''))) return 'Choose a video file (MP4, MOV or WebM).'
  if (file.size > 150 * 1024 * 1024) return 'Choose a video smaller than 150 MB.'
  if (!Number.isFinite(duration) || duration <= 0) return 'This video could not be read. Try MP4/H.264 or WebM.'
  if (duration < part.duration) return `Part ${part.number} needs at least ${part.duration}s. This video is ${duration.toFixed(2)}s.`
  return null
}

export function buildPartAsset(file, previewUrl, duration, part) {
  return {
    id: `upload-${part.id}-${crypto.randomUUID()}`, partId: part.id,
    name: file.name, type: file.type, size: file.size, file, previewUrl,
    durationSec: part.duration, sourceDurationSec: duration, trimStart: 0,
    clips: [{
      id: `upload-${part.id}`, partId: part.id, source: 'upload',
      label: `Part ${part.number} · ${part.name}`, durationSec: part.duration,
      localStartSec: 0, localEndSec: part.duration,
      mediaType: file.type || 'video/mp4', fileName: file.name, guidance: partGuidance(part),
    }],
  }
}

export function partUploadClips(assets) {
  return referenceParts.filter(part => !part.locked).flatMap(part => {
    const asset = assets.find(item => item.partId === part.id)
    if (!asset) return []
    return asset.clips.map(clip => ({
      ...clip, assetId: asset.id, assetName: asset.name, previewUrl: asset.previewUrl,
      startSec: part.outputStart, endSec: part.outputEnd,
      startPct: part.outputStart / 8 * 100, endPct: part.outputEnd / 8 * 100,
    }))
  })
}

export function assemblyPlan(assets, edits = {}, platforms = ['instagram']) {
  const missing = referenceParts.filter(part => !part.locked && !assets.some(asset => asset.partId === part.id && asset.previewUrl))
  return {
    status: 'assembly-plan-only', ready: missing.length === 0,
    notice: 'This is an editing plan, not a rendered MP4. Local source files are not included.',
    missingParts: missing.map(part => part.id), reference: referenceReel.url,
    aspectRatio: '9:16', durationSeconds: 8, platforms, omittedReferenceRange: [4, 5],
    parts: referenceParts.map(part => {
      const asset = assets.find(item => item.partId === part.id)
      return {
        part: part.number, referenceRange: [part.start, part.end],
        outputRange: [part.outputStart, part.outputEnd], durationSeconds: part.duration,
        source: part.locked ? referenceReel.videoUrl : asset?.name || null,
        trimStartSeconds: part.locked ? 0 : asset?.trimStart || 0,
      }
    }),
    edits: { textOverlays: edits.textOverlays || [], selectedMusic: edits.selectedMusic || null,
      selectedFilter: edits.selectedFilter || 'original', stickers: edits.stickers || [],
      selectedEffect: edits.selectedEffect || 'none', volume: edits.volume ?? 80 },
    audioNotice: 'No music licensing or audio mixing is performed in this mock-up.',
  }
}
