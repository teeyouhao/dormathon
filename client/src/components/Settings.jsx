import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Youtube, Instagram, Music2 as TiktokIcon, Save, Check, AlertCircle, Server, Database } from 'lucide-react'
import { getSettings, saveSettings, getHealth } from '../services/api'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    youtube: { apiKey: '' },
    instagram: { enabled: false, headless: true },
    tiktok: { enabled: false, headless: true },
    ai: { provider: 'openai', apiKey: '' },
    supabase: { url: '', table: 'reels', keyConfigured: false }
  })
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [health, setHealth] = useState({ status: 'checking', services: {} })

  useEffect(() => {
    Promise.all([getSettings(), getHealth()]).then(([data, healthData]) => {
      if (data) setSettings(data)
      if (healthData) setHealth(healthData)
      setLoaded(true)
    })
  }, [])

  const handleSave = async () => {
    await saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!loaded) return <div className="p-6"><p className="text-slate-400">Loading settings...</p></div>

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Server Status */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-5 h-5 text-brand-400" />
          <h3 className="text-sm font-semibold text-white">Backend Status</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 rounded-lg bg-white/5">
            <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${health.status === 'ok' ? 'bg-green-400' : 'bg-red-400'}`} />
            <p className="text-xs text-slate-400">API Server</p>
            <p className={`text-xs ${health.status === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{health.status === 'ok' ? 'Online' : 'Offline'}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/5">
            <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${health.services?.instagram || health.services?.tiktok ? 'bg-green-400' : 'bg-amber-400'}`} />
            <p className="text-xs text-slate-400">Scraper</p>
            <p className={`text-xs ${health.services?.instagram || health.services?.tiktok ? 'text-green-400' : 'text-amber-400'}`}>{health.services?.instagram || health.services?.tiktok ? 'Enabled' : 'Not Configured'}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/5">
            <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${health.services?.ai ? 'bg-green-400' : 'bg-amber-400'}`} />
            <p className="text-xs text-slate-400">AI Service</p>
            <p className={`text-xs ${health.services?.ai ? 'text-green-400' : 'text-amber-400'}`}>{health.services?.ai ? 'Connected' : 'Local Fallback'}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/5">
            <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${health.services?.supabase ? 'bg-green-400' : 'bg-amber-400'}`} />
            <p className="text-xs text-slate-400">Supabase</p>
            <p className={`text-xs ${health.services?.supabase ? 'text-green-400' : 'text-amber-400'}`}>{health.services?.supabase ? 'Connected' : 'Needs URL'}</p>
          </div>
        </div>
        <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-green-300">
            The app now uses functioning backend endpoints for trending data, projects, remix plans, edit packages and exports. External platform scraping can be enabled below when credentials/settings are ready.
          </p>
        </div>
      </div>

      {/* YouTube API */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Youtube className="w-5 h-5 text-red-400" />
          <h3 className="text-sm font-semibold text-white">YouTube Data API v3</h3>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-medium">Official API</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Get a free API key from the Google Cloud Console. Enable the YouTube Data API v3.
        </p>
        <input
          type="password"
          placeholder="Enter YouTube API Key"
          value={settings.youtube.apiKey}
          onChange={e => setSettings({ ...settings, youtube: { ...settings.youtube, apiKey: e.target.value } })}
          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-brand-500/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/40"
        />
        <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noopener noreferrer"
          className="text-xs text-brand-400 hover:text-brand-300 mt-2 inline-block">
          Get API Key from Google Cloud Console
        </a>
      </div>

      {/* Instagram Scraper */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Instagram className="w-5 h-5 text-pink-400" />
          <h3 className="text-sm font-semibold text-white">Instagram Scraper</h3>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-medium">DIY Scraping</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Uses Playwright headless browser to scrape Instagram trending reels. No official API — this is a custom scraper.
        </p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.instagram.enabled}
            onChange={e => setSettings({ ...settings, instagram: { ...settings.instagram, enabled: e.target.checked } })}
            className="accent-brand-500 w-4 h-4"
          />
          <span className="text-sm text-slate-300">Enable Instagram scraping</span>
        </label>
        {settings.instagram.enabled && (
          <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-300">
              Note: Instagram actively blocks scrapers. This may require periodic maintenance and could break. Use responsibly.
            </p>
          </div>
        )}
      </div>

      {/* TikTok Scraper */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TiktokIcon className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">TikTok Scraper</h3>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-medium">DIY Scraping</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Uses Playwright headless browser to scrape TikTok trending page. No official API — this is a custom scraper.
        </p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.tiktok.enabled}
            onChange={e => setSettings({ ...settings, tiktok: { ...settings.tiktok, enabled: e.target.checked } })}
            className="accent-brand-500 w-4 h-4"
          />
          <span className="text-sm text-slate-300">Enable TikTok scraping</span>
        </label>
        {settings.tiktok.enabled && (
          <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-300">
              Note: TikTok has aggressive anti-bot measures. Scraping may be unreliable and require proxy rotation.
            </p>
          </div>
        )}
      </div>

      {/* Supabase Storage */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Supabase Reel Storage</h3>
          <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium ${health.services?.supabase ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
            {health.services?.supabase ? 'Connected' : 'Configure URL'}
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Fetched reels are automatically upserted to your Supabase <code className="bg-black/30 px-1 rounded">reels</code> table when URL and key are configured. Service keys stay on the backend.
        </p>
        <input
          type="url"
          placeholder="https://your-project.supabase.co"
          value={settings.supabase?.url || ''}
          onChange={e => setSettings({ ...settings, supabase: { ...settings.supabase, url: e.target.value } })}
          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-brand-500/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/40 mb-3"
        />
        <input
          type="text"
          placeholder="reels"
          value={settings.supabase?.table || 'reels'}
          onChange={e => setSettings({ ...settings, supabase: { ...settings.supabase, table: e.target.value } })}
          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-brand-500/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/40"
        />
        <p className="text-[10px] text-slate-500 mt-2">
          Key status: {settings.supabase?.keyConfigured ? 'configured on backend' : 'not detected on backend'}
        </p>
      </div>

      {/* AI Provider */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <SettingsIcon className="w-5 h-5 text-brand-400" />
          <h3 className="text-sm font-semibold text-white">AI Provider (for Concept Generation)</h3>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          The AI concept generator works with a local fallback if no API key is provided. Configure for better results.
        </p>
        <select
          value={settings.ai.provider}
          onChange={e => setSettings({ ...settings, ai: { ...settings.ai, provider: e.target.value } })}
          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-brand-500/10 text-sm text-white focus:outline-none focus:border-brand-500/40 mb-3"
        >
          <option value="local" className="bg-slate-800">Local Fallback (No API key needed)</option>
          <option value="openai" className="bg-slate-800">OpenAI GPT-4</option>
          <option value="anthropic" className="bg-slate-800">Anthropic Claude</option>
        </select>
        {settings.ai.provider !== 'local' && (
          <input
            type="password"
            placeholder={`Enter ${settings.ai.provider === 'openai' ? 'OpenAI' : 'Anthropic'} API Key`}
            value={settings.ai.apiKey}
            onChange={e => setSettings({ ...settings, ai: { ...settings.ai, apiKey: e.target.value } })}
            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-brand-500/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/40"
          />
        )}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition flex items-center justify-center gap-2"
      >
        {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? 'Settings Saved!' : 'Save Settings'}
      </button>

      {/* Info */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-start gap-2">
          <Database className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-400 space-y-1">
            <p><strong className="text-slate-300">How it works:</strong></p>
            <p>1. YouTube trending uses the official Data API v3 (free, 10K requests/day)</p>
            <p>2. Instagram & TikTok use Playwright headless browser scraping (DIY, free, but fragile)</p>
            <p>3. AI concept generation uses LLM APIs or a local algorithmic fallback</p>
            <p>4. The app works with mock data even when no APIs are configured</p>
          </div>
        </div>
      </div>
    </div>
  )
}
