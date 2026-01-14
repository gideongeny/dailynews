import express from 'express';
import fetch from 'node-fetch';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import NEWS_CONFIG from './config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const IS_VERCEL = process.env.VERCEL === '1';

// ===========================
// News Cache
// ===========================
const newsCache = new Map();

function getCacheKey(type, params) {
    return `${type}_${JSON.stringify(params)}`;
}

function getCachedData(key) {
    const cached = newsCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
        console.log(`📦 Cache hit: ${key}`);
        return cached.data;
    }
    if (cached) {
        newsCache.delete(key);
    }
    return null;
}

function setCachedData(key, data) {
    newsCache.set(key, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + NEWS_CONFIG.CACHE_DURATION
    });
    console.log(`💾 Cached: ${key}`);
}

// ===========================
// News API Functions
// ===========================

async function fetchFromNewsData(params) {
    const apiKey = NEWS_CONFIG.NEWSDATA_API_KEYS[NEWS_CONFIG.CURRENT_API_INDEX];
    const url = new URL(NEWS_CONFIG.NEWSDATA_BASE_URL);

    url.searchParams.append('apikey', apiKey);
    url.searchParams.append('language', NEWS_CONFIG.DEFAULT_LANGUAGE);

    if (params.country) url.searchParams.append('country', params.country);
    if (params.category) url.searchParams.append('category', params.category);
    if (params.q) url.searchParams.append('q', params.q);

    console.log(`🌐 Fetching from NewsData: ${url.toString().replace(apiKey, 'API_KEY')}`);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status === 'success' && data.results) {
        return data.results.map(article => ({
            id: article.article_id || Math.random().toString(36).slice(2, 11),
            title: article.title,
            description: article.description || article.content || 'No description available',
            content: article.content || article.description || '',
            url: article.link,
            image: article.image_url || '/images/no-image.png',
            publishedAt: article.pubDate,
            source: article.source_id || 'Unknown',
            category: article.category?.[0] || params.category || 'general',
            author: article.creator?.[0] || 'Staff Writer',
            country: article.country?.[0] || params.country || 'global'
        }));
    }

    throw new Error(data.message || 'Failed to fetch from NewsData');
}

async function fetchFromTheNewsAPI(params) {
    const url = new URL(`${NEWS_CONFIG.THENEWSAPI_BASE_URL}/all`);

    url.searchParams.append('api_token', NEWS_CONFIG.THENEWSAPI_KEY);
    url.searchParams.append('language', NEWS_CONFIG.DEFAULT_LANGUAGE);
    url.searchParams.append('limit', '20');

    if (params.categories) url.searchParams.append('categories', params.categories);
    if (params.search) url.searchParams.append('search', params.search);

    console.log(`🌐 Fetching from TheNewsAPI: ${url.toString().replace(NEWS_CONFIG.THENEWSAPI_KEY, 'API_KEY')}`);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.data) {
        return data.data.map(article => ({
            id: article.uuid || Math.random().toString(36).slice(2, 11),
            title: article.title,
            description: article.description || 'No description available',
            content: article.description || '',
            url: article.url,
            image: article.image_url || '/images/no-image.png',
            publishedAt: article.published_at,
            source: article.source || 'Unknown',
            category: params.category || 'general',
            author: 'Staff Writer',
            country: params.country || 'global'
        }));
    }

    throw new Error('Failed to fetch from TheNewsAPI');
}

