// ===========================
// Client-Side Router
// ===========================
console.log('✅ LOADING SCRIPT v1.1.1 [NEWEST]');

// ===========================
// Content Validation & Quality
// ===========================

// Category-specific placeholder images
const CATEGORY_PLACEHOLDERS = {
    politics: '/images/Kenya Parliament.jpg',
    business: '/images/World Bank.jpg',
    technology: '/images/Safaricom rolls out 5G across Kenya.jpg',
    sports: '/images/Olunga sets national record in 100 m.jpg',
    culture: '/images/Maasai Olympics empower women.webp',
    health: '/images/World Bank.jpg',
    general: '/images/World Bank.jpg',
    world: '/images/World Bank.jpg',
    entertainment: '/images/Kenyans ring in New Year with nyama choma.jpg'
};

function getCategoryPlaceholder(category) {
    return CATEGORY_PLACEHOLDERS[category?.toLowerCase()] || CATEGORY_PLACEHOLDERS.general;
}

function generateExcerpt(title, minLength = 50) {
    if (!title) return 'Read the full article for more details.';

    // If title is long enough, use it
    if (title.length >= minLength) {
        return title + '...';
    }

    // Otherwise, add context
    return `${title}. Click to read the full story and stay informed on the latest developments.`;
}

function validateArticle(article) {
    if (!article) return false;

    // Must have a title
    if (!article.title || article.title.trim().length < 10) {
        console.log('❌ [VALIDATION] Article rejected: title too short or missing');
        return false;
    }

    // Must have a URL
    if (!article.url || !article.url.startsWith('http')) {
        console.log('❌ [VALIDATION] Article rejected: invalid URL');
        return false;
    }

    // Description should exist and be meaningful
    if (!article.description || article.description.trim().length < 20) {
        console.log('⚠️ [VALIDATION] Article has short description, will generate fallback');
        article.description = generateExcerpt(article.title);
    }

    // Ensure image exists
    if (!article.image || article.image === 'null' || article.image === '') {
        console.log('⚠️ [VALIDATION] Article missing image, using category placeholder');
        article.image = getCategoryPlaceholder(article.category);
    }

    // Ensure category exists
    if (!article.category) {
        article.category = 'general';
    }

    // Ensure source exists
    if (!article.source) {
        article.source = 'News Source';
    }

    return true;
}

// HTML Sanitization & Text Cleanup
function stripHtmlTags(html) {
    if (!html) return '';
    // Create a temporary div to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}

function decodeHtmlEntities(text) {
    if (!text) return '';
    const temp = document.createElement('textarea');
    temp.innerHTML = text;
    return temp.value;
}

function cleanDescription(description) {
    if (!description) return '';

    // Decode HTML entities
    let cleaned = decodeHtmlEntities(description);

    // Strip HTML tags
    cleaned = stripHtmlTags(cleaned);

    // Remove excessive whitespace and newlines
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Remove "Continue reading..." and similar phrases
    cleaned = cleaned.replace(/Continue reading\.\.\.?$/i, '');
    cleaned = cleaned.replace(/Read more\.\.\.?$/i, '');
    cleaned = cleaned.replace(/\[\.\.\.]$/i, '');

    // Limit length
    if (cleaned.length > 200) {
        cleaned = cleaned.substring(0, 200).trim() + '...';
    }

    return cleaned.trim();
}

// Advanced Deduplication using Similarity Matching
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    // Convert to lowercase for comparison
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // Quick exact match
    if (s1 === s2) return 1;

    // Calculate Levenshtein distance (simplified)
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    // Simple word overlap similarity
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
}

