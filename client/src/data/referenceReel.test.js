import assert from 'node:assert/strict'
import { File } from 'node:buffer'
import { describe, it } from 'node:test'
import {
  referenceReel, referenceParts, isReferenceReel, pinReferenceReel,
  partGuidance, buildReferenceClips, validatePartFile, buildPartAsset,
  partUploadClips, assemblyPlan,
} from './referenceReel.js'

const [intro, delivery, chef] = referenceParts
const maxBytes = 150 * 1024 * 1024

// File contents are fixtures for pure helpers, not decodable browser media.
function makeUpload(part, name = `${part.id}.mp4`, duration = part.duration + 3) {
  const file = new File(['test footage'], name, { type: 'video/mp4', lastModified: 0 })
  return buildPartAsset(file, `blob:test-${part.id}-${name}`, duration, part)
}

function withTrim(asset, trimStart) {
  // The editor stores both the asset trim and clip-local playback bounds.
  return {
    ...asset,
    trimStart,
    clips: asset.clips.map(clip => ({
      ...clip, localStartSec: trimStart, localEndSec: trimStart + clip.durationSec,
    })),
  }
}

describe('reference identity and pinning', () => {
  it('recognizes canonical identity, individual identity fields, and saved projects', () => {
    assert.equal(referenceReel.id, 'instagram-DOOmrjGjWB4')
    assert.equal(referenceReel.shortCode, 'DOOmrjGjWB4')
    for (const item of [
      referenceReel,
      { id: referenceReel.id },
      { shortCode: referenceReel.shortCode },
      { url: referenceReel.url },
      { url: referenceReel.url.slice(0, -1) },
      { url: `${referenceReel.url}?igsh=test` },
      { url: `${referenceReel.url.slice(0, -1)}?igsh=test` },
      { id: 'saved-project', sourceVideo: { shortCode: referenceReel.shortCode } },
      { sourceVideo: { url: referenceReel.url } },
    ]) {
      assert.equal(isReferenceReel(item), true, JSON.stringify(item))
    }
  })

  it('does not match ordinary reels, similar short codes, or missing data', () => {
    for (const item of [
      undefined, null, {},
      { id: 'ordinary', platform: 'instagram', title: referenceReel.title },
      { shortCode: `${referenceReel.shortCode}extra` },
      { url: referenceReel.url.replace(referenceReel.shortCode, `${referenceReel.shortCode}extra`) },
      { url: referenceReel.url.replace(referenceReel.shortCode, 'OtherReel') },
      { sourceVideo: { id: 'ordinary', title: referenceReel.title } },
      { id: referenceReel.id, sourceVideo: { id: 'ordinary' } },
    ]) {
      assert.equal(isReferenceReel(item), false, JSON.stringify(item))
    }
  })

  it('pins the canonical object once, deduplicates all identities, and preserves ordinary order', () => {
    const first = Object.freeze({ id: 'ordinary-1' })
    const second = Object.freeze({ id: 'ordinary-2', title: referenceReel.title })
    const input = Object.freeze([
      first, { id: referenceReel.id }, { shortCode: referenceReel.shortCode },
      second, { url: `${referenceReel.url}?igsh=test` },
      { sourceVideo: referenceReel }, referenceReel,
    ])
    const before = [...input]
    const pinned = pinReferenceReel(input)
    assert.deepEqual(pinned, [referenceReel, first, second])
    assert.strictEqual(pinned[0], referenceReel)
    assert.strictEqual(pinned[1], first)
    assert.strictEqual(pinned[2], second)
    assert.deepEqual(input, before)
    assert.deepEqual(pinReferenceReel(pinned), pinned)
    assert.deepEqual(pinReferenceReel(), [referenceReel])
    assert.deepEqual(pinReferenceReel([]), [referenceReel])
  })
})

