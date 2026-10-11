import { Upload, Check, Trash2, Video, Eye } from 'lucide-react'

export default function PartUploadPanel({
  part,
  asset,
  busy,
  onUpload,
  onDrop,
  onReference,
  onMine,
  onTrim,
  onTrimStart,
  onRemove
}) {
  if (!part) return null

  const partDuration = part.duration || 3
  const isReady = Boolean(asset && asset.previewUrl)

  return (
    <section className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 space-y-3" aria-label={`Part ${part.number} slot`}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-white">Part {part.number} · {part.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
            {partDuration}s slot
          </span>
        </div>
        <span className="text-slate-400 text-[11px]">Ref: {part.start ?? 0}–{part.end ?? partDuration}s</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onReference}
          className="flex-1 rounded-lg bg-white/5 px-2.5 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 flex items-center justify-center gap-1.5 transition"
        >
          <Eye className="w-3.5 h-3.5 text-slate-400" /> Reference
        </button>
        <button
          onClick={onMine}
          disabled={!isReady}
          className="flex-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-2.5 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-30 disabled:border-transparent flex items-center justify-center gap-1.5 transition"
        >
          <Video className="w-3.5 h-3.5 text-emerald-400" /> Your Clip
        </button>
      </div>

      <div
        className={`rounded-xl border border-dashed p-3 text-center space-y-2 transition ${
          isReady
            ? 'border-emerald-500/40 bg-emerald-900/10'
            : 'border-white/20 bg-black/20 hover:border-emerald-400/50 hover:bg-emerald-950/10'
        }`}
        onDragOver={event => event.preventDefault()}
        onDrop={event => {
          event.preventDefault()
          const file = event.dataTransfer?.files?.[0]
          if (file) onDrop?.(file)
        }}
      >
        {isReady ? (
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-300">
            <Check className="w-4 h-4 text-emerald-400" /> Part {part.number} ready
          </div>
        ) : (
          <div className="text-[11px] text-slate-400">
            Empty slot for <span className="text-white font-medium">Part {part.number} ({part.name})</span>
          </div>
        )}

        <button
          disabled={busy}
          onClick={onUpload}
          className={`w-full rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40 flex items-center justify-center gap-2 transition shadow-sm ${
            isReady
              ? 'bg-white/10 hover:bg-white/15 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          {isReady ? `Replace Part ${part.number} Clip` : `Upload Clip for Part ${part.number}`}
        </button>
        <p className="text-[10px] text-slate-400">
          Drop a video file here (MP4, MOV, WebM).
        </p>
      </div>

      {asset && (
        <div className="rounded-lg bg-black/30 border border-white/5 p-2.5 space-y-2 text-xs text-slate-300">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-white truncate">{asset.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {asset.sourceDurationSec ? `${asset.sourceDurationSec.toFixed(1)}s source · using ${partDuration}s` : `Using ${partDuration}s`}
              </p>
            </div>
            {onRemove && (
              <button
                onClick={onRemove}
                title={`Remove Part ${part.number} clip`}
                className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {asset.sourceDurationSec > partDuration && (
            <label className="block space-y-1.5 pt-1 border-t border-white/5">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Clip start offset</span>
                <span className="font-mono text-emerald-300">{(asset.trimStart || 0).toFixed(1)}s</span>
              </div>
              <input
                aria-label={`Part ${part.number} clip start`}
                className="w-full accent-emerald-500 cursor-pointer"
                type="range"
                min="0"
                max={Math.max(0, asset.sourceDurationSec - partDuration)}
                step="0.1"
                value={asset.trimStart || 0}
                disabled={busy}
                onPointerDown={onTrimStart}
                onChange={event => onTrim?.(parseFloat(event.target.value))}
              />
            </label>
          )}
        </div>
      )}
    </section>
  )
}