function deduplicateArticles(articles) {
    const unique = [];
    const seenTitles = new Map();

    for (const article of articles) {
        let isDuplicate = false;

        // Check against existing articles
        for (const [existingTitle, existingArticle] of seenTitles) {
            const similarity = calculateSimilarity(article.title, existingTitle);

            // If similarity > 70%, consider it a duplicate
            if (similarity > 0.7) {
                isDuplicate = true;
                console.log(`🔄 [DEDUP] Skipping duplicate: "${article.title}" (similar to "${existingTitle}")`);
                break;
            }
        }

        if (!isDuplicate) {
            unique.push(article);
            seenTitles.set(article.title, article);
        }
    }

    console.log(`✅ [DEDUP] Kept ${unique.length} unique articles out of ${articles.length} total`);
    return unique;
}

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;

        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            this.loadRoute(window.location.pathname + window.location.search);
        });

        // Intercept link clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[href^="/"]') || e.target.closest('a[href^="/"]')) {
                const link = e.target.matches('a') ? e.target : e.target.closest('a');
                const href = link.getAttribute('href');

                if (href && href.startsWith('/') && !href.startsWith('//')) {
                    e.preventDefault();
                    this.navigate(href);
                }
            }
        });
    }

    addRoute(path, handler) {
        this.routes[path] = handler;
    }

    navigate(path) {
        window.history.pushState({}, '', path);
        this.loadRoute(path);
    }

    async loadRoute(path) {
        // Normalize index.html to /
        let [pathname, search] = path.split('?');
        if (pathname.endsWith('/index.html')) {
            pathname = pathname.replace(/\/index\.html$/, '/');
        } else if (pathname === 'index.html') {
            pathname = '/';
        }

        const params = new URLSearchParams(search);

        // Match route
        for (const [route, handler] of Object.entries(this.routes)) {
            const match = this.matchRoute(pathname, route);
            if (match) {
                this.currentRoute = route;
                await handler(match.params, params);
                window.scrollTo(0, 0);
                return;
            }
        }

        // 404
        this.show404();
    }

    matchRoute(pathname, route) {
        const routeParts = route.split('/').filter(Boolean);
        const pathParts = pathname.split('/').filter(Boolean);

        if (routeParts.length !== pathParts.length) {
            return null;
        }

        const params = {};

        for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith(':')) {
                params[routeParts[i].slice(1)] = pathParts[i];
            } else if (routeParts[i] !== pathParts[i]) {
                return null;
            }
        }

        return { params };
    }

    show404() {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="container">
                    <div class="error-404">
                        <h1>404 - Page Not Found</h1>
                        <p>The page you're looking for doesn't exist.</p>
                        <a href="/" class="btn-primary">Go Home</a>
                    </div>
                </div>
            `;
        }
    }
}

// ===========================
// API Helper Functions
// ===========================

async function fetchAPI(endpoint) {
    let response;
    try {
        showLoading();
        response = await fetch(endpoint);

        // If we get a non-OK response, throw to trigger fallback logic
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        // Check if content type is JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("API returned non-JSON response (likely a 404 HTML page)");
        }

        const data = await response.json();
        hideLoading();

        if (data.status === 'success') {
            return data;
        } else {
            throw new Error(data.message || 'API response status was not success');
        }
    } catch (error) {
        console.log('🚨 [TRACE] PRIMARY API FAILED. STARTING FALLBACK...', error.message);

        // Fallback: Fetch directly from multiple sources (Frontend Fallback)
        try {
            if (endpoint.includes('/api/news') || endpoint.includes('/api/trending')) {
                console.log('📡 [TRACE] Entering multi-source aggregation for:', endpoint);

                const newsDataApiKey = 'pub_1d543e32d71f4487ba93652287a90acc';
                const nyTimesApiKey = 'HRdesBbmlbUI9b8laRNMAaGSvFEIa6dLhv4rWOP35WywiJGHqRmc2Pmb6QBARWxR';
                const theNewsApiKey = '2-Q_c0ydZgil3Ti859SjE1HiJxBJ6V4lQCNEUCJLJ0S65bfV';

                // Construct NewsData URL
                let newsDataUrl = `https://newsdata.io/api/1/news?apikey=${newsDataApiKey}&language=en`;
                if (endpoint.includes('category/')) {
                    const category = endpoint.split('category/')[1];
                    newsDataUrl += `&category=${category}`;
                } else if (endpoint.includes('search?q=')) {
                    const query = endpoint.split('search?q=')[1];
                    newsDataUrl += `&q=${query}`;
                }

                // Construct NYTimes URL
                let nyTimesUrl = `https://api.nytimes.com/svc/topstories/v2/home.json?api-key=${nyTimesApiKey}`;
                if (endpoint.includes('category/')) {
                    const category = endpoint.split('category/')[1];
                    const section = category === 'politics' ? 'politics' :
                        category === 'business' ? 'business' :
                            category === 'sports' ? 'sports' : 'home';
                    nyTimesUrl = `https://api.nytimes.com/svc/topstories/v2/${section}.json?api-key=${nyTimesApiKey}`;
                }

                // Construct TheNewsAPI URL
                let theNewsUrl = `https://api.thenewsapi.com/v1/news/top?api_token=${theNewsApiKey}&locale=us&limit=5&language=en`;
                if (endpoint.includes('category/')) {
                    const category = endpoint.split('category/')[1];
                    theNewsUrl += `&categories=${category}`;
                } else if (endpoint.includes('search?q=')) {
                    const query = endpoint.split('search?q=')[1];
                    theNewsUrl += `&search=${query}`;
                }

                // RSS Feeds via rss2json proxy (No API keys needed!)
                const rssFeedsToFetch = [
                    'http://feeds.bbci.co.uk/news/world/rss.xml',           // BBC World News
                    'http://rss.cnn.com/rss/edition_world.rss',             // CNN World
                    'https://www.theguardian.com/world/rss',                // Guardian World
                    'https://www.aljazeera.com/xml/rss/all.xml',            // Al Jazeera
                    'https://feeds.reuters.com/reuters/topNews'             // Reuters Top News
                ];

                const rssProxyUrl = 'https://api.rss2json.com/v1/api.json?rss_url=';

                const safeFetchJson = (url) => fetch(url)
                    .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
                    .catch(e => {
                        console.log(`📡 [TRACE] Fetch failed for ${url.substring(0, 40)}... :`, e);
                        return null;
                    });

                const results = await Promise.all([
                    safeFetchJson(newsDataUrl),
                    safeFetchJson(nyTimesUrl),
                    safeFetchJson(theNewsUrl),
                    safeFetchJson(rssProxyUrl + encodeURIComponent(rssFeedsToFetch[0])), // BBC
                    safeFetchJson(rssProxyUrl + encodeURIComponent(rssFeedsToFetch[1])), // CNN
                    safeFetchJson(rssProxyUrl + encodeURIComponent(rssFeedsToFetch[2])), // Guardian
                    safeFetchJson(rssProxyUrl + encodeURIComponent(rssFeedsToFetch[3])), // Al Jazeera
                    safeFetchJson(rssProxyUrl + encodeURIComponent(rssFeedsToFetch[4]))  // Reuters
                ]);

                console.log('📊 [TRACE] API Results Summary:', results.map(r => r ? 'SUCCESS' : 'FAIL'));
                let aggregatedArticles = [];

                // Process NewsData
                if (results[0] && results[0].results) {
                    const newsDataArticles = results[0].results.map(a => ({
                        id: a.article_id || Math.random().toString(36).substr(2, 9),
                        title: a.title,
                        description: a.description || 'No description available',
                        content: a.content || a.description || '',
                        url: a.link,
                        image: a.image_url || '/images/World Bank.jpg',
                        publishedAt: a.pubDate || new Date().toISOString(),
                        source: a.source_id?.toUpperCase() || 'NEWSDATA',
                        category: a.category?.[0] || 'general',
                        author: a.creator?.[0] || 'Staff Writer'
                    }));
                    aggregatedArticles = [...aggregatedArticles, ...newsDataArticles];
                }

                // Process NYTimes
                if (results[1] && results[1].results) {
                    const nyTimesArticles = results[1].results.map(a => {
                        const multimedia = a.multimedia || [];
                        let imageUrl = '/images/World Bank.jpg';
                        if (multimedia.length > 0) imageUrl = multimedia[0].url;

                        return {
                            id: Math.random().toString(36).substr(2, 9),
                            title: a.title,
                            description: a.abstract || 'No description available',
                            content: a.abstract || '',
                            url: a.url,
                            image: imageUrl,
                            publishedAt: a.published_date || new Date().toISOString(),
                            source: 'THE NEW YORK TIMES',
                            category: a.section || 'world',
                            author: a.byline || 'NYT'
                        };
                    });
                    aggregatedArticles = [...aggregatedArticles, ...nyTimesArticles];
                }

                // Process TheNewsAPI
                if (results[2] && results[2].data) {
                    const theNewsArticles = results[2].data.map(a => ({
                        id: a.uuid,
                        title: a.title,
                        description: a.description || 'No description available',
                        content: a.content || '',
                        url: a.url,
                        image: a.image_url || '/images/World Bank.jpg',
                        publishedAt: a.published_at,
                        source: a.source?.toUpperCase() || 'THENEWSAPI',
                        category: a.categories?.[0] || 'general',
                        author: 'Reporter'
                    }));
                    aggregatedArticles = [...aggregatedArticles, ...theNewsArticles];
                }

                // Process BBC RSS (results[3])
                if (results[3] && results[3].items) {
                    const bbcArticles = results[3].items.slice(0, 10).map(a => ({
                        id: a.guid || Math.random().toString(36).substr(2, 9),
                        title: cleanDescription(a.title),
                        description: cleanDescription(a.description || a.content) || 'Read the full story on BBC News',
                        content: cleanDescription(a.content || a.description) || '',
                        url: a.link,
                        image: a.enclosure?.link || a.thumbnail || '/images/World Bank.jpg',
                        publishedAt: a.pubDate || new Date().toISOString(),
                        source: 'BBC NEWS',
                        category: 'world',
                        author: 'BBC News'
                    }));
                    aggregatedArticles = [...aggregatedArticles, ...bbcArticles];
                }

                // Process CNN RSS (results[4])
                if (results[4] && results[4].items) {
                    const cnnArticles = results[4].items.slice(0, 10).map(a => ({
                        id: a.guid || Math.random().toString(36).substr(2, 9),
                        title: cleanDescription(a.title),
                        description: cleanDescription(a.description || a.content) || 'Read the full story on CNN',
                        content: cleanDescription(a.content || a.description) || '',
                        url: a.link,
                        image: a.enclosure?.link || a.thumbnail || '/images/World Bank.jpg',
                        publishedAt: a.pubDate || new Date().toISOString(),
                        source: 'CNN',
                        category: 'world',
                        author: 'CNN'
                    }));
                    aggregatedArticles = [...aggregatedArticles, ...cnnArticles];
                }

                // Process Guardian RSS (results[5])
                if (results[5] && results[5].items) {
                    const guardianArticles = results[5].items.slice(0, 10).map(a => ({
                        id: a.guid || Math.random().toString(36).substr(2, 9),
                        title: cleanDescription(a.title),
                        description: cleanDescription(a.description || a.content) || 'Read the full story on The Guardian',
                        content: cleanDescription(a.content || a.description) || '',
                        url: a.link,
                        image: a.enclosure?.link || a.thumbnail || '/images/World Bank.jpg',
                        publishedAt: a.pubDate || new Date().toISOString(),
                        source: 'THE GUARDIAN',
                        category: 'world',
                        author: 'The Guardian'
                    }));
                    aggregatedArticles = [...aggregatedArticles, ...guardianArticles];
                }

                // Process Al Jazeera RSS (results[6])
                if (results[6] && results[6].items) {
                    const alJazeeraArticles = results[6].items.slice(0, 10).map(a => ({
                        id: a.guid || Math.random().toString(36).substr(2, 9),
                        title: cleanDescription(a.title),
                        description: cleanDescription(a.description || a.content) || 'Read the full story on Al Jazeera',
                        content: cleanDescription(a.content || a.description) || '',
                        url: a.link,
                        image: a.enclosure?.link || a.thumbnail || '/images/World Bank.jpg',
                        publishedAt: a.pubDate || new Date().toISOString(),
                        source: 'AL JAZEERA',
                        category: 'world',
                        author: 'Al Jazeera'
                    }));
                    aggregatedArticles = [...aggregatedArticles, ...alJazeeraArticles];
                }

                // Process Reuters RSS (results[7])
                if (results[7] && results[7].items) {
                    const reutersArticles = results[7].items.slice(0, 10).map(a => ({
                        id: a.guid || Math.random().toString(36).substr(2, 9),
                        title: cleanDescription(a.title),
                        description: cleanDescription(a.description || a.content) || 'Read the full story on Reuters',
                        content: cleanDescription(a.content || a.description) || '',
                        url: a.link,
                        image: a.enclosure?.link || a.thumbnail || '/images/World Bank.jpg',
                        publishedAt: a.pubDate || new Date().toISOString(),
                        source: 'REUTERS',
                        category: 'world',
                        author: 'Reuters'
                    }));
                    aggregatedArticles = [...aggregatedArticles, ...reutersArticles];
                }

                console.log('📈 [TRACE] Total Aggregated Articles (before validation):', aggregatedArticles.length);

                // Validate and filter articles
                aggregatedArticles = aggregatedArticles.filter(validateArticle);
                console.log('✅ [TRACE] Valid Articles After Filtering:', aggregatedArticles.length);

                // Deduplicate articles
                aggregatedArticles = deduplicateArticles(aggregatedArticles);

                hideLoading();

                if (aggregatedArticles.length > 0) {
                    console.log('✅ [TRACE] Returning aggregated articles.');
                    // Sort by date
                    aggregatedArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

                    // Basic de-duplication by title
                    const seenTitles = new Set();
                    aggregatedArticles = aggregatedArticles.filter(item => {
                        if (seenTitles.has(item.title)) return false;
                        seenTitles.add(item.title);
                        return true;
                    });

                    return {
                        status: 'success',
                        articles: aggregatedArticles
                    };
                }
                throw new Error('No results from any direct API');
            }

            // Final Fallback: Mock Data
            hideLoading();
            console.log('🧱 [TRACE] Fallback returned empty or wrong endpoint. Using mocks.');
            return {
                status: 'success',
                articles: getMockArticles(12),
                count: 12
            };
        } catch (fallbackError) {
            hideLoading();
            console.error('💣 [TRACE] FINAL FALLBACK ERROR:', fallbackError);
            return {
                status: 'success',
                articles: getMockArticles(12),
                count: 12
            };
        }
    }
}