describe('fixed reference windows, output windows, and shooting guidance', () => {
  it('keeps three fixed parts and the deliberate 3s-reference/4s-output chef distinction', () => {
    assert.deepEqual(referenceParts.map(part => ({
      id: part.id, number: part.number, locked: part.locked,
      reference: [part.start, part.end], output: [part.outputStart, part.outputEnd],
      duration: part.duration,
    })), [
      { id: 'part-1', number: 1, locked: true, reference: [0, 2], output: [0, 2], duration: 2 },
      { id: 'part-2', number: 2, locked: false, reference: [2, 4], output: [2, 4], duration: 2 },
      { id: 'part-3', number: 3, locked: false, reference: [5, 8], output: [4, 8], duration: 4 },
    ])
    assert.equal(referenceParts.reduce((sum, part) => sum + part.duration, 0), 8)
  })

  it('projects every guidance field without replacing the hand-authored instructions', () => {
    for (const part of referenceParts) {
      assert.deepEqual(partGuidance(part), {
        title: `Part ${part.number} shooting guide`, label: `Part ${part.number} · ${part.name}`,
        stage: part.name, analysis: part.description, description: part.description,
        cameraDirection: part.cameraDirection, peopleNeeded: part.peopleNeeded,
        thingsNeeded: part.thingsNeeded, notes: part.notes,
        overlaySuggestion: part.overlaySuggestion,
      })
    }
    assert.equal(intro.peopleNeeded, 0)
    assert.match(intro.description, /original.*meme intro/i)
    assert.match(intro.description, /no filming or upload/i)
    assert.equal(delivery.peopleNeeded, 2)
    assert.match(delivery.description, /tiny-looking person.*silver helmet.*food.*driver.*car/i)
    assert.match(delivery.description, /your own people and food/i)
    assert.match(delivery.notes, /parked car/i)
    assert.equal(chef.peopleNeeded, 1)
    assert.match(chef.description, /4-second.*chef.*food/i)
    assert.match(chef.description, /inviting the customer/i)
    assert.match(chef.notes, /3s.*replacement is 4s/i)
  })

  it('builds original clips in source time, preserving the omitted 4–5s gap', () => {
    const clips = buildReferenceClips()
    assert.deepEqual(clips.map(clip => [
      clip.id, clip.partId, clip.source, clip.durationSec,
      clip.startSec, clip.endSec, clip.startPct, clip.endPct,
    ]), [
      ['original-part-1', 'part-1', 'original', 2, 0, 2, 0, 25],
      ['original-part-2', 'part-2', 'original', 2, 2, 4, 25, 50],
      ['original-part-3', 'part-3', 'original', 3, 5, 8, 62.5, 100],
    ])
    clips.forEach((clip, index) => {
      assert.equal(clip.previewUrl, referenceReel.videoUrl)
      assert.equal(clip.fileName, referenceReel.title)
      assert.equal(clip.mediaType, 'video/mp4')
      assert.deepEqual(clip.guidance, partGuidance(referenceParts[index]))
    })
  })

  it('uses supplied media metadata or the reference fallback and returns independent guidance', () => {
    const reel = Object.freeze({ ...referenceReel, title: 'Custom title', videoUrl: '/custom-reference.mp4' })
    const first = buildReferenceClips(reel)
    const second = buildReferenceClips(reel)
    assert.ok(first.every(clip => clip.previewUrl === reel.videoUrl && clip.fileName === reel.title))
    assert.ok(buildReferenceClips({ ...reel, videoUrl: '' }).every(clip => clip.previewUrl === referenceReel.videoUrl))
    first[1].guidance.notes = 'Edited locally'
    assert.equal(second[1].guidance.notes, delivery.notes)
    assert.notStrictEqual(first[1], second[1])
    assert.notStrictEqual(partGuidance(delivery), partGuidance(delivery))
  })
})

