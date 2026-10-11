import { useState } from 'react'
import {
  Sparkles, Coffee, ShoppingBag, Heart, Car, Laptop, Dumbbell,
  Palette, Check, ArrowRight, RefreshCw, X, Building2, Flame
} from 'lucide-react'

export const SURVEY_INDUSTRIES = [
  {
    id: 'fnb',
    name: 'Food & Beverage',
    icon: Coffee,
    badge: 'Trending #1 in Reels',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    types: ['Specialty Cafe', 'Artisan Bakery', 'Fast Casual Diner', 'Bubble Tea & Drinks'],
    sampleBrands: ['Artisan Brew & Bake', 'Velvet Bean Cafe', 'Daily Crust Bakery', 'The Matcha Lab'],
    hookPreview: 'POV: You just found the best signature roast in town...'
  },
  {
    id: 'retail',
    name: 'Retail & Fashion',
    icon: ShoppingBag,
    badge: 'Highest Viral Sharing',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    types: ['Boutique Apparel', 'Handmade Jewelry', 'Eco Lifestyle Goods', 'Footwear & Streetwear'],
    sampleBrands: ['Aura Studio Wear', 'Loom & Thread Co.', 'Solstice Handmade', 'Minimalist Wardrobe'],
    hookPreview: 'How to style our bestseller 3 different ways in 15s...'
  },
  {
    id: 'beauty',
    name: 'Beauty & Wellness',
    icon: Heart,
    badge: 'Highest Engagement',
    badgeColor: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    types: ['Organic Skincare', 'Hair & Nail Salon', 'Holistic Spa', 'Clean Cosmetics'],
    sampleBrands: ['Glow Botanicals', 'Luxe Lash & Brow Bar', 'Radiance Skin Lab', 'Serene Wellness Studio'],
    hookPreview: 'Transformation Tuesday: Watch this 15-second glow-up...'
  },
  {
    id: 'services',
    name: 'Automotive & Detailing',
    icon: Car,
    badge: 'Viral ASMR & Proof',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    types: ['Auto Detailing Studio', 'Custom Wrap & Tint', 'Precision Auto Repair', 'Mobile Car Wash'],
    sampleBrands: ['Apex Precision Detailing', 'HyperShine Auto Spa', 'RevLine Motors', 'Titan Ceramic Coating'],
    hookPreview: 'Watch this neglected ride get transformed in 15 seconds...'
  },
  {
    id: 'tech',
    name: 'Tech & Digital SME',
    icon: Laptop,
    badge: 'Fastest SME Growth',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    types: ['AI Productivity App', 'Digital Marketing Agency', 'Smart Hardware Shop', 'Web Design Studio'],
    sampleBrands: ['NovaPulse Digital', 'FlowState AI Tools', 'CyberCraft Tech', 'Pixel & Code Studio'],
    hookPreview: 'This 1 tool solved the biggest bottleneck in our business...'
  },
  {
    id: 'health',
    name: 'Fitness & Health',
    icon: Dumbbell,
    badge: 'High Save Rate',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    types: ['Boutique Gym & HIIT', 'Personal Coaching', 'Healthy Meal Prep', 'Yoga & Pilates Studio'],
    sampleBrands: ['IronPulse Fitness', 'Vitality Movement Lab', 'GreenFuel Kitchen', 'ZenCore Studio'],
    hookPreview: '3 fitness mistakes that are secretly sabotaging your gains...'
  },
  {
    id: 'creative',
    name: 'Handmade Crafts & Media',
    icon: Palette,
    badge: 'Process Video Viral',
    badgeColor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    types: ['Ceramics & Pottery', 'Custom Woodworking', 'Content Studio', 'Print & Stationery'],
    sampleBrands: ['Clay & Timber Workshop', 'Papercraft Press', 'Artisan Guild Works', 'Wildflower Studio'],
    hookPreview: 'Watch me make this bestseller completely from scratch...'
  }
]

export const DEFAULT_SURVEYED_PROFILE = {
  brandName: 'Artisan Brew & Bake',
  industry: 'Food & Beverage',
  businessType: 'Specialty Cafe & Bakery',
  email: 'hello@artisanbrew.com',
  surveyCompleted: true
}

