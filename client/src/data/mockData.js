// Mock trending videos — used as fallback when backend APIs aren't configured
export const mockTrendingVideos = [
  {
    id: 'yt-001', platform: 'youtube', title: '10 Small Business Marketing Hacks That Actually Work',
    creator: '@BusinessGrowthLab', creatorUrl: 'https://youtube.com/@BusinessGrowthLab',
    thumbnail: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400',
    views: 2400000, likes: 185000, shares: 42000, comments: 8200, duration: '0:58',
    region: 'US', location: 'Los Angeles, California, US', category: 'business',
    url: 'https://youtube.com/shorts/example1', trendingRank: 1, uploadedAt: '2026-10-08',
    description: 'These marketing hacks took our small business from 0 to 100K followers...',
    tags: ['marketing', 'smallbusiness', 'growth', 'hacks']
  },
  {
    id: 'ig-001', platform: 'instagram', title: 'Day in the life of a bakery owner',
    creator: '@sweetcrumbsbakery', creatorUrl: 'https://instagram.com/sweetcrumbsbakery',
    thumbnail: 'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=400',
    views: 5800000, likes: 432000, shares: 89000, comments: 12300, duration: '0:28',
    region: 'US', location: 'Brooklyn, New York, US', category: 'fnb',
    url: 'https://instagram.com/reels/example1', trendingRank: 2, uploadedAt: '2026-10-09',
    description: 'A day in our bakery! From 4am prep to closing time...',
    tags: ['bakery', 'food', 'dayinthelife', 'smallbusiness']
  },
  {
    id: 'tt-001', platform: 'tiktok', title: 'How I turned $50 into a thriving boutique',
    creator: '@stylebysara', creatorUrl: 'https://tiktok.com/@stylebysara',
    thumbnail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
    views: 12000000, likes: 980000, shares: 234000, comments: 45600, duration: '0:45',
    region: 'US', location: 'Miami, Florida, US', category: 'business',
    url: 'https://tiktok.com/@stylebysara/video/example1', trendingRank: 3, uploadedAt: '2026-10-07',
    description: 'From $50 to $50K in 6 months. Here\'s how...',
    tags: ['business', 'fashion', 'boutique', 'entrepreneur']
  },
  {
    id: 'yt-002', platform: 'youtube', title: 'The Real Cost of Starting a Coffee Shop',
    creator: '@CafeInsider', creatorUrl: 'https://youtube.com/@CafeInsider',
    thumbnail: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400',
    views: 1800000, likes: 134000, shares: 31000, comments: 6700, duration: '1:12',
    region: 'US', location: 'Seattle, Washington, US', category: 'fnb',
    url: 'https://youtube.com/shorts/example2', trendingRank: 4, uploadedAt: '2026-10-06',
    description: 'I break down every single cost of opening my coffee shop...',
    tags: ['coffee', 'business', 'costs', 'startup']
  },
  {
    id: 'ig-002', platform: 'instagram', title: '3 DIY packaging ideas for small businesses',
    creator: '@craftandco', creatorUrl: 'https://instagram.com/craftandco',
    thumbnail: 'https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=400',
    views: 3200000, likes: 287000, shares: 67000, comments: 9800, duration: '0:35',
    region: 'US', location: 'Austin, Texas, US', category: 'business',
    url: 'https://instagram.com/reels/example2', trendingRank: 5, uploadedAt: '2026-10-09',
    description: 'Eco-friendly packaging ideas that customers love...',
    tags: ['packaging', 'diy', 'smallbusiness', 'eco']
  },
  {
    id: 'tt-002', platform: 'tiktok', title: 'Customer reaction when I surprised them with free upgrade',
    creator: '@techfixpro', creatorUrl: 'https://tiktok.com/@techfixpro',
    thumbnail: 'https://images.unsplash.com/photo-1581091226825-a6a2a547ee50?w=400',
    views: 8900000, likes: 720000, shares: 156000, comments: 32100, duration: '0:22',
    region: 'US', location: 'San Francisco, California, US', category: 'car',
    url: 'https://tiktok.com/@techfixpro/video/example2', trendingRank: 6, uploadedAt: '2026-10-08',
    description: 'His reaction made my whole week!',
    tags: ['customer', 'reaction', 'car', 'repair']
  },
  {
    id: 'yt-003', platform: 'youtube', title: 'I tried selling on Instagram for 30 days — here\'s what happened',
    creator: '@ecommercewithjen', creatorUrl: 'https://youtube.com/@ecommercewithjen',
    thumbnail: 'https://images.unsplash.com/photo-1556742393-d75f468bfcb0?w=400',
    views: 3600000, likes: 298000, shares: 78000, comments: 14500, duration: '0:52',
    region: 'US', location: 'Chicago, Illinois, US', category: 'business',
    url: 'https://youtube.com/shorts/example3', trendingRank: 7, uploadedAt: '2026-10-05',
    description: '30-day Instagram selling challenge results...',
    tags: ['instagram', 'selling', 'ecommerce', 'challenge']
  },
  {
    id: 'ig-003', platform: 'instagram', title: 'Behind the scenes: Making our signature product',
    creator: '@handmadewithlove', creatorUrl: 'https://instagram.com/handmadewithlove',
    thumbnail: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=400',
    views: 4100000, likes: 356000, shares: 92000, comments: 11200, duration: '0:40',
    region: 'US', location: 'Portland, Oregon, US', category: 'fnb',
    url: 'https://instagram.com/reels/example3', trendingRank: 8, uploadedAt: '2026-10-10',
    description: 'Ever wonder how our products are made? Take a peek...',
    tags: ['handmade', 'behindthescenes', 'process', 'artisan']
  },
  {
    id: 'tt-003', platform: 'tiktok', title: 'Packing orders ASMR — small business edition',
    creator: '@thelittleshop', creatorUrl: 'https://tiktok.com/@thelittleshop',
    thumbnail: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400',
    views: 6500000, likes: 540000, shares: 123000, comments: 22100, duration: '0:30',
    region: 'US', location: 'Denver, Colorado, US', category: 'business',
    url: 'https://tiktok.com/@thelittleshop/video/example3', trendingRank: 9, uploadedAt: '2026-10-09',
    description: 'Order packing ASMR! Which one was your favorite?',
    tags: ['asmr', 'packing', 'orders', 'smallbusiness']
  },
  {
    id: 'yt-004', platform: 'youtube', title: '5 mistakes new salon owners make (and how to avoid them)',
    creator: '@SalonSuccessTV', creatorUrl: 'https://youtube.com/@SalonSuccessTV',
    thumbnail: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
    views: 950000, likes: 78000, shares: 18000, comments: 4200, duration: '1:05',
    region: 'US', location: 'Houston, Texas, US', category: 'car',
    url: 'https://youtube.com/shorts/example4', trendingRank: 10, uploadedAt: '2026-10-04',
    description: 'Avoid these costly mistakes when opening your salon...',
    tags: ['salon', 'beauty', 'mistakes', 'advice']
  },
  {
    id: 'ig-004', platform: 'instagram', title: 'Transformation Tuesday: Before & After our service',
    creator: '@glowupstudio', creatorUrl: 'https://instagram.com/glowupstudio',
    thumbnail: 'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=400',
    views: 7200000, likes: 612000, shares: 145000, comments: 18900, duration: '0:18',
    region: 'US', location: 'Las Vegas, Nevada, US', category: 'car',
    url: 'https://instagram.com/reels/example4', trendingRank: 11, uploadedAt: '2026-10-08',
    description: 'The glow up is REAL! Book your appointment today.',
    tags: ['transformation', 'beauty', 'beforeandafter', 'glowup']
  },
  {
    id: 'tt-004', platform: 'tiktok', title: 'How I get 1000s of orders without ads — organic growth',
    creator: '@marketingwithmike', creatorUrl: 'https://tiktok.com/@marketingwithmike',
    thumbnail: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400',
    views: 15000000, likes: 1200000, shares: 340000, comments: 67000, duration: '0:58',
    region: 'US', location: 'Phoenix, Arizona, US', category: 'business',
    url: 'https://tiktok.com/@marketingwithmike/video/example4', trendingRank: 12, uploadedAt: '2026-10-06',
    description: 'No ads, just organic growth. Here\'s my exact strategy...',
    tags: ['organic', 'growth', 'marketing', 'noads']
  },
  {
    id: 'yt-005', platform: 'youtube', title: 'Best car detailing transformation you will see today',
    creator: '@DetailKing', creatorUrl: 'https://youtube.com/@DetailKing',
    thumbnail: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1da?w=400',
    views: 4200000, likes: 356000, shares: 98000, comments: 15600, duration: '0:42',
    region: 'US', location: 'Detroit, Michigan, US', category: 'car',
    url: 'https://youtube.com/shorts/example5', trendingRank: 13, uploadedAt: '2026-10-10',
    description: 'Watch this insane car detailing transformation...',
    tags: ['car', 'detailing', 'transformation', 'asmr']
  },
  {
    id: 'ig-005', platform: 'instagram', title: 'Street food vendor makes 500 meals a day',
    creator: '@streetfoodlegends', creatorUrl: 'https://instagram.com/streetfoodlegends',
    thumbnail: 'https://images.unsplash.com/photo-1565299624946-b28f6305b29f?w=400',
    views: 8300000, likes: 678000, shares: 134000, comments: 23400, duration: '0:33',
    region: 'US', location: 'New York, New York, US', category: 'fnb',
    url: 'https://instagram.com/reels/example5', trendingRank: 14, uploadedAt: '2026-10-10',
    description: '500 meals a day! This street food vendor is incredible...',
    tags: ['food', 'streetfood', 'fnb', 'viral']
  },
  {
    id: 'tt-005', platform: 'tiktok', title: 'Mechanic shows what really goes on in the garage',
    creator: '@garagetales', creatorUrl: 'https://tiktok.com/@garagetales',
    thumbnail: 'https://images.unsplash.com/photo-1487754180451-c456fdee0617?w=400',
    views: 9700000, likes: 812000, shares: 198000, comments: 38700, duration: '0:38',
    region: 'US', location: 'Columbus, Ohio, US', category: 'car',
    url: 'https://tiktok.com/@garagetales/video/example5', trendingRank: 15, uploadedAt: '2026-10-09',
    description: 'What really happens in the garage...',
    tags: ['car', 'mechanic', 'garage', 'behindthescenes']
  }
]