function getMockNews(category = 'general', count = 12) {
    const mockArticles = [
        {
            id: 'mock-1',
            title: 'Kenya Parliament Debates New Economic Reforms',
            description: 'Parliament members engage in heated debate over proposed economic reforms aimed at boosting GDP growth.',
            content: 'In a landmark session, Kenya\'s Parliament discussed comprehensive economic reforms...',
            url: '#',
            image: '/images/Kenya Parliament.jpg',
            publishedAt: new Date().toISOString(),
            source: 'Daily News',
            category: 'politics',
            author: 'Political Desk',
            country: 'ke'
        },
        {
            id: 'mock-2',
            title: 'Revolutionary AI App Transforms Accessibility',
            description: 'Kenyan developers launch groundbreaking AI application that translates speech to sign language in real-time.',
            content: 'A team of innovative Kenyan developers has created an AI-powered application...',
            url: '#',
            image: '/images/Kenyan AI app translates speech to sign language.jpg',
            publishedAt: new Date(Date.now() - 3600000).toISOString(),
            source: 'Tech Daily',
            category: 'technology',
            author: 'Tech Reporter',
            country: 'ke'
        },
        {
            id: 'mock-3',
            title: 'Olunga Shatters National Record in 100m Sprint',
            description: 'Star athlete sets new national record, raising hopes for upcoming international competitions.',
            content: 'In a stunning display of athletic prowess, Olunga broke the long-standing national record...',
            url: '#',
            image: '/images/Olunga sets national record in 100 m.jpg',
            publishedAt: new Date(Date.now() - 7200000).toISOString(),
            source: 'Sports Weekly',
            category: 'sports',
            author: 'Sports Desk',
            country: 'ke'
        },
        {
            id: 'mock-4',
            title: 'Specialty Coffee Exports Reach Record High',
            description: 'Kenya\'s specialty coffee industry experiences unprecedented growth, boosting export revenues.',
            content: 'The specialty coffee sector in Kenya has achieved remarkable success this quarter...',
            url: '#',
            image: '/images/Specialty coffee boosts Kenyan output.jpg',
            publishedAt: new Date(Date.now() - 10800000).toISOString(),
            source: 'Business Today',
            category: 'business',
            author: 'Business Reporter',
            country: 'ke'
        },
        {
            id: 'mock-5',
            title: 'Maasai Olympics Empower Women Through Sports',
            description: 'Traditional games create new opportunities for women in Maasai communities.',
            content: 'The Maasai Olympics initiative continues to break barriers and empower women...',
            url: '#',
            image: '/images/Maasai Olympics empower women.webp',
            publishedAt: new Date(Date.now() - 14400000).toISOString(),
            source: 'Culture Magazine',
            category: 'culture',
            author: 'Culture Correspondent',
            country: 'ke'
        },
        {
            id: 'mock-6',
            title: 'New Generation of Maasai Warriors Embrace Change',
            description: 'Young Maasai warriors balance traditional practices with modern education and values.',
            content: 'A new generation of Maasai warriors is redefining what it means to preserve culture...',
            url: '#',
            image: '/images/New generation of Maasai warriors.jpg',
            publishedAt: new Date(Date.now() - 18000000).toISOString(),
            source: 'Heritage Today',
            category: 'culture',
            author: 'Heritage Writer',
            country: 'ke'
        },
        {
            id: 'mock-7',
            title: 'Nyayo Stadium Ready for CHAN and AFCON',
            description: 'Major renovations complete as stadium prepares to host continental tournaments.',
            content: 'After extensive renovations, Nyayo Stadium is now ready to host major tournaments...',
            url: '#',
            image: '/images/Nyayo Stadium ready for CHAN and AFCON.jpg',
            publishedAt: new Date(Date.now() - 21600000).toISOString(),
            source: 'Sports Infrastructure',
            category: 'sports',
            author: 'Infrastructure Reporter',
            country: 'ke'
        },
        {
            id: 'mock-8',
            title: 'Safaricom Rolls Out 5G Across Major Cities',
            description: 'Telecommunications giant expands 5G network coverage to improve connectivity.',
            content: 'Safaricom has announced the successful rollout of 5G technology across Kenya...',
            url: '#',
            image: '/images/Safaricom rolls out 5G across Kenya.jpg',
            publishedAt: new Date(Date.now() - 25200000).toISOString(),
            source: 'Tech News',
            category: 'technology',
            author: 'Tech Correspondent',
            country: 'ke'
        },
        {
            id: 'mock-9',
            title: 'World Bank Approves Infrastructure Funding',
            description: 'Major infrastructure projects receive financial backing from international institutions.',
            content: 'The World Bank has approved significant funding for infrastructure development...',
            url: '#',
            image: '/images/no-image.png',
            publishedAt: new Date(Date.now() - 28800000).toISOString(),
            source: 'Economic Times',
            category: 'economy',
            author: 'Economic Analyst',
            country: 'ke'
        },
        {
            id: 'mock-10',
            title: 'Kenyans Celebrate New Year with Traditional Nyama Choma',
            description: 'Communities across the country ring in the new year with traditional celebrations.',
            content: 'As the new year begins, Kenyans gather for traditional nyama choma celebrations...',
            url: '#',
            image: '/images/Kenyans ring in New Year with nyama choma.jpg',
            publishedAt: new Date(Date.now() - 32400000).toISOString(),
            source: 'Lifestyle Magazine',
            category: 'entertainment',
            author: 'Lifestyle Writer',
            country: 'ke'
        },
        {
            id: 'mock-11',
            title: 'Gen-Z Activists Rally After Blogger\'s Death',
            description: 'Young activists demand justice and accountability in nationwide demonstrations.',
            content: 'Following the tragic death of a prominent blogger, Gen-Z activists have mobilized...',
            url: '#',
            image: '/images/Gen‑Z rallies after blogger\'s death.jpg',
            publishedAt: new Date(Date.now() - 36000000).toISOString(),
            source: 'Social Affairs',
            category: 'politics',
            author: 'Social Reporter',
            country: 'ke'
        },
        {
            id: 'mock-12',
            title: 'Healthcare Innovation Improves Rural Access',
            description: 'New mobile health clinics bring medical services to remote communities.',
            content: 'A groundbreaking healthcare initiative is bringing medical services to rural areas...',
            url: '#',
            image: '/images/no-image.png',
            publishedAt: new Date(Date.now() - 39600000).toISOString(),
            source: 'Health Weekly',
            category: 'health',
            author: 'Health Reporter',
            country: 'ke'
        }
    ];

    if (category && category !== 'general' && category !== 'all') {
        return mockArticles.filter(a => a.category === category).slice(0, count);
    }

    return mockArticles.slice(0, count);
}