export default function IndustrySurveyModal({ isOpen, onClose, onSave, currentProfile }) {
  if (!isOpen) return null

  const initialIndustry = SURVEY_INDUSTRIES.find(
    ind => ind.name.toLowerCase() === (currentProfile?.industry || '').toLowerCase()
  ) || SURVEY_INDUSTRIES[0]

  const [selectedIndustry, setSelectedIndustry] = useState(initialIndustry)
  const [selectedType, setSelectedType] = useState(
    currentProfile?.businessType || initialIndustry.types[0]
  )
  const [brandName, setBrandName] = useState(
    currentProfile?.brandName || initialIndustry.sampleBrands[0]
  )
  const [email, setEmail] = useState(
    currentProfile?.email || `contact@${initialIndustry.sampleBrands[0].toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
  )

  const handleSelectIndustry = (ind) => {
    setSelectedIndustry(ind)
    setSelectedType(ind.types[0])
    const newBrand = ind.sampleBrands[0]
    setBrandName(newBrand)
    setEmail(`contact@${newBrand.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`)
  }

  const shuffleBrand = () => {
    const list = selectedIndustry.sampleBrands
    const currentIndex = list.indexOf(brandName)
    const nextIndex = (currentIndex + 1) % list.length
    const nextBrand = list[nextIndex]
    setBrandName(nextBrand)
    setEmail(`contact@${nextBrand.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`)
  }

  const handleApply = () => {
    onSave({
      brandName: brandName.trim() || selectedIndustry.sampleBrands[0],
      industry: selectedIndustry.name,
      businessType: selectedType,
      email: email.trim(),
      surveyCompleted: true
    })
    onClose()
  }

  const handleQuickDefault = () => {
    onSave(DEFAULT_SURVEYED_PROFILE)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl glass rounded-2xl border border-brand-500/20 shadow-2xl p-6 md:p-8 my-8 text-white space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-brand-400" />
                Industry Trend Survey
              </span>
              <span className="text-xs text-slate-400">10-Second Setup</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white">
              What kind of business are you creating reels for?
            </h2>
            <p className="text-xs md:text-sm text-slate-400">
              We analyzed thousands of viral SME reels across YouTube, Instagram, and TikTok to personalize your hooks and video templates.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Industry Selection */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
            <span>1. Select Your Industry</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {SURVEY_INDUSTRIES.map((ind) => {
              const Icon = ind.icon
              const isSelected = selectedIndustry.id === ind.id
              return (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => handleSelectIndustry(ind)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-brand-600/20 border-brand-500 text-white shadow-lg shadow-brand-500/10'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-brand-500 text-white' : 'bg-white/10 text-slate-300'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-brand-400" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold leading-tight">{ind.name}</p>
                    <span className={`inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded border ${ind.badgeColor}`}>
                      {ind.badge}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Step 2: Fine-tune Niche / Business Type */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider font-semibold text-slate-400">
            2. Choose Your Specific Business Niche
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedIndustry.types.map((type) => {
              const active = selectedType === type
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                    active
                      ? 'bg-brand-500 text-white border-brand-400'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {type}
                </button>
              )
            })}
          </div>
        </div>

        {/* Step 3: Brand Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/10">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-slate-300">Brand Name</label>
              <button
                type="button"
                onClick={shuffleBrand}
                className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1"
                title="Generate another name"
              >
                <RefreshCw className="w-3 h-3" /> Suggest Name
              </button>
            </div>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Artisan Brew Co."
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1.5">Contact Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. hello@mybusiness.com"
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Viral Hook Preview */}
        <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-brand-300 uppercase tracking-wider">
              Survey-Tailored Viral Hook Preview:
            </p>
            <p className="text-xs text-slate-200 italic">
              "{selectedIndustry.hookPreview.replace('your brand', brandName)}"
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
          >
            <span>Save Profile & Start Creating</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleQuickDefault}
            className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition"
          >
            Use #1 Surveyed Default (Artisan Brew & Bake)
          </button>
        </div>
      </div>
    </div>
  )
}