// Curated suggested reels — top picks for SMEs
export const mockSuggestedReels = [
  {
    id: 'sug-001', sourceVideo: mockTrendingVideos[0],
    title: 'Replicate this marketing hack for your business',
    reason: 'High engagement + adaptable to multiple industries',
    adaptabilityScore: 95, suggestedFor: ['all', 'fnb', 'car'],
    template: 'Hook -> Problem -> Quick Solution -> CTA'
  },
  {
    id: 'sug-002', sourceVideo: mockTrendingVideos[2],
    title: 'Tell your origin story — people love rags-to-riches',
    reason: 'Storytelling format works across all SME types',
    adaptabilityScore: 92, suggestedFor: ['all', 'fnb', 'car'],
    template: 'Bold claim -> Journey montage -> Results reveal -> CTA'
  },
  {
    id: 'sug-003', sourceVideo: mockTrendingVideos[8],
    title: 'ASMR order packing — low effort, high engagement',
    reason: 'Zero scripting needed. Just film and post.',
    adaptabilityScore: 88, suggestedFor: ['all', 'fnb'],
    template: 'Setup shot -> Packing sequence -> Customer note -> CTA'
  },
  {
    id: 'sug-004', sourceVideo: mockTrendingVideos[10],
    title: 'Before & After transformations for your service',
    reason: 'Visual proof builds trust instantly',
    adaptabilityScore: 90, suggestedFor: ['all', 'car'],
    template: 'Before shot -> Transformation -> After reveal -> CTA'
  },
  {
    id: 'sug-005', sourceVideo: mockTrendingVideos[4],
    title: 'Listicle format: "3 ways to..." for your industry',
    reason: 'Listicle format gets saved and shared 3x more',
    adaptabilityScore: 87, suggestedFor: ['all', 'fnb', 'car'],
    template: 'Hook -> Tip 1 -> Tip 2 -> Tip 3 -> Recap + CTA'
  },
  {
    id: 'sug-006', sourceVideo: mockTrendingVideos[7],
    title: 'Behind the scenes of your business',
    reason: 'Authenticity drives engagement. Show your process.',
    adaptabilityScore: 93, suggestedFor: ['all', 'fnb', 'car'],
    template: 'Intro -> Process montage -> Finished product -> CTA'
  }
]