describe('independently assigned uploads and trim representation', () => {
  it('retains each real File and source duration while assigning only the requested part', () => {
    for (const part of [delivery, chef]) {
      const asset = makeUpload(part, 'own-footage.mp4', 12.5)
      assert.equal(asset.partId, part.id)
      assert.match(asset.id, new RegExp(`^upload-${part.id}-.+`))
      assert.ok(asset.file instanceof File)
      assert.equal(asset.name, asset.file.name)
      assert.equal(asset.type, asset.file.type)
      assert.equal(asset.size, asset.file.size)
      assert.equal(asset.durationSec, part.duration)
      assert.equal(asset.sourceDurationSec, 12.5)
      assert.equal(asset.trimStart, 0)
      assert.equal(asset.clips.length, 1)
      assert.deepEqual(asset.clips[0], {
        id: `upload-${part.id}`, partId: part.id, source: 'upload',
        label: `Part ${part.number} · ${part.name}`, durationSec: part.duration,
        localStartSec: 0, localEndSec: part.duration,
        mediaType: 'video/mp4', fileName: 'own-footage.mp4', guidance: partGuidance(part),
      })
    }
  })

  it('keeps assignments independent even when the same File is chosen for both parts', () => {
    const file = new File(['shared footage'], 'same.mp4', { type: 'video/mp4' })
    const car = buildPartAsset(file, 'blob:test-car', 9, delivery)
    const cook = buildPartAsset(file, 'blob:test-chef', 9, chef)
    const replacement = buildPartAsset(file, 'blob:test-car-replacement', 9, delivery)
    assert.strictEqual(car.file, file)
    assert.strictEqual(cook.file, file)
    assert.equal(new Set([car.id, cook.id, replacement.id]).size, 3)
    assert.notEqual(car.clips[0].id, cook.clips[0].id)
    assert.notStrictEqual(car.clips, cook.clips)
    assert.notStrictEqual(car.clips[0].guidance, cook.clips[0].guidance)
    car.clips[0].guidance.notes = 'Car only'
    assert.equal(cook.clips[0].guidance.notes, chef.notes)
    assert.equal(replacement.clips[0].guidance.notes, delivery.notes)
    const replaced = partUploadClips([cook, replacement])
    assert.deepEqual(replaced.map(clip => clip.assetId), [replacement.id, cook.id])
    assert.deepEqual(replaced.map(clip => clip.previewUrl), ['blob:test-car-replacement', 'blob:test-chef'])
  })

  it('uses a video playback type fallback for extension-identified files', () => {
    const file = new File(['fixture'], 'delivery.MOV')
    assert.equal(validatePartFile(file, 2, delivery), null)
    assert.equal(buildPartAsset(file, 'blob:test-mov', 2, delivery).clips[0].mediaType, 'video/mp4')
  })

  it('never fills another part from a lone upload or accepts locked/unassigned track entries', () => {
    const car = makeUpload(delivery)
    const cook = makeUpload(chef)
    assert.deepEqual(partUploadClips([]), [])
    assert.deepEqual(partUploadClips([car]).map(clip => clip.partId), ['part-2'])
    assert.deepEqual(partUploadClips([cook]).map(clip => clip.partId), ['part-3'])
    assert.deepEqual(partUploadClips([
      { ...car, partId: 'part-1' }, { ...cook, partId: 'unassigned' },
    ]), [])
  })

  it('orders uploads by assigned part and keeps fixed output positions without mutating assets', () => {
    const car = makeUpload(delivery)
    const cook = makeUpload(chef)
    const assets = Object.freeze([cook, car])
    const before = JSON.stringify(assets)
    const clips = partUploadClips(assets)
    assert.deepEqual(clips.map(clip => [
      clip.partId, clip.startSec, clip.endSec, clip.startPct, clip.endPct, clip.durationSec,
    ]), [
      ['part-2', 2, 4, 25, 50, 2],
      ['part-3', 4, 8, 50, 100, 4],
    ])
    assert.deepEqual(clips.map(clip => clip.assetId), [car.id, cook.id])
    assert.deepEqual(clips.map(clip => clip.assetName), [car.name, cook.name])
    assert.deepEqual(clips.map(clip => clip.previewUrl), [car.previewUrl, cook.previewUrl])
    assert.notStrictEqual(clips[0], car.clips[0])
    assert.equal(JSON.stringify(assets), before)
  })

  it('preserves fractional source trims separately from the fixed output timeline', () => {
    const car = withTrim(makeUpload(delivery, 'car.mp4', 7), 1.25)
    const cook = withTrim(makeUpload(chef, 'chef.mp4', 10), 5.5)
    car.clips[0].guidance.notes = 'Use the later take'
    const before = JSON.stringify([car, cook])
    const clips = partUploadClips([cook, car])
    assert.deepEqual(clips.map(clip => [clip.localStartSec, clip.localEndSec]), [[1.25, 3.25], [5.5, 9.5]])
    assert.deepEqual(clips.map(clip => [clip.startSec, clip.endSec]), [[2, 4], [4, 8]])
    assert.deepEqual(clips.map(clip => [clip.startPct, clip.endPct]), [[25, 50], [50, 100]])
    assert.equal(clips[0].guidance.notes, 'Use the later take')
    assert.equal(JSON.stringify([car, cook]), before)
  })
})