async function fetchFromMediastack(params) {
    const url = new URL(NEWS_CONFIG.MEDIASTACK_BASE_URL);
    url.searchParams.append('access_key', NEWS_CONFIG.MEDIASTACK_KEY);
    url.searchParams.append('languages', 'en');
    url.searchParams.append('limit', '25');

    if (params.category) url.searchParams.append('categories', params.category);
    if (params.country && params.country !== 'global') url.searchParams.append('countries', params.country);
    if (params.q) url.searchParams.append('keywords', params.q);

    console.log(`🌐 Fetching from Mediastack: ${url.toString().replace(NEWS_CONFIG.MEDIASTACK_KEY, 'API_KEY')}`);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.data) {
        return data.data.map(article => ({
            id: Math.random().toString(36).slice(2, 11),
            title: article.title,
            description: article.description || 'No description available',
            content: article.description || '', // Mediastack often doesn't give full content
            url: article.url,
            image: article.image || '/images/no-image.png',
            publishedAt: article.published_at,
            source: article.source || 'Mediastack',
            category: article.category || params.category || 'general',
            author: article.author || 'Staff Writer',
            country: article.country || params.country || 'global'
        }));
    }
    throw new Error('Failed to fetch from Mediastack');
}

async function fetchFromNYTimes(params) {
    // NYTimes has different endpoints for Search vs Top Stories
    // For specific search/category we use Search API, for general/home we use Top Stories
    let url;
    if (params.q) {
        url = new URL('https://api.nytimes.com/svc/search/v2/articlesearch.json');
        url.searchParams.append('q', params.q);
    } else {
        const section = params.category === 'politics' ? 'politics' :
            params.category === 'business' ? 'business' :
                params.category === 'sports' ? 'sports' : 'home';
        url = new URL(`https://api.nytimes.com/svc/topstories/v2/${section}.json`);
    }

    url.searchParams.append('api-key', NEWS_CONFIG.NYTIMES_KEY);

    console.log(`🌐 Fetching from NYTimes: ${url.toString().replace(NEWS_CONFIG.NYTIMES_KEY, 'API_KEY')}`);

    const response = await fetch(url.toString());
    const data = await response.json();

    let articles = [];
    if (data.results) {
        // Top Stories format
        articles = data.results;
    } else if (data.response && data.response.docs) {
        // Article Search format
        articles = data.response.docs;
    }

    if (articles.length > 0) {
        return articles.map(article => {
            const multimedia = article.multimedia || article.media;
            let imageUrl = '/images/no-image.png';

            if (multimedia && multimedia.length > 0) {
                // NYTimes Search API returns relative paths sometimes, Top Stories returns absolute
                const firstMedia = multimedia[0];
                if (firstMedia.url) {
                    imageUrl = firstMedia.url.startsWith('http') ? firstMedia.url : `https://static01.nyt.com/${firstMedia.url}`;
                }
            }

            return {
                id: article._id || Math.random().toString(36).slice(2, 11),
                title: article.title || article.headline?.main,
                description: article.abstract || article.snippet || 'No description available',
                content: article.lead_paragraph || '',
                url: article.url || article.web_url,
                image: imageUrl,
                publishedAt: article.published_date || article.pub_date || new Date().toISOString(),
                source: 'New York Times',
                category: article.section_name || params.category || 'general',
                author: article.byline?.original || 'NYTimes Staff',
                country: 'us'
            };
        });
    }
    throw new Error('Failed to fetch from NYTimes');
}