export const platformInfo = {
  youtube: { name: 'YouTube Shorts', color: '#ff0000', icon: 'youtube' },
  instagram: { name: 'Instagram Reels', color: '#dc2743', icon: 'instagram' },
  tiktok: { name: 'TikTok', color: '#000000', icon: 'tiktok' }
}

export const industryCategories = [
  { id: 'all', label: 'All Industries' },
  { id: 'fnb', label: 'Food & Beverage' },
  { id: 'car', label: 'Automotive' },
  { id: 'retail', label: 'Retail & E-commerce' },
  { id: 'beauty', label: 'Beauty & Wellness' },
  { id: 'services', label: 'Local Services' },
  { id: 'education', label: 'Education' },
  { id: 'health', label: 'Health & Fitness' },
  { id: 'real-estate', label: 'Real Estate' },
  { id: 'travel', label: 'Travel & Hospitality' },
  { id: 'finance', label: 'Finance' },
  { id: 'technology', label: 'Technology' },
  { id: 'creative', label: 'Creative & Media' }
]

export const businessCategories = industryCategories

export const industryAliases = {
  business: ['business', 'retail', 'services', 'creative'],
  fnb: ['fnb', 'food', 'restaurant', 'cafe', 'bakery'],
  car: ['car', 'automotive', 'mechanic', 'detailing'],
  retail: ['retail', 'ecommerce', 'fashion', 'boutique', 'packaging'],
  beauty: ['beauty', 'salon', 'wellness', 'glowup'],
  services: ['services', 'repair', 'localbusiness'],
  education: ['education', 'course', 'training'],
  health: ['health', 'fitness', 'gym'],
  'real-estate': ['realestate', 'property', 'housing'],
  travel: ['travel', 'hotel', 'hospitality'],
  finance: ['finance', 'accounting', 'insurance'],
  technology: ['technology', 'tech', 'software'],
  creative: ['creative', 'media', 'content']
}

export const southeastAsiaCountries = [
  { id: 'all', label: 'All Countries' },
  { id: 'SG', label: 'Singapore' },
  { id: 'MY', label: 'Malaysia' },
  { id: 'ID', label: 'Indonesia' },
  { id: 'TH', label: 'Thailand' },
  { id: 'VN', label: 'Vietnam' },
  { id: 'PH', label: 'Philippines' },
  { id: 'BN', label: 'Brunei' },
  { id: 'KH', label: 'Cambodia' },
  { id: 'LA', label: 'Laos' },
  { id: 'MM', label: 'Myanmar' },
  { id: 'TL', label: 'Timor-Leste' },
  { id: 'US', label: 'United States' },
  { id: 'GB', label: 'United Kingdom' },
  { id: 'JP', label: 'Japan' },
  { id: 'KR', label: 'South Korea' },
  { id: 'IN', label: 'India' },
  { id: 'DE', label: 'Germany' },
  { id: 'BR', label: 'Brazil' }
]
