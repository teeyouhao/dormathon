import { Upload, Lock, Check } from 'lucide-react'

export default function PartUploadPanel({ part, asset, busy, onUpload, onDrop, onReference, onMine, onTrim, onTrimStart }) {
  if (!part) return null
  return <section className="rounded-xl border border-brand-500/30 bg-brand-500/5 p-3 space-y-3" aria-label={`Part ${part.number} upload`}>
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-300">Reference {part.start}–{part.end}s</span>
      <span className="text-brand-300">{part.locked ? 'Included' : `Your clip: ${part.duration}s`}</span>
    </div>
    <div className="flex gap-2">
      <button onClick={onReference} className="flex-1 rounded bg-white/5 px-2 py-2 text-xs text-slate-300 hover:bg-white/10">Watch reference</button>
      {!part.locked && <button onClick={onMine} disabled={!asset} className="flex-1 rounded bg-white/5 px-2 py-2 text-xs text-slate-300 hover:bg-white/10 disabled:opacity-30">Watch your clip</button>}
    </div>
    {part.locked ? <p className="flex items-center gap-2 text-xs text-slate-300"><Lock size={14} /> Original meme included. No upload needed.</p> : <div
      className="rounded-lg border border-dashed border-white/20 p-3 text-center space-y-2"
      onDragOver={event => event.preventDefault()}
      onDrop={event => { event.preventDefault(); onDrop(event.dataTransfer.files[0]) }}>
      {asset && <p className="text-xs text-emerald-300 flex items-center justify-center gap-1"><Check size={14} /> Part {part.number} ready</p>}
      <button disabled={busy} onClick={onUpload} className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 px-3 py-2 text-xs text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
        <Upload size={14} /> {asset ? `Replace Part ${part.number}` : `Upload Part ${part.number}`}
      </button>
      <p className="text-[10px] text-slate-400">Drop a video or choose a file. Assigned only to Part {part.number}.</p>
      <p className="text-[10px] text-slate-500">MP4, MOV, WebM · 150 MB max</p>
    </div>}
    {asset && <div className="space-y-2 text-xs text-slate-300">
      <p className="break-all">{asset.name}</p>
      <p className="text-[10px] text-slate-400">{asset.sourceDurationSec.toFixed(2)}s source · using {part.duration}s</p>
      {asset.sourceDurationSec > part.duration && <label className="block space-y-2">
        <span>Clip start: {asset.trimStart.toFixed(2)}s</span>
        <input aria-label={`Part ${part.number} clip start`} className="w-full accent-brand-500" type="range" min="0" max={asset.sourceDurationSec - part.duration} step="0.01" value={asset.trimStart}
          disabled={busy} onPointerDown={onTrimStart} onKeyDown={event => { if (event.key.startsWith('Arrow')) onTrimStart() }} onChange={event => onTrim(event.target.value)} />
      </label>}
    </div>}
    {part.number === 3 && <p className="text-[10px] text-slate-400">Reference is 3s; your replacement is 4s. Final sequence: 2s + 2s + 4s.</p>}
  </section>
}