async function fetchNews(params) {
    const cacheKey = getCacheKey('news', params);
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    console.log('📡 Fetching news from multiple sources...');

    // Execute all fetches in parallel
    const results = await Promise.allSettled([
        fetchFromNewsData(params),
        fetchFromTheNewsAPI(params),
        fetchFromMediastack(params),
        fetchFromNYTimes(params)
    ]);

    let aggregatedArticles = [];

    // Process results
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            console.log(`✅ Source ${index + 1} success: ${result.value.length} articles`);
            aggregatedArticles = [...aggregatedArticles, ...result.value];
        } else {
            console.error(`❌ Source ${index + 1} failed: ${result.reason.message}`);
        }
    });

    // Remove duplicates based on title (simple fuzzy match or exact match)
    const uniqueArticles = Array.from(new Map(aggregatedArticles.map(item => [item.title, item])).values());

    // Shuffle simple to mix sources or sort by date
    const sortedArticles = uniqueArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    if (sortedArticles.length > 0) {
        setCachedData(cacheKey, sortedArticles);
        NEWS_CONFIG.REQUEST_COUNT++;
        return sortedArticles;
    }

    // Fallback to mock data if absolutely nothing returned
    if (NEWS_CONFIG.USE_MOCK_FALLBACK) {
        console.log('⚠️ All APIs failed or returned no data. Using mock data fallback.');
        const mockData = getMockNews(params.category, 20);
        setCachedData(cacheKey, mockData);
        return mockData;
    }

    throw new Error('All news sources failed');
}

// ===========================
// Middleware
// ===========================

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Serve static files with proper MIME types
app.use(express.static(__dirname, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
        } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        }
    }
}));

// Explicit routes for CSS and JS
app.get('/style.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.sendFile(path.join(__dirname, 'style.css'));
});

app.get('/script.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.sendFile(path.join(__dirname, 'script.js'));
});

app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(express.json());

// ===========================
// Routes
// ===========================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve index.html for all category and article routes (SPA)
app.get('/category/:name', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/article/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/search', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/region/:name', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve index.html for static pages (SPA)
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/advertise', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/bookmarks', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Daily News API',
        requestCount: NEWS_CONFIG.REQUEST_COUNT,
        cacheSize: newsCache.size
    });
});

// Test route to verify CSS is accessible
app.get('/test-css', (req, res) => {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.sendFile(path.join(__dirname, 'style.css'), (err) => {
        if (err) {
            res.status(404).send('CSS file not found');
        }
    });
});

// ===========================
// API Endpoints
// ===========================

// Get news by category
app.get('/api/news/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const config = NEWS_CONFIG.CATEGORIES[category.toLowerCase()];

        if (!config) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid category'
            });
        }

        const params = {
            category: config.category,
            q: config.keywords,
            country: config.country
        };

        const articles = await fetchNews(params);

        res.json({
            status: 'success',
            category,
            count: articles.length,
            articles
        });
    } catch (error) {
        console.error('Category news error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch category news',
            error: error.message
        });
    }
});