// Minimal mock data generator for frontend fallback
function getMockArticles(count) {
    return Array.from({ length: count }, (_, i) => ({
        id: `mock-${i}`,
        title: `Example News Article ${i + 1}`,
        description: 'This is a fallback description shown because the backend API is currently unavailable. Please check your Firebase billing or proxy settings.',
        content: 'Full content unavailable in fallback mode.',
        url: '#',
        image: '/images/World Bank.jpg',
        publishedAt: new Date().toISOString(),
        source: 'Fallback System',
        category: 'general',
        author: 'System'
    }));
}

function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showError(message) {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <p>⚠️ ${message}</p>
            <button onclick="location.reload()">Retry</button>
        `;
        mainContent.insertBefore(errorDiv, mainContent.firstChild);

        setTimeout(() => errorDiv.remove(), 5000);
    }
}

// ===========================
// Live TV Channels
// ===========================

const LIVE_CHANNELS = [
    {
        name: 'Citizen TV Kenya',
        region: 'Kenya',
        language: 'English & Swahili',
        focus: 'National & regional headlines',
        description: "Kenya's most-watched newsroom streaming politics, economy and special bulletins.",
        youtubeId: 'CfLSE8zGRww'
    },
    {
        name: 'NBC News NOW',
        region: 'United States',
        language: 'English',
        focus: 'U.S. & global breaking news',
        description: 'Live coverage from NBC News with rolling updates from correspondents across America.',
        youtubeId: '7EUX1A3sBOY'
    },
    {
        name: 'Sky News',
        region: 'United Kingdom',
        language: 'English',
        focus: 'Global breaking stories',
        description: '24/7 international reporting, interviews and analysis direct from London.',
        youtubeId: 'fjAv8KM0vuQ'
    },
    {
        name: 'ABC News Australia',
        region: 'Australia',
        language: 'English',
        focus: 'Asia-Pacific stories',
        description: 'In-depth reporting from Australia with a spotlight on Asia-Pacific affairs.',
        youtubeId: 'vOTiJkg1voo'
    },
    {
        name: 'ABC News (US)',
        region: 'United States',
        language: 'English',
        focus: 'Breaking & special reports',
        description: 'Live feeds from ABC News including special events, briefings, and documentaries.',
        youtubeId: 'DTHVVSGss9M'
    },
    {
        name: 'NTV Kenya',
        region: 'Kenya',
        language: 'English & Swahili',
        focus: 'Kenyan news & current affairs',
        description: 'Nairobi-based coverage of politics, business, lifestyle and investigative stories.',
        youtubeId: 'gWkhyPxMdEQ'
    },
    {
        name: 'France 24 English',
        region: 'France',
        language: 'English',
        focus: 'Global diplomacy & business',
        description: 'French perspective on world news, geopolitics, and business innovation.',
        youtubeId: 'Ap-UM1O9RBU'
    },
    {
        name: 'DW News',
        region: 'Germany',
        language: 'English',
        focus: 'Europe & world updates',
        description: 'Deutsche Welle reports from Berlin with expert explainers on Europe and beyond.',
        youtubeId: 'LuKwFajn37U'
    },
    {
        name: 'Bloomberg Television',
        region: 'United States',
        language: 'English',
        focus: 'Markets & finance',
        description: 'Real-time market data, CEO interviews, and deep dives into the global economy.',
        youtubeId: 'iEpJwprxDdk'
    },
    {
        name: 'Al Jazeera English',
        region: 'Qatar',
        language: 'English',
        focus: 'Global south & conflict reporting',
        description: 'Breaking stories from the Middle East, Africa, and the wider world.',
        youtubeId: 'gCNeDWCI0vo'
    },
    {
        name: 'CNA (Channel NewsAsia)',
        region: 'Singapore',
        language: 'English',
        focus: 'Asian markets & policy',
        description: 'Newsroom dedicated to ASEAN, technology and business developments.',
        youtubeId: 'XWq5kBlakcQ'
    },
    {
        name: 'Africanews English',
        region: 'Africa',
        language: 'English',
        focus: 'Pan-African coverage',
        description: 'Live bulletins from reporters stationed across the African continent.',
        youtubeId: 'NQjabLGdP5g'
    },
    {
        name: 'CGTN',
        region: 'China',
        language: 'English',
        focus: 'China & Belt and Road stories',
        description: 'Global vision from Beijing with culture, business, and diplomacy highlights.',
        youtubeId: '5lSWGQgut3w'
    },
    {
        name: 'BBC News',
        region: 'United Kingdom',
        language: 'English',
        focus: 'Global public service journalism',
        description: 'Trusted worldwide for impartial reporting and special coverage.',
        youtubeId: '9Auq9mYxFEE'
    },
    {
        name: 'TRT World',
        region: 'Turkey',
        language: 'English',
        focus: 'Eurasia & Middle East analysis',
        description: 'Istanbul-based desk covering diplomacy, development and culture.',
        youtubeId: 'QxoUv_mzj6Q'
    },
    {
        name: 'Euronews English',
        region: 'Europe',
        language: 'English',
        focus: 'European institutions & culture',
        description: 'Multi-lingual newsroom highlighting EU policy, travel and science.',
        youtubeId: 'pykpO5kN6Z8'
    },
    {
        name: 'NHK World-Japan',
        region: 'Japan',
        language: 'English',
        focus: 'Japan & Asia-Pacific',
        description: 'Public broadcaster bringing Japanese innovation, culture, and emergency alerts.',
        youtubeId: 'WT0jpn21B6I'
    },
    {
        name: 'CBS News',
        region: 'United States',
        language: 'English',
        focus: 'US politics & investigations',
        description: 'Breaking news from CBS News, including Capitol Hill and Weather Center updates.',
        youtubeId: '9-1rHYmjOg8'
    }
];

// ===========================
// Page Renderers
// ===========================

async function renderHomePage() {
    try {
        const data = await fetchAPI('/api/news');
        const trending = await fetchAPI('/api/trending');

        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;

        // Cache articles for article pages
        if (data.articles) {
            cacheArticles(data.articles);
        }

        mainContent.innerHTML = `
            <div class="container">
                <div class="content-wrapper">
                    <div class="left-column">
                        ${data.articles && data.articles.length > 0 ? renderHeroSection(data.articles[0], data.articles.slice(1, 3)) : '<p>No articles available</p>'}
                        ${data.articles && data.articles.length > 3 ? renderNewsGrid(data.articles.slice(3), 'LATEST STORIES') : ''}
                        ${renderColumnistsSection(data.articles || [])}
                    </div>
                    ${renderSidebar(trending.articles || [])}
                </div>
            </div>
        `;

        attachArticleClickHandlers();
        attachTabHandlers();
        setTimeout(() => updateActiveNav(), 100);
    } catch (error) {
        console.error('Error rendering homepage:', error);
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="container">
                    <div class="error-message">
                        <h2>Unable to load news</h2>
                        <p>Please try again later.</p>
                        <button onclick="router.navigate('/')" class="btn-primary">Refresh</button>
                    </div>
                </div>
            `;
        }
    }
}