describe('part upload validation', () => {
  const video = { name: 'clip.mp4', type: 'video/mp4', size: 1024 }

  it('rejects locked or missing targets before considering the file', () => {
    for (const part of [intro, null, undefined]) {
      assert.match(validatePartFile(video, 8, part), /Part 1 keeps the original meme.*Part 2 or Part 3/)
      assert.match(validatePartFile(null, NaN, part), /Part 1 keeps the original meme/)
    }
  })

  it('rejects missing files and non-video types/extensions', () => {
    for (const file of [null, undefined, {},
      { name: 'photo.png', type: 'image/png', size: 1 },
      { name: 'audio.mp3', type: 'audio/mpeg', size: 1 },
      { name: 'clip.mp4.txt', type: 'text/plain', size: 1 },
    ]) {
      assert.match(validatePartFile(file, 8, delivery), /Choose a video file/)
    }
  })

  it('accepts video MIME types and case-insensitive supported extension fallbacks', () => {
    assert.equal(validatePartFile({ ...video, name: 'no-extension', type: 'video/webm' }, 8, delivery), null)
    for (const extension of ['mp4', 'MOV', 'WebM', 'M4V']) {
      for (const type of ['', undefined, 'application/octet-stream']) {
        assert.equal(validatePartFile({ ...video, name: `clip.${extension}`, type }, 8, delivery), null)
      }
    }
  })

  it('accepts the 150 MiB maximum and rejects one byte over it', () => {
    assert.equal(validatePartFile({ ...video, size: maxBytes }, 2, delivery), null)
    assert.match(validatePartFile({ ...video, size: maxBytes + 1 }, 2, delivery), /150 MB/)
  })

  it('rejects unreadable, non-finite, nonnumeric, and nonpositive durations', () => {
    for (const duration of [NaN, Infinity, -Infinity, 0, -1, undefined, null, '4']) {
      assert.match(validatePartFile(video, duration, chef), /could not be read/)
    }
  })

  it('requires the exact replacement duration without rounding up short clips', () => {
    for (const part of [delivery, chef]) {
      assert.equal(validatePartFile(video, part.duration, part), null)
      assert.equal(validatePartFile(video, part.duration + 10, part), null)
      assert.match(validatePartFile(video, part.duration - 0.001, part), /needs at least/)
      const shortDuration = part.duration - 0.25
      assert.equal(validatePartFile(video, shortDuration, part),
        `Part ${part.number} needs at least ${part.duration}s. This video is ${shortDuration.toFixed(2)}s.`)
    }
    assert.match(validatePartFile(video, 3, chef), /Part 3 needs at least 4s/)
  })
})

