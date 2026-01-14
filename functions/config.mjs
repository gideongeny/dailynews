// News API Configuration
// Add your API keys here

export const NEWS_CONFIG = {
    // NewsData.io API keys (primary)
    NEWSDATA_API_KEYS: [
        'pub_1d543e32d71f4487ba93652287a90acc',
        'pub_3646603378396593582030058e57976691461' // Backup key
    ],

    // The News API key
    THENEWSAPI_KEY: '2-Q_c0ydZgil3Ti859SjE1HiJxBJ6V4lQCNEUCJLJ0S65bfV',

    // New APIs
    MEDIASTACK_KEY: '0a9d0ac3bda30fdcd2bdc447e365320d',
    NYTIMES_KEY: 'HRdesBbmlbUI9b8laRNMAaGSvFEIa6dLhv4rWOP35WywiJGHqRmc2Pmb6QBARWxR',
    INFLIGHT_KEY: 'sk_03278df14e1dc82e69d9733cdca8032a674a9e4247ed230bd334a86a7ed8f8bb',

    // API Endpoints
    NEWSDATA_BASE_URL: 'https://newsdata.io/api/1/news',
    THENEWSAPI_BASE_URL: 'https://api.thenewsapi.com/v1/news',
    MEDIASTACK_BASE_URL: 'http://api.mediastack.com/v1/news',
    NYTIMES_BASE_URL: 'https://api.nytimes.com/svc/topstories/v2',

    // Cache settings
    CACHE_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds

    // Request settings
    MAX_ARTICLES_PER_REQUEST: 20,
    DEFAULT_LANGUAGE: 'en',

    // Regional settings
    REGIONS: {
        kenya: { country: 'ke', keywords: 'kenya' },
        africa: { keywords: 'africa' },
        world: { country: null, keywords: null }
    },

    // Category mappings
    CATEGORIES: {
        politics: { category: 'politics', keywords: 'politics,government,election' },
        economy: { category: 'business', keywords: 'economy,finance,market' },
        world: { category: 'world', keywords: 'international,global' },
        culture: { category: 'entertainment', keywords: 'culture,arts,heritage' },
        business: { category: 'business', keywords: 'business,company,trade' },
        sports: { category: 'sports', keywords: 'sports,football,athletics' },
        tech: { category: 'technology', keywords: 'technology,innovation,digital' },
        kenya: { country: 'ke', keywords: 'kenya' },
        africa: { keywords: 'africa,african' },
        fashion: { category: 'entertainment', keywords: 'fashion,style,design' },
        health: { category: 'health', keywords: 'health,medical,wellness' },
        entertainment: { category: 'entertainment', keywords: 'entertainment,celebrity,music,film' }
    },

    // Fallback to mock data if API fails
    USE_MOCK_FALLBACK: true,

    // Rate limiting
    CURRENT_API_INDEX: 0,
    REQUEST_COUNT: 0,
    DAILY_LIMIT: 200 // Conservative limit across all keys
};

export default NEWS_CONFIG;