async function renderCategoryPage(params) {
    const category = params.name;

    try {
        const data = await fetchAPI(`/api/news/category/${category}`);
        const trending = await fetchAPI('/api/trending');

        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;

        // Cache articles
        if (data.articles) {
            cacheArticles(data.articles);
        }

        mainContent.innerHTML = `
            <div class="container">
                <div class="content-wrapper">
                    <div class="left-column">
                        <div class="category-header">
                            <h1 class="category-title">${category.toUpperCase()}</h1>
                            <p class="category-description">Latest news and updates in ${category}</p>
                        </div>
                        ${data.articles && data.articles.length > 0 ? renderHeroSection(data.articles[0], data.articles.slice(1, 3)) : '<p>No articles available in this category</p>'}
                        ${data.articles && data.articles.length > 3 ? renderNewsGrid(data.articles.slice(3), `${category.toUpperCase()} NEWS`) : ''}
                    </div>
                    ${renderSidebar(trending.articles || [])}
                </div>
            </div>
        `;

        attachArticleClickHandlers();
        attachTabHandlers();
        setTimeout(() => updateActiveNav(), 100);
    } catch (error) {
        console.error(`Error rendering ${category} page:`, error);
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="container">
                    <div class="error-message">
                        <h2>Unable to load ${category} news</h2>
                        <p>Please try again later.</p>
                        <a href="/" class="btn-primary">Go Home</a>
                    </div>
                </div>
            `;
        }
    }
}

async function renderRegionPage(params) {
    const region = params.name;

    try {
        const data = await fetchAPI(`/api/news/region/${region}`);
        const trending = await fetchAPI('/api/trending');

        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        mainContent.innerHTML = `
            <div class="container">
                <div class="content-wrapper">
                    <div class="left-column">
                        <div class="category-header">
                            <h1 class="category-title">${region.toUpperCase()} NEWS</h1>
                            <p class="category-description">Breaking news and stories from ${region}</p>
                        </div>
                        ${data.articles.length > 0 ? renderHeroSection(data.articles[0], data.articles.slice(1, 3)) : ''}
                        ${renderNewsGrid(data.articles.slice(3), `${region.toUpperCase()} UPDATES`)}
                    </div>
                    ${renderSidebar(trending.articles)}
                </div>
            </div>
        `;

        updateActiveNav(region);
    } catch (error) {
        console.error(`Error rendering ${region} page:`, error);
    }
}

async function renderArticlePage(params) {
    const articleId = params.id;

    try {
        // Get article from cache or fetch
        const cachedArticle = getArticleFromCache(articleId);
        const trending = await fetchAPI('/api/trending');

        if (!cachedArticle) {
            throw new Error('Article not found');
        }

        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        mainContent.innerHTML = `
            <div class="container">
                <div class="article-page">
                    <div class="article-main">
                        <article class="article-full">
                            <div class="article-header">
                                <span class="article-category">${cachedArticle.category.toUpperCase()}</span>
                                <h1 class="article-title">${cachedArticle.title}</h1>
                                <div class="article-meta">
                                    <span class="article-author">By ${cachedArticle.author}</span>
                                    <span class="article-date">${formatDate(cachedArticle.publishedAt)}</span>
                                    <span class="article-source">Source: ${cachedArticle.source}</span>
                                </div>
                            </div>
                            
                            <div class="article-image-container">
                                <img src="${cachedArticle.image}" alt="${cachedArticle.title}" onerror="this.src='/images/World Bank.jpg'">
                            </div>
                            
                            <div class="article-content">
                                <p class="article-lead">${cachedArticle.description}</p>
                                <div class="article-body">
                                    ${cachedArticle.content || cachedArticle.description}
                                </div>
                                ${cachedArticle.url && cachedArticle.url !== '#' ? `
                                    <div class="article-source-link">
                                        <a href="${cachedArticle.url}" target="_blank" rel="noopener">
                                            Read full article at ${cachedArticle.source} →
                                        </a>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div class="article-actions">
                                <button class="action-btn bookmark-btn" onclick="toggleBookmark('${articleId}')" data-article-id="${articleId}">
                                    <span class="bookmark-icon">${isBookmarked(articleId) ? '🔖' : '📑'}</span>
                                    ${isBookmarked(articleId) ? 'Bookmarked' : 'Bookmark'}
                                </button>
                                <button class="action-btn share-btn" onclick="shareArticle('${articleId}')">
                                    <span>📤</span> Share
                                </button>
                                <button class="action-btn print-btn" onclick="window.print()">
                                    <span>🖨️</span> Print
                                </button>
                            </div>
                            
                            <div class="social-share">
                                <h3>Share this article</h3>
                                <div class="share-buttons">
                                    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}" target="_blank" class="share-btn facebook">
                                        Facebook
                                    </a>
                                    <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(cachedArticle.title)}" target="_blank" class="share-btn twitter">
                                        Twitter
                                    </a>
                                    <a href="https://wa.me/?text=${encodeURIComponent(cachedArticle.title + ' ' + window.location.href)}" target="_blank" class="share-btn whatsapp">
                                        WhatsApp
                                    </a>
                                    <button onclick="copyArticleLink()" class="share-btn copy-link">
                                        Copy Link
                                    </button>
                                </div>
                            </div>
                        </article>
                        
                        <section class="related-articles">
                            <h2>Related Articles</h2>
                            ${renderRelatedArticles(cachedArticle.category)}
                        </section>
                    </div>
                    
                    <aside class="article-sidebar">
                        ${renderSidebar(trending.articles)}
                    </aside>
                </div>
            </div>
        `;

        updateBookmarkButton(articleId);
    } catch (error) {
        console.error('Error rendering article page:', error);
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        mainContent.innerHTML = `
            <div class="container">
                <div class="article-error">
                    <h1>Article Not Found</h1>
                    <p>The article you're looking for could not be found.</p>
                    <a href="/" class="btn-primary">Back to Home</a>
                </div>
            </div>
        `;
    }
}

async function renderSearchPage(params, searchParams) {
    const query = searchParams.get('q');

    if (!query) {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        mainContent.innerHTML = `
            <div class="container">
                <div class="search-page">
                    <h1>Search</h1>
                    <p>Enter a search query to find articles</p>
                </div>
            </div>
        `;
        return;
    }

    try {
        const data = await fetchAPI(`/api/search?q=${encodeURIComponent(query)}`);
        const trending = await fetchAPI('/api/trending');

        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;

        // Cache articles
        if (data.articles) {
            cacheArticles(data.articles);
        }

        mainContent.innerHTML = `
            <div class="container">
                <div class="content-wrapper">
                    <div class="left-column">
                        <div class="search-results-header">
                            <h1>Search Results for "${query}"</h1>
                            <p>${data.count || data.articles?.length || 0} articles found</p>
                        </div>
                        ${data.articles && data.articles.length > 0 ? renderNewsGrid(data.articles, 'SEARCH RESULTS') : '<p class="no-articles">No articles found for your search.</p>'}
                    </div>
                    ${renderSidebar(trending.articles || [])}
                </div>
            </div>
        `;
        attachArticleClickHandlers();
    } catch (error) {
        console.error('Error rendering search page:', error);
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="container">
                    <div class="error-message">
                        <h2>Search failed</h2>
                        <p>Please try again later.</p>
                        <a href="/" class="btn-primary">Go Home</a>
                    </div>
                </div>
            `;
        }
    }
}

// ===========================
// Component Renderers
// ===========================

function renderAdBanner() {
    return `
        <section class="ad-banner">
            <div class="ad-content">
                <div class="ad-text">
                    <h3>BMW GROUP</h3>
                    <p class="ad-subtitle">TOGETHER, WE'RE CREATING THE HISTORY OF TOMORROW</p>
                    <p class="ad-description">BMW Group is one of the world's leading premium manufacturers</p>
                </div>
                <div class="ad-image">
                    <img src="/images/Safaricom rolls out 5G across Kenya.jpg" alt="Advertisement" loading="lazy">
                </div>
            </div>
        </section>
    `;
}

function renderHeroSection(mainArticle, secondaryArticles = []) {
    if (!mainArticle) return '';

    return `
        <section class="hero-section">
                    <article class="hero-article" data-article-id="${mainArticle.id}" style="cursor: pointer;">
                        <div class="hero-image">
                            <img src="${mainArticle.image}" alt="${mainArticle.title}" loading="eager" onerror="this.src='images/World Bank.jpg'">
                            <div class="hero-overlay">
                                <span class="hero-category">${(mainArticle.category || 'GENERAL').toUpperCase()}</span>
                                <h1 class="hero-title">${mainArticle.title}</h1>
                                <p class="hero-excerpt">${mainArticle.description || ''}</p>
                                <div class="hero-meta">
                                    <span class="hero-date">${formatDate(mainArticle.publishedAt)}</span>
                                    <span class="hero-author">By ${mainArticle.author || 'Staff Writer'}</span>
                                </div>
                            </div>
                        </div>
                    </article>
            
            ${secondaryArticles.length > 0 ? `
                <div class="secondary-stories">
                    ${secondaryArticles.map(article => `
                        <article class="story-card story-card-small">
                            <img src="${article.image}" alt="${article.title}" loading="lazy" onerror="this.src='/images/World Bank.jpg'">
                            <div class="story-overlay">
                                <span class="story-category">${article.category.toUpperCase()}</span>
                                <h3 class="story-title">${article.title}</h3>
                            </div>
                        </article>
                    `).join('')}
                </div>
            ` : ''}
        </section>
    `;
}

function renderNewsGrid(articles, title = 'LATEST STORIES') {
    if (!articles || articles.length === 0) {
        return '<p class="no-articles">No articles available at the moment.</p>';
    }

    return `
        <section class="news-grid">
            <h2 class="section-title">${title}</h2>
            <div class="grid-container">
                ${articles.map(article => `
                    <article class="news-card" data-article-id="${article.id}" style="cursor: pointer;">
                        <div class="news-image">
                            <img src="${article.image}" alt="${article.title}" loading="lazy" onerror="this.src='images/World Bank.jpg'">
                        </div>
                        <div class="news-content">
                            <span class="news-category">${(article.category || 'GENERAL').toUpperCase()}</span>
                            <h3 class="news-title">${article.title}</h3>
                            <p class="news-excerpt">${article.description || ''}</p>
                            <div class="news-meta">
                                <span class="news-date">${formatDate(article.publishedAt)}</span>
                                <span class="news-source">${article.source || 'Daily News'}</span>
                            </div>
                        </div>
                    </article>
                `).join('')}
            </div>
        </section>
    `;
}

// Mobile Menu Logic
document.addEventListener('DOMContentLoaded', () => {
    const mobileTrigger = document.querySelector('.mobile-menu-trigger');
    const mainNav = document.querySelector('.main-navigation');

    if (mobileTrigger && mainNav) {
        mobileTrigger.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            mobileTrigger.classList.toggle('active');
        });
    }

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (mainNav && mainNav.classList.contains('active') &&
            !mainNav.contains(e.target) &&
            !mobileTrigger.contains(e.target)) {
            mainNav.classList.remove('active');
            mobileTrigger.classList.remove('active');
        }
    });

    // Close menu when clicking a link
    const navLinks = document.querySelectorAll('.nav-item');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mainNav) mainNav.classList.remove('active');
        });
    });
});

function renderColumnistsSection(articles = []) {
    // Real-life reporters with their images
    const realReporters = [
        {
            name: 'Anderson Cooper',
            source: 'CNN',
            category: 'World News',
            image: 'https://i.pravatar.cc/300?img=1'
        },
        {
            name: 'Rachel Maddow',
            source: 'MSNBC',
            category: 'Political Analysis',
            image: 'https://i.pravatar.cc/300?img=5'
        },
        {
            name: 'David Muir',
            source: 'ABC News',
            category: 'Investigative',
            image: 'https://i.pravatar.cc/300?img=12'
        },
        {
            name: 'Lester Holt',
            source: 'NBC News',
            category: 'Breaking News',
            image: 'https://i.pravatar.cc/300?img=33'
        }
    ];

    return `
        <section class="columnists-section">
            <h2 class="section-title-white">COLUMNISTS & REPORTERS</h2>
            <div class="columnists-grid">
                ${realReporters.map(reporter => `
                    <article class="columnist-card">
                        <div class="columnist-avatar">
                            <img src="${reporter.image}" alt="${reporter.name}" loading="lazy" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(reporter.name)}&background=dc143c&color=fff&size=200'">
                        </div>
                        <div class="columnist-info">
                            <h3 class="columnist-name">${reporter.name}</h3>
                            <p class="columnist-title">${reporter.source}</p>
                            <p class="columnist-excerpt">${reporter.category}</p>
                        </div>
                    </article>
                `).join('')}
            </div>
        </section>
    `;
}

function renderSidebar(trendingArticles = []) {
    // Filter articles by time period
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filterByDate = (articles, daysAgo) => {
        const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        return articles.filter(article => {
            const pubDate = new Date(article.publishedAt);
            return pubDate >= cutoff;
        });
    };

    const thisWeekArticles = filterByDate(trendingArticles, 7);
    const lastWeekArticles = filterByDate(trendingArticles, 14).filter(a => {
        const pubDate = new Date(a.publishedAt);
        return pubDate >= lastWeek && pubDate < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    });
    const lastMonthArticles = filterByDate(trendingArticles, 30).filter(a => {
        const pubDate = new Date(a.publishedAt);
        return pubDate >= lastMonth && pubDate < lastWeek;
    });

    return `
        <aside class="sidebar">
            <section class="sidebar-section">
                <h3 class="sidebar-title">MOST READ NEWS</h3>
                <div class="sidebar-tabs">
                    <button class="tab-btn active" data-tab="this-week" data-articles='${JSON.stringify(thisWeekArticles)}'>This Week</button>
                    <button class="tab-btn" data-tab="last-week" data-articles='${JSON.stringify(lastWeekArticles)}'>Last Week</button>
                    <button class="tab-btn" data-tab="last-month" data-articles='${JSON.stringify(lastMonthArticles)}'>Last Month</button>
                </div>
                <div class="sidebar-articles" id="sidebar-articles-container">
                    ${thisWeekArticles.length > 0 ? thisWeekArticles.map(article => `
                        <article class="sidebar-article" data-article-id="${article.id}" style="cursor: pointer;">
                            <img src="${article.image}" alt="${article.title}" loading="lazy" onerror="this.src='/images/World Bank.jpg'">
                            <div class="sidebar-article-content">
                                <h4>${article.title}</h4>
                                <div class="sidebar-meta">
                                    <span class="sidebar-date">${formatDate(article.publishedAt)}</span>
                                </div>
                            </div>
                        </article>
                    `).join('') : '<p class="no-articles">No articles found for this period.</p>'}
                </div>
            </section>
            
            <section class="sidebar-section newsletter-section">
                <h3 class="sidebar-title">STAY UPDATED</h3>
                <p class="newsletter-text">Get the latest news delivered to your inbox</p>
                <form class="newsletter-form">
                    <input type="email" placeholder="Your email address" required>
                    <button type="submit">Subscribe</button>
                </form>
            </section>
        </aside>
    `;
}

// ===========================
// Utility Functions
// ===========================

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

function updateActiveNav() {
    // Remove active class from all nav items first
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });

    // Get current path
    const currentPath = window.location.pathname;

    // Add active class to matching nav item
    navItems.forEach(item => {
        const href = item.getAttribute('href');

        // Exact match for home
        if (currentPath === '/' && (href === '/' || href === '')) {
            item.classList.add('active');
        }
        // Match category/region routes - exact match only
        else if (currentPath.startsWith('/category/') && href === currentPath) {
            item.classList.add('active');
        }
        else if (currentPath.startsWith('/region/') && href === currentPath) {
            item.classList.add('active');
        }
        else if (href === currentPath) {
            item.classList.add('active');
        }
    });
}

// ===========================
// Initialize Router
// ===========================

const router = new Router();

// Define routes
router.addRoute('/', renderHomePage);
router.addRoute('/index.html', renderHomePage);
router.addRoute('/category/:name', renderCategoryPage);
router.addRoute('/region/:name', renderRegionPage);
router.addRoute('/article/:id', renderArticlePage);
router.addRoute('/search', renderSearchPage);
router.addRoute('/bookmarks', renderBookmarksPage);
router.addRoute('/watch', renderWatchPage);
router.addRoute('/about', renderAboutPage);
router.addRoute('/contact', renderContactPage);
router.addRoute('/advertise', renderAdvertisePage);
router.addRoute('/privacy', renderPrivacyPage);

// ===========================
// Mobile Navigation
// ===========================
const navToggle = document.querySelector('.nav-toggle');
const navList = document.querySelector('.nav-list');

if (navToggle && navList) {
    navToggle.addEventListener('click', () => {
        navList.classList.toggle('active');
        navToggle.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!navToggle.contains(e.target) && !navList.contains(e.target)) {
            navList.classList.remove('active');
            navToggle.classList.remove('active');
        }
    });
}

// ===========================
// Newsletter Form
// ===========================
document.addEventListener('submit', async (e) => {
    if (e.target.matches('.newsletter-form')) {
        e.preventDefault();

        const emailInput = e.target.querySelector('input[type="email"]');
        const email = emailInput.value;

        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (data.status === 'success') {
                alert(`✅ ${data.message}`);
                emailInput.value = '';
            } else {
                alert(`❌ ${data.message}`);
            }
        } catch (error) {
            alert('❌ Subscription failed. Please try again.');
        }
    }
});

// ===========================
// Search Functionality
// ===========================
function initSearch() {
    const header = document.querySelector('.header-top');
    if (!header.querySelector('.search-bar')) {
        const searchBar = document.createElement('div');
        searchBar.className = 'search-bar';
        searchBar.innerHTML = `
            <form class="search-form">
                <input type="search" placeholder="Search news..." name="q">
                <button type="submit">🔍</button>
            </form>
        `;
        header.appendChild(searchBar);
    }
}

document.addEventListener('submit', (e) => {
    if (e.target.matches('.search-form')) {
        e.preventDefault();
        const query = e.target.querySelector('input[name="q"]').value;
        if (query) {
            router.navigate(`/search?q=${encodeURIComponent(query)}`);
        }
    }
});

// ===========================
// Initialize App
// ===========================
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Daily News App Initialized');

    // Make router globally available
    window.router = router;

    // Initialize search form
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = document.getElementById('search-input').value;
            if (query) {
                router.navigate(`/search?q=${encodeURIComponent(query)}`);
            }
        });
    }

    // Update active nav whenever route changes
    const originalNavigate = router.navigate.bind(router);
    router.navigate = function (path) {
        originalNavigate(path);
        // Update nav after navigation completes
        setTimeout(() => {
            updateActiveNav();
        }, 50);
    };

    const originalLoadRoute = router.loadRoute.bind(router);
    router.loadRoute = async function (path) {
        await originalLoadRoute(path);
        // Update nav after route loads
        setTimeout(() => {
            updateActiveNav();
        }, 50);
    };

    // Also listen to popstate (browser back/forward)
    window.addEventListener('popstate', () => {
        setTimeout(() => {
            updateActiveNav();
        }, 50);
    });

    // Load initial route
    const path = window.location.pathname + window.location.search;
    router.loadRoute(path === '/' ? '/' : path);

    // Initialize enhancements
    initReadingProgress();
});

// ===========================
// Console Welcome
// ===========================
console.log('%c Daily News ', 'background: #DC143C; color: white; font-size: 20px; font-weight: bold; padding: 10px;');
console.log('%c Multi-Page Edition with Live News ', 'font-size: 14px; color: #1a2332;');
console.log('Stay informed with real-time news from Kenya, Africa, and around the world.');

// ===========================
// Article Caching for Detail Pages
// ===========================

const articleCache = new Map();

function cacheArticles(articles) {
    articles.forEach(article => {
        articleCache.set(article.id, article);
    });
}

function getArticleFromCache(articleId) {
    return articleCache.get(articleId);
}

// Cache articles when rendering grids
const originalRenderNewsGrid = renderNewsGrid;
window.renderNewsGrid = function (articles, title) {
    if (articles && articles.length > 0) {
        cacheArticles(articles);
    }
    return originalRenderNewsGrid(articles, title);
};

// ===========================
// Bookmarks System
// ===========================

function getBookmarks() {
    const bookmarks = localStorage.getItem('newsBookmarks');
    return bookmarks ? JSON.parse(bookmarks) : [];
}

function saveBookmarks(bookmarks) {
    localStorage.setItem('newsBookmarks', JSON.stringify(bookmarks));
}

function isBookmarked(articleId) {
    const bookmarks = getBookmarks();
    return bookmarks.some(b => b.id === articleId);
}

function toggleBookmark(articleId) {
    const article = getArticleFromCache(articleId);
    if (!article) return;

    let bookmarks = getBookmarks();
    const index = bookmarks.findIndex(b => b.id === articleId);

    if (index > -1) {
        bookmarks.splice(index, 1);
        showToast('Bookmark removed');
    } else {
        bookmarks.push(article);
        showToast('Article bookmarked!');
    }

    saveBookmarks(bookmarks);
    updateBookmarkButton(articleId);
}

function updateBookmarkButton(articleId) {
    const btn = document.querySelector(`.bookmark-btn[data-article-id="${articleId}"]`);
    if (btn) {
        const bookmarked = isBookmarked(articleId);
        btn.querySelector('.bookmark-icon').textContent = bookmarked ? '🔖' : '📑';
        btn.childNodes[2].textContent = bookmarked ? 'Bookmarked' : 'Bookmark';
    }
}

// ===========================
// Dark Mode
// ===========================

function initDarkMode() {
    const savedTheme = localStorage.getItem('newsTheme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Add dark mode toggle to header
    const header = document.querySelector('.header-top');
    if (!header.querySelector('.theme-toggle')) {
        const toggle = document.createElement('button');
        toggle.className = 'theme-toggle';
        toggle.innerHTML = savedTheme === 'dark' ? '☀️' : '🌙';
        toggle.setAttribute('aria-label', 'Toggle dark mode');
        toggle.onclick = toggleDarkMode;
        header.appendChild(toggle);
    }
}

function toggleDarkMode() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('newsTheme', newTheme);

    const toggle = document.querySelector('.theme-toggle');
    if (toggle) {
        toggle.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
    }

    showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`);
}

// ===========================
// Social Sharing
// ===========================

function shareArticle(articleId) {
    const article = getArticleFromCache(articleId);
    if (!article) return;

    if (navigator.share) {
        navigator.share({
            title: article.title,
            text: article.description,
            url: window.location.href
        }).catch(err => console.log('Share cancelled'));
    } else {
        copyArticleLink();
    }
}

function copyArticleLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        showToast('Link copied to clipboard!');
    }).catch(err => {
        showToast('Failed to copy link');
    });
}

