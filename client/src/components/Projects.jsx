import { useState, useEffect } from 'react'
import { FolderOpen, Sparkles, Trash2, Clock, RefreshCw, Download, AlertCircle } from 'lucide-react'
import { fetchProjects, deleteProject } from '../services/api'

export default function Projects({ onOpenEditor }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchProjects()
      setProjects(data)
    } catch (err) {
      setError('Could not load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    await deleteProject(id)
    setProjects(projects.filter(p => p.id !== id))
  }

  const formatDate = (ts) => {
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return 'Unknown date'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
          <FolderOpen className="w-5 h-5 text-brand-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-white">My Projects</h2>
          <p className="text-xs text-slate-400">Saved reel projects, edit packages and export jobs</p>
        </div>
        <button onClick={loadProjects} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 flex items-center gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(3).fill(0).map((_, i) => <div key={i} className="glass rounded-2xl h-80 animate-pulse" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <FolderOpen className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No projects yet</p>
          <p className="text-xs text-slate-500 mb-4">
            Select a trending reel and open the AI Editor to start your first project.
            Saved projects will appear here and persist through the backend.
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            {['Marketing Hack', 'Behind the Scenes', 'Product Showcase'].map(t => (
              <span key={t} className="px-3 py-1 rounded-lg bg-white/5 text-xs text-slate-400">{t}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            const sourceVideo = project.sourceVideo || project.reel || project
            return (
              <div key={project.id} className="glass rounded-2xl overflow-hidden flex flex-col group">
                <div className="relative aspect-[9/16] overflow-hidden">
                  <img src={project.thumbnail || sourceVideo.thumbnail} alt={project.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <span className={`platform-badge platform-${project.platform || sourceVideo.platform} absolute top-2 left-2`}>
                    {project.platform || sourceVideo.platform}
                  </span>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-red-500/80 flex items-center justify-center transition"
                    title="Delete project"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  </button>
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-xs text-white/80 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDate(project.savedAt || project.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <p className="text-sm font-medium text-white line-clamp-2">{project.title}</p>
                  <p className="text-[10px] text-slate-500 line-clamp-2">
                    {project.edits?.textOverlays?.length || 0} text overlay(s) · Filter: {project.edits?.selectedFilter || 'original'}
                  </p>
                  <button
                    onClick={() => onOpenEditor(project)}
                    className="w-full py-2 rounded-lg bg-brand-600/20 hover:bg-brand-600/40 text-brand-300 hover:text-white text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3" /> Continue Editing
                  </button>
                  {project.lastExport?.exports?.[0]?.downloadUrl && (
                    <a href={project.lastExport.exports[0].downloadUrl} target="_blank" rel="noopener noreferrer" className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition flex items-center justify-center gap-1.5">
                      <Download className="w-3 h-3" /> Download Export Package
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