// Get news by region
app.get('/api/news/region/:region', async (req, res) => {
    try {
        const { region } = req.params;
        const config = NEWS_CONFIG.REGIONS[region.toLowerCase()];

        if (!config) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid region'
            });
        }

        const params = {
            country: config.country,
            q: config.keywords
        };

        const articles = await fetchNews(params);

        res.json({
            status: 'success',
            region,
            count: articles.length,
            articles
        });
    } catch (error) {
        console.error('Region news error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch region news',
            error: error.message
        });
    }
});

// Get all news (homepage)
app.get('/api/news', async (req, res) => {
    try {
        const params = {
            country: 'ke', // Default to Kenya news
            category: null
        };

        const articles = await fetchNews(params);

        res.json({
            status: 'success',
            count: articles.length,
            articles
        });
    } catch (error) {
        console.error('News fetch error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch news',
            error: error.message
        });
    }
});

// Search articles
app.get('/api/search', async (req, res) => {
    try {
        const { q, category } = req.query;

        if (!q) {
            return res.status(400).json({
                status: 'error',
                message: 'Search query required'
            });
        }

        const params = {
            q,
            category: category || null
        };

        const articles = await fetchNews(params);

        res.json({
            status: 'success',
            query: q,
            count: articles.length,
            articles
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Search failed',
            error: error.message
        });
    }
});

// Get trending articles
app.get('/api/trending', async (req, res) => {
    try {
        const params = { country: 'ke' };
        const articles = await fetchNews(params);

        // Sort by date and take top 5
        const trending = articles
            .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
            .slice(0, 5);

        res.json({
            status: 'success',
            articles: trending
        });
    } catch (error) {
        console.error('Trending error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch trending',
            error: error.message
        });
    }
});

// Newsletter subscription
app.post('/api/subscribe', (req, res) => {
    const { email } = req.body;

    if (!email?.includes('@')) {
        return res.status(400).json({
            status: 'error',
            message: 'Valid email address is required'
        });
    }

    console.log(`📧 New newsletter subscription: ${email}`);

    res.json({
        status: 'success',
        message: 'Successfully subscribed to newsletter',
        email: email
    });
});

// Clear cache endpoint (for testing)
app.post('/api/cache/clear', (req, res) => {
    newsCache.clear();
    res.json({
        status: 'success',
        message: 'Cache cleared'
    });
});

// ===========================
// Error Handling
// ===========================

app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found',
        path: req.path
    });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ===========================
// Start Server
// ===========================

if (!IS_VERCEL && !process.env.FIREBASE_CONFIG) {
    app.listen(PORT, () => {
        console.log('');
        console.log('╔════════════════════════════════════════╗');
        console.log('║                                        ║');
        console.log('║         DAILY NEWS SERVER              ║');
        console.log('║         Multi-Page Edition             ║');
        console.log('║                                        ║');
        console.log('╚════════════════════════════════════════╝');
        console.log('');
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📰 Homepage: http://localhost:${PORT}`);
        console.log(`📁 Categories: http://localhost:${PORT}/category/sports`);
        console.log(`🌍 Regions: http://localhost:${PORT}/region/kenya`);
        console.log(`🔍 Search: http://localhost:${PORT}/search?q=economy`);
        console.log(`🔧 Health: http://localhost:${PORT}/health`);
        console.log('');
        console.log('📡 API Endpoints:');
        console.log('   GET /api/news');
        console.log('   GET /api/news/category/:category');
        console.log('   GET /api/news/region/:region');
        console.log('   GET /api/search?q=query');
        console.log('   GET /api/trending');
        console.log('');
        console.log('Press Ctrl+C to stop the server');
        console.log('');
    });

    process.on('SIGTERM', () => {
        console.log('SIGTERM signal received: closing HTTP server');
        process.exit(0);
    });

    process.on('SIGINT', () => {
        console.log('\nSIGINT signal received: closing HTTP server');
        process.exit(0);
    });
}

const handler = (req, res) => app(req, res);

export { app };
export default handler;