// ===========================
// Related Articles
// ===========================

function renderRelatedArticles(category) {
    const relatedArticles = Array.from(articleCache.values())
        .filter(a => a.category === category)
        .slice(0, 3);

    if (relatedArticles.length === 0) {
        return '<p class="no-related">No related articles found.</p>';
    }

    return `
        <div class="related-grid">
            ${relatedArticles.map(article => `
                <article class="related-card" onclick="router.navigate('/article/${article.id}')">
                    <img src="${article.image}" alt="${article.title}" onerror="this.src='/images/World Bank.jpg'">
                    <div class="related-content">
                        <h3>${article.title}</h3>
                        <p>${formatDate(article.publishedAt)}</p>
                    </div>
                </article>
            `).join('')}
        </div>
    `;
}

// ===========================
// Pagination & Load More
// ===========================

let currentPage = 1;
let loadedArticles = [];

function addLoadMoreButton(container, category) {
    const existing = container.querySelector('.load-more-btn');
    if (existing) existing.remove();

    const btn = document.createElement('button');
    btn.className = 'load-more-btn';
    btn.innerHTML = '📰 Load More Articles';
    btn.onclick = () => loadMoreArticles(category);

    container.appendChild(btn);
}

async function loadMoreArticles(category) {
    try {
        currentPage++;
        const data = await fetchAPI(`/api/news/category/${category}?page=${currentPage}`);

        if (data.articles && data.articles.length > 0) {
            loadedArticles = [...loadedArticles, ...data.articles];
            cacheArticles(data.articles);

            const gridContainer = document.querySelector('.grid-container');
            data.articles.forEach(article => {
                const card = createArticleCard(article);
                gridContainer.appendChild(card);
            });

            showToast(`Loaded ${data.articles.length} more articles`);
        } else {
            showToast('No more articles available');
            document.querySelector('.load-more-btn')?.remove();
        }
    } catch (error) {
        showToast('Failed to load more articles');
    }
}