describe('readiness and honest editable assembly plans', () => {
  it('requires a usable preview for each distinct replacement part, never an intro upload', () => {
    const car = makeUpload(delivery)
    const cook = makeUpload(chef)
    const cases = [
      [[], ['part-2', 'part-3']],
      [[car], ['part-3']],
      [[cook], ['part-2']],
      [[car, makeUpload(delivery)], ['part-3']],
      [[car, { ...cook, previewUrl: '' }], ['part-3']],
      [[{ ...car, previewUrl: undefined }, cook], ['part-2']],
      [[{ ...car, partId: 'part-1' }, { ...cook, partId: 'unassigned' }], ['part-2', 'part-3']],
      [[cook, car], []],
    ]
    for (const [assets, missing] of cases) {
      const plan = assemblyPlan(assets)
      assert.deepEqual(plan.missingParts, missing)
      assert.equal(plan.ready, missing.length === 0)
    }
  })

  it('describes missing sources honestly and supplies neutral edit defaults', () => {
    const plan = assemblyPlan([])
    assert.equal(plan.status, 'assembly-plan-only')
    assert.equal(plan.ready, false)
    assert.equal(plan.reference, referenceReel.url)
    assert.equal(plan.aspectRatio, '9:16')
    assert.equal(plan.durationSeconds, 8)
    assert.deepEqual(plan.platforms, ['instagram'])
    assert.deepEqual(plan.omittedReferenceRange, [4, 5])
    assert.deepEqual(plan.parts.map(part => part.source), [referenceReel.videoUrl, null, null])
    assert.deepEqual(plan.parts.map(part => part.trimStartSeconds), [0, 0, 0])
    assert.deepEqual(plan.edits, {
      textOverlays: [], selectedMusic: null, selectedFilter: 'original',
      stickers: [], selectedEffect: 'none', volume: 80,
    })
    assert.match(plan.notice, /not a rendered MP4/i)
    assert.match(plan.notice, /Local source files are not included/i)
    assert.match(plan.audioNotice, /No music licensing or audio mixing/i)
  })

  it('exports fixed output windows, named sources, and trims without replacing the locked intro', () => {
    const car = withTrim(makeUpload(delivery, 'delivery.mp4', 9), 2.5)
    const cook = withTrim(makeUpload(chef, 'chef.mp4', 12), 6.25)
    const fakeIntro = { ...car, partId: 'part-1', name: 'not-the-intro.mp4', trimStart: 7 }
    const plan = assemblyPlan([cook, fakeIntro, car])
    assert.equal(plan.ready, true)
    assert.deepEqual(plan.parts, [
      { part: 1, referenceRange: [0, 2], outputRange: [0, 2], durationSeconds: 2, source: referenceReel.videoUrl, trimStartSeconds: 0 },
      { part: 2, referenceRange: [2, 4], outputRange: [2, 4], durationSeconds: 2, source: 'delivery.mp4', trimStartSeconds: 2.5 },
      { part: 3, referenceRange: [5, 8], outputRange: [4, 8], durationSeconds: 4, source: 'chef.mp4', trimStartSeconds: 6.25 },
    ])
  })

  it('retains every existing edit tool and explicit mute in a JSON-safe plan, not rendered media', () => {
    const assets = [makeUpload(delivery), makeUpload(chef)]
    const edits = {
      textOverlays: [{ id: 1, content: 'Our lunch', position: 'bottom', startTime: 25, endTime: 75, fontSize: 24, color: '#ffffff', bgColor: '#000000' }],
      selectedMusic: 'trending2', selectedFilter: 'warm',
      stickers: [{ id: 2, emoji: '*', position: 'top', startTime: 50, endTime: 100 }],
      selectedEffect: 'Zoom In', volume: 0,
    }
    const platforms = Object.freeze(['youtube', 'instagram', 'tiktok'])
    const input = { ...edits, uploadedAssets: assets, originalClips: buildReferenceClips(), selectedClipId: 'upload-part-3' }
    const before = JSON.stringify(input)
    const plan = assemblyPlan(assets, input, platforms)
    assert.deepEqual(plan.edits, edits)
    assert.deepEqual(plan.platforms, ['youtube', 'instagram', 'tiktok'])
    assert.equal(plan.status, 'assembly-plan-only')
    assert.equal(plan.ready, true)
    assert.match(plan.notice, /not a rendered MP4/i)
    assert.match(plan.audioNotice, /No music licensing or audio mixing/i)
    assert.equal(JSON.stringify(input), before)
    const json = JSON.stringify(plan)
    assert.deepEqual(JSON.parse(json), plan)
    assert.doesNotMatch(json, /blob:test-|"(?:previewUrl|file|uploadedAssets|originalClips|downloadUrl|renderedUrl|success)"\s*:/)
  })
})
