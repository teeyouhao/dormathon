import { useState, useEffect } from 'react'
import {
  Flame, Settings, Sparkles, Menu, X,
  FolderOpen, User, LogOut, Mail, Building2
} from 'lucide-react'
import TrendingFeed from './components/TrendingFeed'
import AIEditor from './components/AIEditor'
import SettingsPage from './components/Settings'
import Projects from './components/Projects'

const tabs = [
  { id: 'trending', label: 'Trending Feed', icon: Flame, description: 'Live trending reels from YouTube, Instagram & TikTok' },
  { id: 'projects', label: 'Projects', icon: FolderOpen, description: 'Saved reel projects and exports' },
  { id: 'settings', label: 'Settings', icon: Settings, description: 'Configure API keys, scraping, AI and backend options' }
]

export default function App() {
  const [activeTab, setActiveTab] = useState('trending')
  const [selectedReel, setSelectedReel] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [brandInfo, setBrandInfo] = useState({
    brandName: '',
    industry: '',
    businessType: '',
    email: ''
  })

  useEffect(() => {
    const saved = localStorage.getItem('viralReels_brand')
    if (saved) {
      try { setBrandInfo(JSON.parse(saved)) } catch {}
    }
  }, [])

  const saveBrandInfo = (info) => {
    setBrandInfo(info)
    localStorage.setItem('viralReels_brand', JSON.stringify(info))
  }

  const handleReelSelect = (reelOrProject) => {
    setSelectedReel(reelOrProject)
    setShowEditor(true)
    setSidebarOpen(false)
  }

  const closeEditor = () => {
    setShowEditor(false)
    setSelectedReel(null)
  }

  const activeTabInfo = tabs.find(t => t.id === activeTab) || tabs[0]

  return (
    <div className="min-h-screen flex bg-[#0f0f17]">
      <aside className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        fixed md:relative z-40 w-64 h-full md:h-screen flex-shrink-0
        glass border-r border-brand-500/10 transition-transform duration-300
        flex flex-col
      `}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">ViralReels</h1>
            <p className="text-[10px] text-brand-300 uppercase tracking-wider">AI Reels for SMEs</p>
          </div>
          <button className="md:hidden ml-auto text-slate-400" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSidebarOpen(false) }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${activeTab === tab.id
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="p-4 m-3 rounded-xl bg-white/5 border border-brand-500/10">
          <p className="text-[10px] uppercase tracking-wider text-brand-300 mb-2">Your Brand</p>
          {brandInfo.brandName ? (
            <div>
              <p className="text-sm font-semibold text-white">{brandInfo.brandName}</p>
              <p className="text-xs text-slate-400">{brandInfo.industry || 'No industry set'}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Set your brand from the profile or editor</p>
          )}
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="glass border-b border-brand-500/10 px-6 py-4 flex items-center gap-4 flex-shrink-0">
          <button className="md:hidden text-slate-400" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <activeTabInfo.icon className="w-5 h-5 text-brand-400" />
              <h2 className="text-lg font-semibold text-white">{activeTabInfo.label}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{activeTabInfo.description}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400 font-medium">Live</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition"
              title="Profile"
            >
              <User className="w-5 h-5" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-12 w-72 glass rounded-2xl border border-brand-500/10 p-4 z-50 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{brandInfo.brandName || 'SME Creator'}</p>
                    <p className="text-xs text-slate-400">{brandInfo.industry || 'Industry not set'}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500">Brand name</label>
                  <input
                    value={brandInfo.brandName}
                    onChange={e => saveBrandInfo({ ...brandInfo, brandName: e.target.value })}
                    placeholder="Your brand"
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white placeholder-slate-500"
                  />
                  <label className="text-[10px] uppercase tracking-wider text-slate-500">Industry</label>
                  <input
                    value={brandInfo.industry}
                    onChange={e => saveBrandInfo({ ...brandInfo, industry: e.target.value })}
                    placeholder="Food & Beverage, Automotive..."
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white placeholder-slate-500"
                  />
                  <label className="text-[10px] uppercase tracking-wider text-slate-500">Email</label>
                  <input
                    value={brandInfo.email || ''}
                    onChange={e => saveBrandInfo({ ...brandInfo, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white placeholder-slate-500"
                  />
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> SME account</span>
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {brandInfo.email ? 'Email set' : 'No email'}</span>
                </div>
                <button onClick={() => setProfileOpen(false)} className="w-full mt-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 flex items-center justify-center gap-1">
                  <LogOut className="w-3 h-3" /> Close Profile
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'trending' && <TrendingFeed onSelectReel={handleReelSelect} />}
          {activeTab === 'projects' && <Projects onOpenEditor={handleReelSelect} />}
          {activeTab === 'settings' && <SettingsPage />}
        </div>
      </main>

      {showEditor && selectedReel && (
        <AIEditor
          selectedReel={selectedReel}
          brandInfo={brandInfo}
          onSaveBrandInfo={saveBrandInfo}
          onReelChange={setSelectedReel}
          onClose={closeEditor}
        />
      )}
    </div>
  )
}