function createArticleCard(article) {
    const card = document.createElement('article');
    card.className = 'news-card';
    card.innerHTML = `
        <div class="news-image">
            <img src="${article.image}" alt="${article.title}" loading="lazy" onerror="this.src='/images/World Bank.jpg'">
        </div>
        <div class="news-content">
            <span class="news-category">${article.category.toUpperCase()}</span>
            <h3 class="news-title">${article.title}</h3>
            <p class="news-excerpt">${article.description}</p>
            <div class="news-meta">
                <span class="news-date">${formatDate(article.publishedAt)}</span>
                <span class="news-source">${article.source}</span>
            </div>
        </div>
    `;
    card.onclick = () => router.navigate(`/article/${article.id}`);
    return card;
}

// ===========================
// Toast Notifications
// ===========================

function showToast(message, duration = 3000) {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ===========================
// PWA Service Worker
// ===========================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Disabled active registration to avoid persistent caching issues
        // We rely on the self-destructing sw.js to unregister itself if it exists
        /*
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('✅ Service Worker registered'))
            .catch(err => console.log('❌ Service Worker registration failed:', err));
        */
        console.log('🚮 Service Worker registration intentionally disabled for v1.1.1');
    });
}

// ===========================
// Infinite Scroll (Optional)
// ===========================

let isInfiniteScrollEnabled = false;

function enableInfiniteScroll(category) {
    if (isInfiniteScrollEnabled) return;
    isInfiniteScrollEnabled = true;

    window.addEventListener('scroll', () => {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

        if (scrollTop + clientHeight >= scrollHeight - 500) {
            if (!document.querySelector('.loading-overlay')) {
                loadMoreArticles(category);
            }
        }
    });
}

// ===========================
// Reading Progress Bar
// ===========================

function initReadingProgress() {
    const progressBar = document.createElement('div');
    progressBar.className = 'reading-progress';
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', () => {
        const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (window.scrollY / windowHeight) * 100;
        progressBar.style.width = `${scrolled}%`;
    });
}

// ===========================
// Enhanced Article Cards with Click
// ===========================

function attachArticleClickHandlers() {
    // Remove old listeners by using event delegation on main-content
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.addEventListener('click', (e) => {
        const card = e.target.closest('.news-card, .hero-article, .story-card, .sidebar-article');
        if (card && !e.target.closest('a, button')) {
            const articleId = card.dataset.articleId;
            if (articleId) {
                router.navigate(`/article/${articleId}`);
            }
        }
    });
}

function attachTabHandlers() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const container = document.getElementById('sidebar-articles-container');

    if (!tabButtons.length || !container) return;

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Get articles for this tab
            const articles = JSON.parse(btn.dataset.articles || '[]');

            // Render articles
            if (articles.length > 0) {
                container.innerHTML = articles.map(article => `
                    <article class="sidebar-article" data-article-id="${article.id}" style="cursor: pointer;">
                        <img src="${article.image}" alt="${article.title}" loading="lazy" onerror="this.src='/images/World Bank.jpg'">
                        <div class="sidebar-article-content">
                            <h4>${article.title}</h4>
                            <div class="sidebar-meta">
                                <span class="sidebar-date">${formatDate(article.publishedAt)}</span>
                            </div>
                        </div>
                    </article>
                `).join('');
            } else {
                container.innerHTML = '<p class="no-articles">No articles found for this period.</p>';
            }
        });
    });
}

// ===========================
// Watch Page
// ===========================

function renderWatchPage() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="container">
            <section class="watch-hero">
                <div class="watch-highlight">
                    <span>📺 ${LIVE_CHANNELS.length}+ verified streams</span>
                    <span>🌍 Africa + Global coverage</span>
                </div>
                <h1>Watch Live News</h1>
                <p>Stream trusted newsrooms from Kenya, Africa, and the rest of the world without leaving DAILYNEWS. Every channel below is embedded directly from its official YouTube feed.</p>
            </section>
            <section class="watch-grid">
                ${LIVE_CHANNELS.map(channel => `
                    <article class="watch-card">
                        <div class="watch-card-header">
                            <span class="watch-badge">${channel.region}</span>
                            <h3>${channel.name}</h3>
                            <small>${channel.language} · ${channel.focus}</small>
                        </div>
                        <div class="watch-player">
                            <iframe
                                src="https://www.youtube.com/embed/${channel.youtubeId}?rel=0"
                                title="${channel.name} live stream"
                                loading="lazy"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowfullscreen
                            ></iframe>
                        </div>
                        <p>${channel.description}</p>
                        <div class="watch-links">
                            <a href="https://www.youtube.com/watch?v=${channel.youtubeId}" target="_blank" rel="noopener">Open in YouTube ↗</a>
                            <span>Live 24/7</span>
                        </div>
                    </article>
                `).join('')}
            </section>
            <section class="watch-suggestion">
                <strong>Missing a channel?</strong>
                <p>Send the link to <a href="mailto:gideongeng@gmail.com?subject=Add%20Live%20Channel">gideongeng@gmail.com</a> or drop a request on the <a href="/contact">contact page</a> and we'll add it.</p>
            </section>
        </div>
    `;

    updateActiveNav();
}

// ===========================
// Static Pages
// ===========================

async function renderAboutPage() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="container">
            <div class="static-page">
                <h1>About Us</h1>
                <div class="page-content">
                    <p>DAILYNEWS is your trusted source for breaking news, in-depth analysis, and comprehensive coverage of events from Kenya, Africa, and around the world.</p>
                    <p>We are committed to delivering accurate, timely, and relevant news to keep you informed about the issues that matter most.</p>
                    <h2>Our Mission</h2>
                    <p>To provide high-quality journalism that informs, educates, and empowers our readers with reliable news and insightful analysis.</p>
                    <h2>Contact Us</h2>
                    <p>For inquiries, please email us at <a href="mailto:gideongeng@gmail.com">gideongeng@gmail.com</a></p>
                </div>
            </div>
        </div>
    `;
    updateActiveNav();
}

async function renderContactPage() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="container">
            <div class="static-page">
                <h1>Contact Us</h1>
                <div class="page-content">
                    <p>We'd love to hear from you! Get in touch with us through the following channels:</p>
                    <div class="contact-info">
                        <h2>Email</h2>
                        <p><strong>General Inquiries:</strong> <a href="mailto:gideongeng@gmail.com">gideongeng@gmail.com</a></p>
                        <p><strong>Report an Issue:</strong> <a href="mailto:gideongeng@gmail.com?subject=Report%20Issue">gideongeng@gmail.com</a></p>
                    </div>
                    <div class="contact-form">
                        <h2>Send us a Message</h2>
                        <form id="contact-form">
                            <div class="form-group">
                                <label for="contact-name">Name</label>
                                <input type="text" id="contact-name" name="name" required>
                            </div>
                            <div class="form-group">
                                <label for="contact-email">Email</label>
                                <input type="email" id="contact-email" name="email" required>
                            </div>
                            <div class="form-group">
                                <label for="contact-subject">Subject</label>
                                <input type="text" id="contact-subject" name="subject" required>
                            </div>
                            <div class="form-group">
                                <label for="contact-message">Message</label>
                                <textarea id="contact-message" name="message" rows="5" required></textarea>
                            </div>
                            <button type="submit" class="btn-primary">Send Message</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Handle form submission
    const form = document.getElementById('contact-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const email = formData.get('email');
            const subject = formData.get('subject');
            const message = formData.get('message');
            const name = formData.get('name');

            // Open email client
            const mailtoLink = `mailto:gideongeng@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`;
            window.location.href = mailtoLink;
        });
    }

    updateActiveNav();
}

async function renderAdvertisePage() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="container">
            <div class="static-page">
                <h1>Advertise With Us</h1>
                <div class="page-content">
                    <p>Reach your target audience with DAILYNEWS. We offer various advertising opportunities to help your business grow.</p>
                    <h2>Why Advertise with DAILYNEWS?</h2>
                    <ul>
                        <li>Reach a large and engaged audience</li>
                        <li>Target specific demographics and interests</li>
                        <li>Multiple advertising formats available</li>
                        <li>Competitive pricing and flexible packages</li>
                    </ul>
                    <h2>Get Started</h2>
                    <p>Contact our advertising team to discuss your advertising needs:</p>
                    <p><strong>Email:</strong> <a href="mailto:gideongeng@gmail.com?subject=Advertising%20Inquiry">gideongeng@gmail.com</a></p>
                    <p>We'll get back to you with a customized advertising proposal that fits your budget and goals.</p>
                </div>
            </div>
        </div>
    `;
    updateActiveNav();
}

async function renderPrivacyPage() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="container">
            <div class="static-page">
                <h1>Privacy Policy</h1>
                <div class="page-content">
                    <p><strong>Last Updated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    
                    <h2>1. Introduction</h2>
                    <p>DAILYNEWS ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website.</p>
                    
                    <h2>2. Information We Collect</h2>
                    <h3>2.1 Information You Provide</h3>
                    <p>We may collect information that you voluntarily provide to us, including:</p>
                    <ul>
                        <li>Email address (when subscribing to our newsletter)</li>
                        <li>Name and contact information (when contacting us)</li>
                        <li>Any other information you choose to provide</li>
                    </ul>
                    
                    <h3>2.2 Automatically Collected Information</h3>
                    <p>When you visit our website, we may automatically collect certain information about your device, including:</p>
                    <ul>
                        <li>IP address</li>
                        <li>Browser type and version</li>
                        <li>Pages you visit and time spent on pages</li>
                        <li>Referring website addresses</li>
                        <li>Device information</li>
                    </ul>
                    
                    <h2>3. How We Use Your Information</h2>
                    <p>We use the information we collect to:</p>
                    <ul>
                        <li>Provide, maintain, and improve our services</li>
                        <li>Send you newsletters and updates (with your consent)</li>
                        <li>Respond to your inquiries and requests</li>
                        <li>Analyze website usage and trends</li>
                        <li>Ensure website security and prevent fraud</li>
                    </ul>
                    
                    <h2>4. Cookies and Tracking Technologies</h2>
                    <p>We use cookies and similar tracking technologies to track activity on our website and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.</p>
                    
                    <h2>5. Third-Party Services</h2>
                    <p>Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review the privacy policies of any third-party sites you visit.</p>
                    
                    <h2>6. Data Security</h2>
                    <p>We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.</p>
                    
                    <h2>7. Your Rights</h2>
                    <p>You have the right to:</p>
                    <ul>
                        <li>Access the personal information we hold about you</li>
                        <li>Request correction of inaccurate information</li>
                        <li>Request deletion of your personal information</li>
                        <li>Opt-out of marketing communications</li>
                    </ul>
                    
                    <h2>8. Children's Privacy</h2>
                    <p>Our website is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13.</p>
                    
                    <h2>9. Changes to This Privacy Policy</h2>
                    <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.</p>
                    
                    <h2>10. Contact Us</h2>
                    <p>If you have any questions about this Privacy Policy, please contact us at:</p>
                    <p><strong>Email:</strong> <a href="mailto:gideongeng@gmail.com?subject=Privacy%20Policy%20Inquiry">gideongeng@gmail.com</a></p>
                </div>
            </div>
        </div>
    `;
    updateActiveNav();
}

// ===========================
// Bookmarks Page Route
// ===========================

async function renderBookmarksPage() {
    const bookmarks = getBookmarks();

    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    try {
        const trending = await fetchAPI('/api/trending');

        mainContent.innerHTML = `
            <div class="container">
                <div class="content-wrapper">
                    <div class="left-column">
                        <div class="category-header">
                            <h1 class="category-title">MY BOOKMARKS</h1>
                            <p class="category-description">Your saved articles (${bookmarks.length})</p>
                        </div>
                        ${bookmarks.length > 0 ? renderNewsGrid(bookmarks, 'BOOKMARKED ARTICLES') : '<p class="no-articles">No bookmarked articles yet.</p>'}
                    </div>
                    ${renderSidebar(trending.articles || [])}
                </div>
            </div>
        `;
        attachArticleClickHandlers();
        attachTabHandlers();
        updateActiveNav('bookmarks');
    } catch (error) {
        console.error('Error rendering bookmarks:', error);
        mainContent.innerHTML = `
            <div class="container">
                <div class="content-wrapper">
                    <div class="left-column">
                        <div class="category-header">
                            <h1 class="category-title">MY BOOKMARKS</h1>
                            <p class="category-description">Your saved articles (${bookmarks.length})</p>
                        </div>
                        ${bookmarks.length > 0 ? renderNewsGrid(bookmarks, 'BOOKMARKED ARTICLES') : '<p class="no-articles">No bookmarked articles yet.</p>'}
                    </div>
                </div>
            </div>
        `;
        attachArticleClickHandlers();
    }
}

// ===========================
// Initialize All Enhancements
// ===========================

// This is handled in the main initialization above

// ===========================
// Analytics Tracking
// ===========================

function trackPageView(page) {
    const views = JSON.parse(localStorage.getItem('pageViews') || '{}');
    views[page] = (views[page] || 0) + 1;
    localStorage.setItem('pageViews', JSON.stringify(views));
}

function trackArticleView(articleId) {
    const views = JSON.parse(localStorage.getItem('articleViews') || '{}');
    views[articleId] = (views[articleId] || 0) + 1;
    localStorage.setItem('articleViews', JSON.stringify(views));
}

// Track page views on route changes
const originalLoadRoute = router.loadRoute.bind(router);
router.loadRoute = async function (path) {
    await originalLoadRoute(path);
    trackPageView(path);
};

console.log('🎉 All enhancements loaded: Dark Mode, Bookmarks, Social Sharing, PWA, and more!');

