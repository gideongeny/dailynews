// ===========================
// Client-Side Router
// ===========================
console.log('✅ LOADING SCRIPT v1.4.5 [ULTIMATE]');

// ===========================
// Content Validation & Quality
// ===========================

// Category-specific placeholder images
const CATEGORY_PLACEHOLDERS = {
    politics: '/images/Kenya Parliament.jpg',
    business: '/images/no-image.png',
    technology: '/images/Safaricom rolls out 5G across Kenya.jpg',
    sports: '/images/Olunga sets national record in 100 m.jpg',
    culture: '/images/Maasai Olympics empower women.webp',
    health: '/images/no-image.png',
    general: '/images/no-image.png',
    world: '/images/no-image.png',
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

function isVideoArticle(article) {
    const videoKeywords = ['video', 'watch', 'live', 'stream', 'broadcast', 'youtube', 'vimeo', 'exclusive clip'];
    const titleMatch = videoKeywords.some(k => article.title?.toLowerCase().includes(k));
    const descMatch = videoKeywords.some(k => article.description?.toLowerCase().includes(k));
    const urlMatch = article.url?.includes('youtube.com') || article.url?.includes('youtu.be') || article.url?.includes('vimeo.com');
    return titleMatch || descMatch || urlMatch;
}

function validateArticle(article) {
    if (!article) return false;

    // Must have a title
    if (!article.title || article.title.trim().length < 10) {
        return false;
    }

    // Must have a URL
    if (!article.url || !article.url.startsWith('http')) {
        return false;
    }

    // Tag as video if applicable
    if (isVideoArticle(article)) {
        article.type = 'video';
    }

    // Tag as breaking if title contains certain keywords
    const breakingKeywords = ['breaking', 'urgent', 'alert', 'just in', 'developing'];
    if (breakingKeywords.some(k => article.title?.toLowerCase().includes(k))) {
        article.isBreaking = true;
    }

    // Description fallback
    if (!article.description || article.description.trim().length < 20) {
        article.description = generateExcerpt(article.title);
    }

    // Image fallback
    if (!article.image || article.image === 'null' || article.image === '') {
        article.image = getCategoryPlaceholder(article.category);
    }

    if (!article.category) article.category = 'general';
    if (!article.source) article.source = 'News Source';

    return true;
}

// HTML Sanitization & Text Cleanup
function stripHtmlTags(html) {
    if (!html) return '';
    const clean = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, '')
        .replace(/on\w+="[^"]*"/gmi, '')
        .replace(/javascript:[^"]*/gmi, '');
    const temp = document.createElement('div');
    temp.textContent = clean;
    return temp.innerHTML.replace(/<[^>]*>?/gm, '');
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

// Deterministic ID generation to prevent 404s on refresh
function generateArticleId(article) {
    if (article.id && !article.id.includes('math.random')) return article.id;

    // Create a slug from title + source
    const text = `${article.title}-${article.source}`;
    return text.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
        .substring(0, 100);
}

// ===========================
// Firebase & Auth Manager
// ===========================
const firebaseConfig = {
    apiKey: "AIzaSyDhWpp6pi_HbY4KyZ-6Doy_QnBiojHugs4",
    authDomain: "dailynews-app-2026.firebaseapp.com",
    projectId: "dailynews-app-2026",
    storageBucket: "dailynews-app-2026.firebasestorage.app",
    messagingSenderId: "896667819348",
    appId: "1:896667819348:web:f292db85f99237b2c33cc1"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
}

const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;
const auth = typeof firebase !== 'undefined' ? firebase.auth() : null;

class AuthManager {
    static async signUp(email, password, fullName) {
        try {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            await result.user.updateProfile({ displayName: fullName });
            await db.collection('users').doc(result.user.uid).set({
                fullName,
                email,
                subscription: 'Free',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Account created successfully!');
            router.navigate('/');
        } catch (error) {
            showError(error.message);
        }
    }

    static async signIn(email, password) {
        try {
            await auth.signInWithEmailAndPassword(email, password);
            showToast('Welcome back!');
            router.navigate('/');
        } catch (error) {
            showError(error.message);
        }
    }

    static async signOut() {
        try {
            await auth.signOut();
            showToast('Signed out successfully');
            router.navigate('/');
        } catch (error) {
            showError(error.message);
        }
    }

    static async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);
            console.log('🔑 Google Sign-In Success:', result.user.email);

            // Create user profile if it doesn't exist
            const userDoc = await db.collection('users').doc(result.user.uid).get();
            if (!userDoc.exists) {
                console.log('🆕 Creating new user profile...');
                await db.collection('users').doc(result.user.uid).set({
                    fullName: result.user.displayName,
                    email: result.user.email,
                    subscription: 'Free',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                console.log('✅ User profile exists');
            }

            showToast('Welcome back!');
            console.log('🏠 Navigating to Home...');
            router.navigate('/');
        } catch (error) {
            showError(error.message);
        }
    }

    static async signInWithPhone() {
        try {
            showToast('Phone sign-in coming soon!');
            // Phone auth requires additional setup with reCAPTCHA
            // We'll implement this in a future update
        } catch (error) {
            showError(error.message);
        }
    }

    static onAuthStateChanged(callback) {
        if (auth) auth.onAuthStateChanged(callback);
    }
}

// Global User State
let currentUser = null;
let userProfile = null;
let userSubscription = 'Free';

AuthManager.onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
        // Fetch extended profile including subscription
        // Retry logic to handle race condition during signup
        let retries = 3;
        while (retries > 0) {
            try {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists) {
                    userProfile = doc.data();
                    userSubscription = userProfile.subscription || 'Free';
                    console.log(`👤 Profile Loaded: ${userSubscription} Plan`);
                    break;
                } else {
                    console.log('⌛ Profile not found yet, retrying...');
                    await new Promise(r => setTimeout(r, 1000));
                    retries--;
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
                break;
            }
        }
    } else {
        userProfile = null;
        userSubscription = 'Free';
    }

    updateAuthUI();
    // Re-render current page to apply access changes if needed
    if (typeof processPendingSubscription === 'function') {
        processPendingSubscription();
    }
});

function updateAuthUI() {
    console.log('🔄 updateAuthUI called, user:', currentUser ? currentUser.email : 'null');
    const topBarRight = document.querySelector('.top-bar-right');
    if (!topBarRight) {
        console.warn('⚠️ .top-bar-right not found in DOM');
        return;
    }

    if (currentUser) {
        const greetingName = currentUser.displayName || (userProfile ? userProfile.fullName : null) || 'Reader';
        console.log('✅ Rendering Logged-In UI for:', greetingName);
        topBarRight.innerHTML = `
            <span class="user-greeting">Hi, ${greetingName}</span>
            <button onclick="AuthManager.signOut()" class="top-link logout-btn-inline">Sign Out</button>
            <div class="social-icons-small">
                <a href="#" aria-label="Facebook">F</a>
                <a href="#" aria-label="Twitter">T</a>
                <a href="#" aria-label="Instagram">I</a>
            </div>
        `;
    } else {
        console.log('ℹ️ Rendering Guest UI');
        topBarRight.innerHTML = `
            <a href="/signin" class="top-link">Sign In</a>
            <a href="/subscribe" class="top-link">Subscribe</a>
            <div class="social-icons-small">
                <a href="#" aria-label="Facebook">F</a>
                <a href="#" aria-label="Twitter">T</a>
                <a href="#" aria-label="Instagram">I</a>
            </div>
        `;
    }
}

// Advanced Deduplication using Similarity Matching
function calculateSimilarity(s1, s2) {
    if (!s1 || !s2) return 0;

    // Convert to lowercase for comparison
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

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

// Category Filtering by Keywords
const CATEGORY_KEYWORDS = {
    politics: ['trump', 'biden', 'election', 'government', 'president', 'congress', 'senate', 'parliament', 'minister', 'political', 'vote', 'campaign', 'policy', 'law', 'legislation'],
    sports: ['football', 'basketball', 'soccer', 'tennis', 'cricket', 'rugby', 'olympics', 'game', 'match', 'player', 'team', 'championship', 'league', 'tournament', 'score', 'win', 'defeat'],
    technology: ['tech', 'ai', 'software', 'apple', 'google', 'microsoft', 'facebook', 'amazon', 'startup', 'app', 'digital', 'cyber', 'data', 'algorithm', 'innovation'],
    business: ['stock', 'market', 'economy', 'company', 'trade', 'finance', 'investment', 'bank', 'revenue', 'profit', 'ceo', 'business', 'corporate', 'industry', 'economic'],
    health: ['health', 'medical', 'hospital', 'doctor', 'patient', 'disease', 'vaccine', 'medicine', 'treatment', 'covid', 'pandemic', 'virus', 'healthcare'],
    culture: ['art', 'music', 'film', 'movie', 'book', 'artist', 'culture', 'festival', 'museum', 'theater', 'entertainment', 'celebrity', 'fashion'],
    world: ['international', 'global', 'country', 'nation', 'foreign', 'diplomatic', 'war', 'conflict', 'peace', 'treaty'],
    kenya: ['kenya', 'nairobi', 'mombasa', 'ruto', 'odinga', 'east africa', 'ksm', 'kenyan', 'gachagua', 'kanu', 'jubilee', 'azimio', 'udm'],
    africa: ['africa', 'nigeria', 'south africa', 'ethiopia', 'egypt', 'ghana', 'senegal', 'african', 'african union', 'maghreb', 'sahel'],
    asia: ['asia', 'china', 'india', 'japan', 'south korea', 'vietnam', 'thailand', 'asian', 'asean', 'beijing', 'tokyo', 'delhi'],
    oceania: ['australia', 'new zealand', 'oceania', 'pacific', 'fiji', 'melanesia', 'micronesia', 'polynesia', 'sydney', 'melbourne', 'auckland'],
    europe: ['europe', 'uk', 'france', 'germany', 'italy', 'spain', 'european', 'brussels', 'london', 'paris', 'berlin', 'eu'],
    asean: ['asean', 'southeast asia', 'singapore', 'malaysia', 'indonesia', 'vietnam', 'thailand', 'philippines', 'jakarta', 'bangkok', 'manila'],
    'north-america': ['usa', 'canada', 'mexico', 'america', 'washington', 'new york', 'ottawa', 'toronto'],
    'middle-east': ['middle east', 'israel', 'palestine', 'saudi arabia', 'iran', 'iraq', 'syria', 'dubai', 'qatar', 'beirut', 'jerusalem'],
    'south-america': ['brazil', 'argentina', 'colombia', 'chile', 'peru', 'venezuela', 'latin america', 'amazon', 'andes']
};

function filterByCategory(articles, targetCategory) {
    if (!targetCategory || targetCategory === 'general') {
        return articles; // No filtering for general/home page
    }

    const keywords = CATEGORY_KEYWORDS[targetCategory.toLowerCase()];
    if (!keywords) {
        console.warn(`⚠️ [FILTER] No keywords defined for category: ${targetCategory}`);
        return articles;
    }

    const filtered = articles.filter(article => {
        const text = `${article.title} ${article.description}`.toLowerCase();
        const matchCount = keywords.filter(kw => text.includes(kw)).length;

        // Article must match at least 1 keyword
        if (matchCount > 0) {
            console.log(`✅ [FILTER] "${article.title.substring(0, 50)}..." matches ${targetCategory} (${matchCount} keywords)`);
            return true;
        }
        return false;
    });

    console.log(`📊 [FILTER] Category "${targetCategory}": ${filtered.length}/${articles.length} articles matched`);
    return filtered;
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
        try {
            for (const [route, handler] of Object.entries(this.routes)) {
                const match = this.matchRoute(pathname, route);
                if (match) {
                    this.currentRoute = route;
                    await handler(match.params, params);
                    window.scrollTo(0, 0);
                    return;
                }
            }
        } catch (error) {
            console.error('🔥 ROUTER ERROR:', error);
            this.showErrorPage(error.message);
            return;
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
                <div class="container py-20 text-center">
                    <div class="error-404 bg-white p-10 rounded-xl shadow-2xl border-t-8 border-red-600 max-w-lg mx-auto">
                        <h1 class="text-6xl font-black text-slate-900 mb-4">404</h1>
                        <h2 class="text-2xl font-bold text-slate-700 mb-6">Oops! Lost in the Newsroom?</h2>
                        <p class="text-slate-500 mb-8 leading-relaxed">The article or page you're searching for seems to have been retired or moved. Let's get you back to the latest headlines.</p>
                        <a href="/" class="inline-block bg-red-600 text-white px-8 py-3 rounded-full font-bold hover:bg-black transition-all">Back to Home</a>
                    </div>
                </div>
            `;
        }
    }

    showErrorPage(message) {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="container py-20 text-center">
                    <div class="error-boundary bg-slate-50 p-10 rounded-xl border border-slate-200 max-w-lg mx-auto">
                        <div class="text-red-600 text-5xl mb-6">⚠️</div>
                        <h2 class="text-2xl font-bold text-slate-900 mb-4">System Interruption</h2>
                        <p class="text-slate-600 mb-8">${message || 'An unexpected error occurred while loading this page.'}</p>
                        <button onclick="window.location.reload()" class="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold hover:opacity-90">Retry Connection</button>
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
            // Extract page from endpoint if exists
            const urlParams = new URLSearchParams(endpoint.split('?')[1]);
            const page = urlParams.get('page') || 1;

            const newsDataApiKey = 'pub_1d543e32d71f4487ba93652287a90acc';
            const nyTimesApiKey = 'HRdesBbmlbUI9b8laRNMAaGSvFEIa6dLhv4rWOP35WywiJGHqRmc2Pmb6QBARWxR';
            const theNewsApiKey = '2-Q_c0ydZgil3Ti859SjE1HiJxBJ6V4lQCNEUCJLJ0S65bfV';

            // Construct NewsData URL with paging support
            let newsDataUrl = `https://newsdata.io/api/1/news?apikey=${newsDataApiKey}&language=en&page=${page}`;
            if (endpoint.includes('category/')) {
                const category = endpoint.split('category/')[1].split('?')[0];
                newsDataUrl += `&category=${category}`;
            } else if (endpoint.includes('search?q=')) {
                const query = endpoint.split('search?q=')[1].split('&')[0];
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

            // RSS Feeds via rss2json proxy
            let rssFeedsToFetch = [
                'http://feeds.bbci.co.uk/news/world/rss.xml',
                'http://rss.cnn.com/rss/edition_world.rss',
                'https://www.theguardian.com/world/rss',
                'https://www.aljazeera.com/xml/rss/all.xml',
                'https://feeds.reuters.com/reuters/topNews'
            ];

            // Category-specific RSS feeds
            if (endpoint.includes('category/') || endpoint.includes('region/')) {
                const parts = endpoint.split('/');
                const category = parts[parts.length - 1].split('?')[0];

                if (category === 'sports') {
                    rssFeedsToFetch = [
                        'http://feeds.bbci.co.uk/sport/rss.xml',
                        'http://rss.cnn.com/rss/edition_sport.rss',
                        'https://www.theguardian.com/uk/sport/rss',
                        'https://www.espn.com/espn/rss/news',
                        'https://www.skysports.com/rss/12040'
                    ];
                } else if (category === 'kenya') {
                    rssFeedsToFetch = [
                        'https://www.standardmedia.co.ke/rss/headlines.php',
                        'https://nation.africa/service/rss/620/view/default/rss.xml',
                        'https://www.the-star.co.ke/rss',
                        'https://www.kbc.co.ke/feed/',
                        'https://www.capitalfm.co.ke/news/feed/',
                        'https://www.kenyans.co.ke/rss.xml',
                        'https://www.citizen.digital/rss',
                        'https://www.tuko.co.ke/arc/outboundfeeds/rss/category/kenya/'
                    ];
                } else if (category === 'africa' || category === 'regions') {
                    rssFeedsToFetch = [
                        'https://www.aljazeera.com/xml/rss/all.xml',
                        'http://feeds.bbci.co.uk/news/world/africa/rss.xml',
                        'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf',
                        'https://www.africanews.com/feed/',
                        'https://www.reuters.com/arc/outboundfeeds/reuters/world/africa/?outputType=xml'
                    ];
                } else if (category === 'asia') {
                    rssFeedsToFetch = [
                        'http://feeds.bbci.co.uk/news/world/asia/rss.xml',
                        'https://www.aljazeera.com/xml/rss/all.xml',
                        'https://www.scmp.com/rss/2/feed.xml',
                        'https://www.channelnewsasia.com/rssfeeds/8395986'
                    ];
                } else if (category === 'technology') {
                    rssFeedsToFetch = [
                        'http://feeds.bbci.co.uk/news/technology/rss.xml',
                        'https://www.theguardian.com/uk/technology/rss',
                        'http://rss.cnn.com/rss/edition_technology.rss',
                        'https://www.wired.com/feed/rss',
                        'https://www.techcrunch.com/feed/'
                    ];
                } else if (category === 'business') {
                    rssFeedsToFetch = [
                        'http://feeds.bbci.co.uk/news/business/rss.xml',
                        'https://www.theguardian.com/uk/business/rss',
                        'http://rss.cnn.com/rss/edition_business.rss',
                        'https://www.forbes.com/real-time/feed/',
                        'https://www.reuters.com/arc/outboundfeeds/reuters/business/?outputType=xml'
                    ];
                } else if (category === 'politics') {
                    rssFeedsToFetch = [
                        'http://feeds.bbci.co.uk/news/politics/rss.xml',
                        'https://www.theguardian.com/uk/politics/rss',
                        'https://www.aljazeera.com/xml/rss/all.xml',
                        'http://rss.cnn.com/rss/cnn_allpolitics.rss'
                    ];
                } else if (category === 'north-america') {
                    rssFeedsToFetch = [
                        'http://rss.cnn.com/rss/edition_us.rss',
                        'http://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml',
                        'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/world/americas/rss.xml',
                        'https://www.wsj.com/xml/rss/3_7085.xml'
                    ];
                } else if (category === 'europe') {
                    rssFeedsToFetch = [
                        'http://feeds.bbci.co.uk/news/world/europe/rss.xml',
                        'https://www.theguardian.com/world/europe/rss',
                        'https://www.euronews.com/rss?level=vertical&name=news',
                        'https://www.dw.com/xml/rss-en-all'
                    ];
                } else if (category === 'oceania' || category === 'australia') {
                    rssFeedsToFetch = [
                        'https://www.abc.net.au/news/feed/51120/rss.xml',
                        'https://www.theguardian.com/australia-news/rss',
                        'https://www.smh.com.au/rss/feed.xml',
                        'http://feeds.bbci.co.uk/news/world/australia/rss.xml',
                        'https://www.rnz.co.nz/rss/news.xml'
                    ];
                } else if (category === 'middle-east') {
                    rssFeedsToFetch = [
                        'https://www.aljazeera.com/xml/rss/all.xml',
                        'http://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
                        'https://www.theguardian.com/world/middleeast/rss',
                        'https://www.reuters.com/arc/outboundfeeds/reuters/world/middle-east/?outputType=xml',
                        'https://www.jpost.com/rss/rss.aspx?sectionid=1'
                    ];
                } else if (category === 'asean' || category === 'southeast-asia') {
                    rssFeedsToFetch = [
                        'https://www.channelnewsasia.com/rssfeeds/8395986',
                        'https://www.scmp.com/rss/2/feed.xml',
                        'https://www.thestar.com.my/rss/news/nation',
                        'https://www.bangkokpost.com/rss/data/topstories.xml',
                        'https://www.straitstimes.com/news/asia/rss.xml'
                    ];
                }
            }

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
                ...rssFeedsToFetch.map(url => safeFetchJson(rssProxyUrl + encodeURIComponent(url)))
            ]);

            console.log('📊 [TRACE] API Results Summary:', results.map(r => r ? 'SUCCESS' : 'FAIL'));
            let aggregatedArticles = [];

            // Process NewsData
            if (results[0] && results[0].results) {
                const newsDataArticles = results[0].results.map(a => {
                    const baseArticle = {
                        title: a.title,
                        description: a.description || 'No description available',
                        content: a.content || a.description || '',
                        url: a.link,
                        image: a.image_url || '/images/no-image.png',
                        publishedAt: a.pubDate || new Date().toISOString(),
                        source: a.source_id?.toUpperCase() || 'NEWSDATA',
                        category: a.category?.[0] || 'general',
                        author: a.creator?.[0] || 'Staff Writer'
                    };
                    baseArticle.id = generateArticleId(baseArticle);
                    return baseArticle;
                });
                aggregatedArticles = [...aggregatedArticles, ...newsDataArticles];
            }

            // Process NYTimes
            if (results[1] && results[1].results) {
                const nyTimesArticles = results[1].results.map(a => {
                    const multimedia = a.multimedia || [];
                    let imageUrl = '/images/no-image.png';
                    if (multimedia.length > 0) imageUrl = multimedia[0].url;

                    const baseArticle = {
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
                    baseArticle.id = generateArticleId(baseArticle);
                    return baseArticle;
                });
                aggregatedArticles = [...aggregatedArticles, ...nyTimesArticles];
            }

            // Process TheNewsAPI
            if (results[2] && results[2].data) {
                const theNewsArticles = results[2].data.map(a => {
                    const baseArticle = {
                        title: a.title,
                        description: a.description || 'No description available',
                        content: a.content || '',
                        url: a.url,
                        image: a.image_url || '/images/no-image.png',
                        publishedAt: a.published_at,
                        source: a.source?.toUpperCase() || 'THENEWSAPI',
                        category: a.categories?.[0] || 'general',
                        author: 'Reporter'
                    };
                    baseArticle.id = a.uuid || generateArticleId(baseArticle);
                    return baseArticle;
                });
                aggregatedArticles = [...aggregatedArticles, ...theNewsArticles];
            }

            // Dynamic RSS Processing for all feeds in rssFeedsToFetch
            results.slice(3).forEach((rssResult, index) => {
                if (rssResult && rssResult.items) {
                    const sourceName = rssResult.feed?.title || 'NEWS SOURCE';
                    const rssArticles = rssResult.items.slice(0, 15).map(a => {
                        const baseArticle = {
                            title: cleanDescription(a.title),
                            description: cleanDescription(a.description || a.content) || 'Read the full story',
                            content: cleanDescription(a.content || a.description) || '',
                            url: a.link,
                            image: a.enclosure?.link || a.thumbnail || '/images/no-image.png',
                            publishedAt: a.pubDate || new Date().toISOString(),
                            source: sourceName.toUpperCase(),
                            category: endpoint.includes('category/') ? endpoint.split('category/')[1].split('?')[0] :
                                endpoint.includes('region/') ? endpoint.split('region/')[1].split('?')[0] : 'world',
                            author: sourceName
                        };
                        baseArticle.id = generateArticleId(baseArticle);
                        return baseArticle;
                    });
                    aggregatedArticles = [...aggregatedArticles, ...rssArticles];
                }
            });

            console.log('📈 [TRACE] Total Aggregated Articles (before validation):', aggregatedArticles.length);

            // Validate and filter articles
            aggregatedArticles = aggregatedArticles.filter(validateArticle);
            console.log('✅ [TRACE] Valid Articles After Filtering:', aggregatedArticles.length);

            // Deduplicate articles
            aggregatedArticles = deduplicateArticles(aggregatedArticles);

            // Apply Strict Filtering for Categories and Regions
            if (endpoint.includes('category/') || endpoint.includes('region/')) {
                const parts = endpoint.split('/');
                const category = parts[parts.length - 1].split('?')[0];
                console.log(`🎯 [TRACE] Applying strict filtering for: ${category}`);
                aggregatedArticles = filterByCategory(aggregatedArticles, category);
            }

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

                // PERSISTENCE FIX: Save articles to local storage to prevent 404 on refresh
                const storedArticles = JSON.parse(localStorage.getItem('news_cache') || '{}');
                aggregatedArticles.forEach(a => {
                    storedArticles[a.id] = a;
                });
                // Keep only last 400 articles to save space
                const keys = Object.keys(storedArticles);
                if (keys.length > 400) {
                    keys.slice(0, keys.length - 400).forEach(k => delete storedArticles[k]);
                }
                localStorage.setItem('news_cache', JSON.stringify(storedArticles));

                return {
                    status: 'success',
                    articles: aggregatedArticles
                };
            }
            throw new Error('No results from any direct API');
        } catch (fallbackError) {
            hideLoading();
            console.log('🧱 [TRACE] Fallback returned empty or wrong endpoint. Using mocks.');
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
        image: '/images/no-image.png',
        publishedAt: new Date().toISOString(),
        source: 'DailyNews Archive',
        category: 'general',
        author: 'Staff'
    }));
}

function validateArticle(article) {
    if (!article || !article.title || article.title === '[Removed]') return false;
    if (!article.url || article.url === 'https://removed.com') return false;
    // Require at least a title and a source
    return article.title.length > 10 && article.source;
}

function deduplicateArticles(articles) {
    const seenUrls = new Set();
    const seenTitles = new Set();
    return articles.filter(article => {
        const titleKey = article.title.toLowerCase().trim();
        if (seenUrls.has(article.url) || seenTitles.has(titleKey)) {
            return false;
        }
        seenUrls.add(article.url);
        seenTitles.add(titleKey);
        return true;
    });
}

function filterByCategory(articles, category) {
    const cat = category.toLowerCase().trim();
    if (cat === 'all' || cat === 'general' || cat === 'world') return articles;
    return articles.filter(article => {
        const articleCat = (article.category || '').toLowerCase();
        const articleTitle = (article.title || '').toLowerCase();
        const articleDesc = (article.description || '').toLowerCase();
        return articleCat.includes(cat) || articleTitle.includes(cat) || articleDesc.includes(cat);
    });
}

function cleanDescription(text) {
    if (!text) return '';
    return text.replace(/<[^>]*>?/gm, '') // Remove HTML
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&apos;/g, "'")
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .trim();
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
                        
                        <!-- Live News Section -->
                        <div class="home-live-section">
                            <div class="live-header">
                                <h2><span class="live-indicator"></span> LIVE GLOBAL NEWS</h2>
                                <button onclick="router.navigate('/video')" class="see-all" style="background:none; border:none; color:#DC143C; cursor:pointer; font-weight:bold;">Watch All Channels &rsaquo;</button>
                            </div>
                            <div class="live-grid">
                                ${LIVE_CHANNELS.slice(0, 3).map(channel => `
                                    <div class="live-card">
                                        <div class="video-thumb">
                                            <iframe src="https://www.youtube.com/embed/${channel.youtubeId}?autoplay=0&mute=1" frameborder="0" allowfullscreen></iframe>
                                        </div>
                                        <div class="live-card-info">
                                            <h3>${channel.name}</h3>
                                            <p>${channel.region}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

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
    showLoading();

    try {
        // Try to find article in persistent cache first (fixes 404 on refresh)
        const storedArticles = JSON.parse(localStorage.getItem('news_cache') || '{}');
        let cachedArticle = storedArticles[articleId] || getArticleFromCache(articleId);

        const trending = await fetchAPI('/api/trending');

        if (!cachedArticle) {
            // Last ditch effort: refresh data and check
            const data = await fetchAPI('/api/news');
            cachedArticle = data.articles.find(a => a.id === articleId);
        }

        if (!cachedArticle) {
            throw new Error('Article not found');
        }

        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;

        window.scrollTo(0, 0);

        mainContent.innerHTML = `
            <div class="container">
                <div class="article-page">
                    <div class="article-main">
                        <article class="article-full">
                            <div class="article-header">
                                <span class="article-category">${(cachedArticle.category || 'GENERAL').toUpperCase()}</span>
                                <h1 class="article-title">${cachedArticle.title}</h1>
                                <div class="article-meta">
                                    <span class="article-author">By ${cachedArticle.author || 'Staff Writer'}</span>
                                    <span class="article-date">${formatDate(cachedArticle.publishedAt)}</span>
                                    <span class="article-source">Source: ${cachedArticle.source}</span>
                                </div>
                            </div>
                            
                            <div class="article-image-container">
                                <img src="${cachedArticle.image}" alt="${cachedArticle.title}" onerror="this.src='/images/no-image.png'">
                            </div>
                            
                            <div class="article-content">
                                ${cachedArticle.type === 'video' && cachedArticle.url && cachedArticle.url.includes('youtube.com') ? `
                                    <div class="video-container mb-8">
                                        <iframe width="100%" height="450" src="https://www.youtube.com/embed/${cachedArticle.url.split('v=')[1]?.split('&')[0]}" frameborder="0" allowfullscreen></iframe>
                                    </div>
                                ` : ''}
                                <p class="article-lead">${cachedArticle.description || ''}</p>
                                <div class="article-body">
                                    ${cachedArticle.content || cachedArticle.description || 'Full coverage is available at the source.'}
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
                        ${renderSidebar(trending.articles || [])}
                    </aside>
                </div>
            </div>
        `;

        updateBookmarkButton(articleId);
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Error rendering article page:', error);
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        mainContent.innerHTML = `
            <div class="container">
                <div class="article-error">
                    <h1>Article Not Found</h1>
                    <p>The article you're looking for could not be found or is no longer available in our temporary cache.</p>
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
                            <img src="${mainArticle.image}" alt="${mainArticle.title}" loading="eager" onerror="this.src='/images/no-image.png'">
                            ${mainArticle.type === 'video' ? '<div class="video-badge-hero">▶ LIVE VIDEO</div>' : ''}
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
                            <img src="${article.image}" alt="${article.title}" loading="lazy" onerror="this.src='/images/no-image.png'">
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
                            <img src="${article.image}" alt="${article.title}" loading="lazy" onerror="this.src='/images/no-image.png'">
                            ${article.type === 'video' ? '<div class="video-badge">▶ VIDEO</div>' : ''}
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
    const experts = [
        {
            name: 'Jeff Koinange',
            source: 'Citizen TV',
            category: 'Politics & Society',
            image: '/images/jeff.jpg',
            bio: 'Award-winning Kenyan journalist, host of JKL and former CNN correspondent with over 30 years of experience.',
            recentArticles: [
                { title: 'The Future of Kenyan Democracy', url: '/search?q=Jeff+Koinange' },
                { title: 'Spotlight on Regional Integration', url: '/search?q=Jeff+Koinange' }
            ]
        },
        {
            name: 'Larry Madowo',
            source: 'CNN International',
            category: 'Business & Tech',
            image: '/images/larry.png',
            bio: 'CNN International Correspondent based in Nairobi. Former BBC Africa Business Editor and tech enthusiast.',
            recentArticles: [
                { title: 'Africa\'s Silicon Savannah Tech Boom', url: '/search?q=Larry+Madowo' },
                { title: 'Digital Transformation in East Africa', url: '/search?q=Larry+Madowo' }
            ]
        },
        {
            name: 'Yvonne Okwara',
            source: 'Citizen TV',
            category: 'Politics & Economy',
            image: '/images/yvonne.jpeg',
            bio: 'Senior journalist and news anchor specializing in political analysis and economic reporting.',
            recentArticles: [
                { title: 'Economic Resilience in East Africa', url: '/search?q=Yvonne+Okwara' },
                { title: 'Political Landscape Shift', url: '/search?q=Yvonne+Okwara' }
            ]
        }
    ];

    return `
        <section class="expert-section">
            <div class="section-header-modern">
                <span class="eyebrow">ELITE ANALYSIS</span>
                <h2>Expert Perspectives</h2>
                <div class="header-line"></div>
            </div>
            
            <div class="expert-list-vertical">
                ${experts.map(expert => `
                    <div class="expert-card-v">
                        <div class="expert-img-container">
                            <img src="${expert.image}" alt="${expert.name}" loading="lazy" onerror="this.src='https://i.pravatar.cc/300?u=${expert.name}'">
                        </div>
                        <div class="expert-info-v">
                            <h3 class="expert-name">${expert.name}</h3>
                            <div class="expert-title">${expert.category} | ${expert.source}</div>
                            <p class="expert-bio">${expert.bio}</p>
                            <div class="expert-article-links">
                                <span class="recent-label" style="font-size: 0.75rem; font-weight: 800; color: #999; margin-bottom: 5px; display: block;">RECENT ANALYSIS</span>
                                ${expert.recentArticles.map(art => `
                                    <a href="${art.url}" class="expert-pub-link">${art.title} &rarr;</a>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
}

function renderSidebar(trendingArticles = []) {
    const now = new Date();
    const cachedArticles = Object.values(JSON.parse(localStorage.getItem('news_cache') || '{}'));
    const allAvailable = [...trendingArticles, ...cachedArticles];
    const seen = new Set();
    const articles = allAvailable.filter(a => {
        if (!a.id || seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
    });

    const filterByDateRange = (articleList, daysAgoStart, daysAgoEnd) => {
        const start = new Date(now.getTime() - daysAgoStart * 24 * 60 * 60 * 1000);
        const end = daysAgoEnd ? new Date(now.getTime() - daysAgoEnd * 24 * 60 * 60 * 1000) : now;
        return articleList.filter(article => {
            const pubDate = new Date(article.publishedAt);
            return pubDate >= start && (!daysAgoEnd || pubDate < end);
        });
    };

    const thisWeekArticles = filterByDateRange(articles, 7).slice(0, 10);
    const lastWeekArticles = filterByDateRange(articles, 14, 7).slice(0, 10);
    const lastMonthArticles = filterByDateRange(articles, 30, 14).slice(0, 10);

    window.__SIDEBAR_DATA__ = {
        'this-week': thisWeekArticles,
        'last-week': lastWeekArticles,
        'last-month': lastMonthArticles
    };

    return `
        <aside class="sidebar">
            <section class="sidebar-section">
                <h3 class="sidebar-title">MOST READ NEWS</h3>
                <div class="sidebar-tabs">
                    <button class="tab-btn active" data-tab="this-week">This Week</button>
                    <button class="tab-btn" data-tab="last-week">Last Week</button>
                    <button class="tab-btn" data-tab="last-month">Last Month</button>
                </div>
                <div class="sidebar-articles" id="sidebar-articles-container">
                    ${thisWeekArticles.length > 0 ? thisWeekArticles.map(article => `
                        <article class="sidebar-article" data-article-id="${article.id}" style="cursor: pointer;">
                            <img src="${article.image}" alt="${article.title}" loading="lazy" onerror="this.src='/images/no-image.png'">
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
router.addRoute('/regions', renderRegionsPage);
router.addRoute('/regions/:name', renderCategoryPage);
router.addRoute('/region/:name', renderRegionPage);
router.addRoute('/article/:id', renderArticlePage);
router.addRoute('/search', renderSearchPage);
router.addRoute('/bookmarks', renderBookmarksPage);
router.addRoute('/watch', renderWatchPage);
router.addRoute('/video', renderVideoPage);
router.addRoute('/signin', renderSignInPage);
router.addRoute('/signup', renderSignUpPage);
router.addRoute('/subscribe', renderSubscribePage);
router.addRoute('/about', renderAboutPage);
router.addRoute('/contact', renderContactPage);
router.addRoute('/advertise', renderAdvertisePage);
router.addRoute('/privacy', renderPrivacyPage);

function initTrendingBar(articles) {
    const ticker = document.getElementById('trending-ticker');
    if (!ticker || !articles || !articles.length) return;

    // Sort: Breaking first, then latest
    const sorted = [...articles].sort((a, b) => {
        if (a.isBreaking && !b.isBreaking) return -1;
        if (!a.isBreaking && b.isBreaking) return 1;
        return new Date(b.publishedAt) - new Date(a.publishedAt);
    });

    ticker.innerHTML = sorted.slice(0, 15).map(a => `
        <span class="ticker-item ${a.isBreaking ? 'breaking-item' : ''}" data-article-id="${a.id}">
            ${a.isBreaking ? '<span class="breaking-tag">BREAKING</span>' : ''}
            ${a.type === 'video' ? '📽️ ' : ''}${a.title}
        </span>
    `).join('<span class="ticker-separator">|</span>');

    ticker.querySelectorAll('.ticker-item').forEach(item => {
        item.addEventListener('click', () => {
            router.navigate(`/article/${item.dataset.articleId}`);
        });
    });
}

async function renderRegionsPage() {
    showLoading();
    // Mix of regional news
    try {
        const [africa, asia, samerica, namerica, europe, oceania, middleeast, asean] = await Promise.all([
            fetchAPI('category/africa'),
            fetchAPI('category/asia'),
            fetchAPI('category/south-america'),
            fetchAPI('region/north-america'),
            fetchAPI('region/europe'),
            fetchAPI('region/oceania'),
            fetchAPI('region/middle-east'),
            fetchAPI('region/asean')
        ]);
        hideLoading();

        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="regions-page container">
                <header class="regions-header">
                    <h1>GLOBAL REGIONS</h1>
                    <p>Bringing you the news from the voices often left unheard.</p>
                </header>
                
                <section class="region-section">
                    <div class="region-title-bar">
                        <h2>AFRICA</h2>
                        <a href="/category/africa" class="see-all">See More Africa News &rsaquo;</a>
                    </div>
                    ${renderNewsGrid(africa.articles.slice(0, 6))}
                </section>

                <section class="region-section">
                    <div class="region-title-bar">
                        <h2>ASIA</h2>
                        <a href="/category/asia" class="see-all">See More Asia News &rsaquo;</a>
                    </div>
                    ${renderNewsGrid(asia.articles.slice(0, 6))}
                </section>

                <section class="region-section">
                    <div class="region-title-bar">
                        <h2>EUROPE</h2>
                        <a href="/region/europe" class="see-all">See More Europe News &rsaquo;</a>
                    </div>
                    ${renderNewsGrid(europe.articles.slice(0, 6))}
                </section>

                <section class="region-section">
                    <div class="region-title-bar">
                        <h2>NORTH AMERICA</h2>
                        <a href="/region/north-america" class="see-all">See More North America News &rsaquo;</a>
                    </div>
                    ${renderNewsGrid(namerica.articles.slice(0, 6))}
                </section>

                <section class="region-section">
                    <div class="region-title-bar">
                        <h2>MIDDLE EAST</h2>
                        <a href="/region/middle-east" class="see-all">See More Middle East News &rsaquo;</a>
                    </div>
                    ${renderNewsGrid(middleeast.articles.slice(0, 6))}
                </section>

                <section class="region-section">
                    <div class="region-title-bar">
                        <h2>SOUTH AMERICA</h2>
                        <a href="/regions/south-america" class="see-all">See More LatAm News &rsaquo;</a>
                    </div>
                    ${renderNewsGrid(samerica.articles.slice(0, 6))}
                </section>

                <section class="region-section">
                    <div class="region-title-bar">
                        <h2>OCEANIA</h2>
                        <a href="/region/oceania" class="see-all">See More Oceania News &rsaquo;</a>
                    </div>
                    ${renderNewsGrid(oceania.articles.slice(0, 6))}
                </section>

                <section class="region-section">
                    <div class="region-title-bar">
                        <h2>ASEAN</h2>
                        <a href="/region/asean" class="see-all">See More ASEAN News &rsaquo;</a>
                    </div>
                    ${renderNewsGrid(asean.articles.slice(0, 6))}
                </section>
            </div>
        `;
    } catch (err) {
        hideLoading();
        showError('Failed to load regions. Please try again.');
    }
}

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
    const brandingInner = document.querySelector('.branding-area .branding-inner');
    const trigger = document.querySelector('.search-toggle');

    if (!brandingInner) return;

    // Remove existing if any
    const existing = document.querySelector('.header-search-bar');
    if (existing) existing.remove();

    const searchBar = document.createElement('div');
    searchBar.className = 'header-search-bar';
    searchBar.style.display = 'none'; // Hidden by default
    searchBar.innerHTML = `
        <form class="search-form">
            <input type="search" id="header-search-input" placeholder="Search news..." name="q" autocomplete="off">
            <button type="submit">
                <svg class="search-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        </form>
    `;
    brandingInner.appendChild(searchBar);

    if (trigger) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = searchBar.style.display === 'none';
            searchBar.style.display = isHidden ? 'block' : 'none';
            if (isHidden) {
                const input = searchBar.querySelector('input');
                if (input) input.focus();
            }
        });
    }

    // Handle form submission
    searchBar.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchBar.querySelector('input').value;
        if (query) {
            router.navigate(`/search?q=${encodeURIComponent(query)}`);
            searchBar.style.display = 'none';
        }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!searchBar.contains(e.target) && e.target !== trigger && !trigger.contains(e.target)) {
            searchBar.style.display = 'none';
        }
    });
}

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

    // Initializations
    initReadingProgress();
    initSearch(); // Initialize unified search logic

    // Global Trending Bar Initialization
    fetchAPI('category/general').then(data => {
        if (data && data.articles) {
            initTrendingBar(data.articles);
        }
    }).catch(err => console.error('Failed to init global trending bar:', err));
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
                    <img src="${article.image}" alt="${article.title}" onerror="this.src='/images/no-image.png'">
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
    const btn = document.querySelector('.load-more-btn');
    if (!btn || btn.disabled) return;

    btn.innerText = '📡 SEARCHING SOURCES...';
    btn.disabled = true;

    try {
        currentPage++;
        // Fetch from multi-source API with potential page/offset
        const news = await fetchAPI(category ? `category/${category}?page=${currentPage}` : `top-headlines?page=${currentPage}`);

        if (news.articles && news.articles.length > 0) {
            const grid = document.querySelector('.news-grid') || document.querySelector('.grid-container');
            if (grid) {
                // Render and append
                news.articles.forEach(article => {
                    const card = document.createElement('div');
                    card.className = 'news-card';
                    card.innerHTML = `
                        <div class="news-image" onclick="router.navigate('/article/${article.id}')">
                            <img src="${article.image}" alt="${article.title}" loading="lazy" onerror="this.src='/images/no-image.png'">
                            ${article.type === 'video' ? '<div class="video-badge">▶ VIDEO</div>' : ''}
                        </div>
                        <div class="news-content">
                            <div class="news-meta">
                                <span class="news-category">${article.category?.toUpperCase() || 'GENERAL'}</span>
                                <span class="news-source">${article.source}</span>
                            </div>
                            <h3 class="news-title" onclick="router.navigate('/article/${article.id}')">${article.title}</h3>
                            <p class="news-excerpt">${article.description}</p>
                            <div class="news-footer">
                                <span class="news-date">${formatDate(article.publishedAt)}</span>
                                <button class="bookmark-btn" onclick="toggleBookmark('${article.id}')">
                                    <i class="${isBookmarked(article.id) ? 'fas' : 'far'} fa-bookmark"></i>
                                </button>
                            </div>
                        </div>
                    `;
                    grid.appendChild(card);
                });
                showToast(`Loaded ${news.articles.length} additional stories.`);
            }
            btn.innerText = '📰 Load More Articles';
            btn.disabled = false;
        } else {
            btn.innerText = 'END OF CONTENT';
            btn.style.opacity = '0.5';
        }
    } catch (error) {
        console.error('Load more failed:', error);
        btn.innerText = '⚠️ RETRY';
        btn.disabled = false;
    }
}

function createArticleCard(article) {
    const card = document.createElement('article');
    card.className = 'news-card';
    card.innerHTML = `
        <div class="news-image">
            <img src="${article.image}" alt="${article.title}" loading="lazy" onerror="this.src='/images/no-image.png'">
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
            const tabId = btn.dataset.tab;
            const articles = (window.__SIDEBAR_DATA__ && window.__SIDEBAR_DATA__[tabId]) || [];

            // Render articles
            if (articles.length > 0) {
                container.innerHTML = articles.map(article => `
                    <article class="sidebar-article" data-article-id="${article.id}" style="cursor: pointer;">
                        <img src="${article.image}" alt="${article.title}" loading="lazy" onerror="this.src='/images/no-image.png'">
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
    // Legacy watch page - redirect to new video page or keep as is
    renderVideoPage();
}

async function renderVideoPage() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="container">
            <section class="watch-hero">
                <div class="watch-highlight">
                    <span>📺 Live International News</span>
                    <span>🌍 24/7 Global Coverage</span>
                </div>
                <h1>Live News Channels</h1>
                <p>Stream trusted newsrooms from across the world in real-time. Experience breaking stories as they happen.</p>
            </section>
            <div class="live-channels-grid">
                ${LIVE_CHANNELS.map(channel => `
                    <div class="live-channel-card">
                        <div class="channel-header">
                            <h3>${channel.name}</h3>
                            <span class="live-badge">🔴 LIVE</span>
                        </div>
                        <div class="video-container">
                            <iframe 
                                src="https://www.youtube.com/embed/${channel.youtubeId}?autoplay=0&mute=0"
                                frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowfullscreen>
                            </iframe>
                        </div>
                        <div class="channel-info">
                            <p>${channel.description}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    updateActiveNav();
}

function renderSignInPage() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="auth-page-wrapper">
            <div class="premium-auth-card">
                <div class="auth-header-premium">
                    <div class="auth-logo">DAILY<span>NEWS</span></div>
                    <h2 class="text-2xl font-bold text-slate-900">Welcome Back</h2>
                    <p class="text-slate-500 mt-2">Sign in to access your premium news</p>
                </div>
                <div class="auth-body-premium">
                    <form id="signin-form">
                        <div class="auth-input-group">
                            <label>Email Address</label>
                            <input type="email" id="signin-email" placeholder="name@example.com" required>
                        </div>
                        <div class="auth-input-group">
                            <label>Password</label>
                            <input type="password" id="signin-password" placeholder="••••••••" required>
                        </div>
                        <button type="submit" class="premium-auth-btn">Sign In to DailyNews</button>
                    </form>
                    
                    <div class="auth-divider">
                        <span>OR</span>
                    </div>
                    
                    <div class="social-auth-buttons">
                        <button onclick="AuthManager.signInWithGoogle()" class="social-auth-btn google-btn">
                            <svg width="18" height="18" viewBox="0 0 18 18">
                                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                                <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
                                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                            </svg>
                            Continue with Google
                        </button>
                        <button onclick="AuthManager.signInWithPhone()" class="social-auth-btn phone-btn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                            </svg>
                            Continue with Phone
                        </button>
                    </div>
                    
                    <div class="auth-links-premium">
                        Don't have an account? <a href="/signup">Sign Up</a>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Attach event listener after DOM is ready
    setTimeout(() => {
        const form = document.getElementById('signin-form');
        if (!form) {
            console.error('Sign-in form not found!');
            return;
        }
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('signin-email').value;
            const password = document.getElementById('signin-password').value;
            AuthManager.signIn(email, password);
        });
    }, 100);

    updateActiveNav();
}

function renderSignUpPage() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="auth-page-wrapper">
            <div class="premium-auth-card">
                <div class="auth-header-premium">
                    <div class="auth-logo">DAILY<span>NEWS</span></div>
                    <h2 class="text-2xl font-bold text-slate-900">Create Account</h2>
                    <p class="text-slate-500 mt-2">Join our global community of readers</p>
                </div>
                <div class="auth-body-premium">
                    <form id="signup-form">
                        <div class="auth-input-group">
                            <label>Full Name</label>
                            <input type="text" id="signup-name" placeholder="John Doe" required>
                        </div>
                        <div class="auth-input-group">
                            <label>Email Address</label>
                            <input type="email" id="signup-email" placeholder="name@example.com" required>
                        </div>
                        <div class="auth-input-group">
                            <label>Create Password</label>
                            <input type="password" id="signup-password" placeholder="••••••••" required>
                        </div>
                        <button type="submit" class="premium-auth-btn">Join DailyNews</button>
                    </form>
                    
                    <div class="auth-divider">
                        <span>OR</span>
                    </div>
                    
                    <div class="social-auth-buttons">
                        <button onclick="AuthManager.signInWithGoogle()" class="social-auth-btn google-btn">
                            <svg width="18" height="18" viewBox="0 0 18 18">
                                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                                <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
                                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                            </svg>
                            Continue with Google
                        </button>
                        <button onclick="AuthManager.signInWithPhone()" class="social-auth-btn phone-btn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                            </svg>
                            Continue with Phone
                        </button>
                    </div>
                    
                    <div class="auth-links-premium">
                        Already have an account? <a href="/signin">Sign In</a>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Attach event listener after DOM is ready
    setTimeout(() => {
        const form = document.getElementById('signup-form');
        if (!form) {
            console.error('Sign-up form not found!');
            return;
        }
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            AuthManager.signUp(email, password, name);
        });
    }, 100);

    updateActiveNav();
}

async function renderSubscribePage() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="premium-pricing-wrapper">
            <canvas id="pricing-particles"></canvas>
            <div class="pricing-accent-lines">
                <div class="hline"></div><div class="hline"></div><div class="hline"></div>
                <div class="vline"></div><div class="vline"></div><div class="vline"></div>
            </div>

            <div class="container relative z-10 py-24">
                <div class="text-center mb-16 max-w-3xl mx-auto">
                    <span class="pricing-kicker">PREMIUM ACCESS</span>
                    <h1 class="pricing-title">Plans & Pricing</h1>
                    <p class="pricing-subtitle">Choose the plan that matches your rhythm and stay ahead of the world.</p>
                    
                    <div class="pricing-toggle-wrap">
                        <span>Monthly</span>
                        <label class="premium-switch">
                            <input type="checkbox" id="pricing-period-toggle">
                            <span class="premium-slider"></span>
                        </label>
                        <span>Yearly <span class="save-tag">SAVE 25%</span></span>
                    </div>
                </div>

                <div class="pricing-grid" id="pricing-cards-container">
                    <!-- Cards rendered by JS to handle toggle -->
                </div>
            </div>
        </div>
    `;

    const toggle = document.getElementById('pricing-period-toggle');
    const container = document.getElementById('pricing-cards-container');

    const plans = [
        {
            id: 'starter',
            name: 'Standard',
            monthly: 0,
            yearly: 0,
            description: 'Essential news for daily readers',
            features: ['Unlimited Article Access', 'Daily Newsletters', 'Standard Support', '5 Personalized Bookmarks'],
            button: 'Current Plan',
            disabled: true
        },
        {
            id: 'premium',
            name: 'Premium',
            monthly: 9.99,
            yearly: 7.49,
            description: 'Ad-free experience with exclusive insights',
            features: ['Zero Advertisements', 'Expert Analysis & Reports', 'Priority Support', 'Unlimited Bookmarks', 'Offline Reading Mode'],
            button: 'Select Premium',
            popular: true
        },
        {
            id: 'annual',
            name: 'Elite VIP',
            monthly: 14.99,
            yearly: 11.25,
            description: 'The ultimate perspective for professionals',
            features: ['All Premium Features', 'Monthly Video Briefings', 'VIP Event Invites', 'Early Access to Investigations', 'Multi-device Sync (5)'],
            button: 'Select Elite'
        }
    ];

    function updateCards() {
        const isYearly = toggle.checked;
        container.innerHTML = plans.map((plan, i) => {
            const displayPrice = isYearly ? plan.yearly : plan.monthly;
            const isAnnualVIP = plan.id === 'annual';
            const features = plan.features.map(f => {
                const isPremiumFeature = f.includes('Expert') || f.includes('Unlimited') || f.includes('Offline');
                const isVIPFeature = f.includes('VIP') || f.includes('Investigations') || f.includes('Multi-device');

                let lockIcon = '';
                if (plan.id === 'starter' && (isPremiumFeature || isVIPFeature)) lockIcon = '🔒 ';
                if (plan.id === 'premium' && isVIPFeature) lockIcon = '🔒 ';

                return `<li><span class="check-icon">✓</span> ${lockIcon}${f}</li>`;
            }).join('');

            return `
            <div class="pricing-card card-animate ${plan.popular ? 'popular' : ''}" style="animation-delay: ${0.25 + i * 0.1}s">
                ${plan.popular ? '<div class="popular-badge">MOST POPULAR</div>' : ''}
                <div class="card-head">
                    <h3>${plan.name}</h3>
                    <p class="card-desc">${plan.description}</p>
                    <div class="card-price">
                        <span class="currency">$</span>
                        <span class="amount">${displayPrice}</span>
                        <span class="period">/${isYearly ? 'mo*' : 'mo'}</span>
                    </div>
                    <p class="billing-note">${isYearly ? `Billed $${(plan.yearly * 12).toFixed(2)} annually` : `Billed monthly`}</p>
                </div>
                
                <div class="card-body">
                    <ul class="pricing-features">
                        ${features}
                    </ul>
                </div>

                <div class="card-foot">
                    <button 
                        onclick="${userSubscription === plan.name ? 'void(0)' : `window.renderBillingStep('${plan.name}', ${displayPrice}, '${plan.id}')`}" 
                        ${(plan.disabled && userSubscription !== plan.name) ? 'disabled' : ''} 
                        class="pricing-btn ${isAnnualVIP ? 'premium' : ''} ${userSubscription === plan.name ? 'active-plan' : ''}"
                    >
                        ${userSubscription === plan.name ? 'Current Active Plan' : plan.button}
                    </button>
                </div>
            </div>
            `;
        }).join('');
    }

    toggle.addEventListener('change', updateCards);
    updateCards();
    initPricingParticles();
    window.scrollTo(0, 0);
}

function initPricingParticles() {
    const canvas = document.getElementById('pricing-particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function setSize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    setSize();
    window.addEventListener('resize', setSize);

    const particles = [];
    const count = 100;

    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            v: Math.random() * 0.5 + 0.1,
            o: Math.random() * 0.5 + 0.1
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.y -= p.v;
            if (p.y < 0) {
                p.y = canvas.height;
                p.x = Math.random() * canvas.width;
            }
            ctx.fillStyle = `rgba(255, 255, 255, ${p.o})`;
            ctx.fillRect(p.x, p.y, 1, 2);
        });
        requestAnimationFrame(animate);
    }
    animate();
}

window.renderBillingStep = function (planName, amount, planIdArg) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    // Use passed ID or fallback to sanitized name
    const planId = planIdArg || planName.toLowerCase().trim().replace(/\s+/g, '-');

    mainContent.innerHTML = `
        <div class="billing-premium-wrapper">
            <canvas id="pricing-particles"></canvas>
            <div class="pricing-accent-lines">
                <div class="hline"></div><div class="hline"></div><div class="hline"></div>
                <div class="vline"></div><div class="vline"></div><div class="vline"></div>
            </div>

            <div class="container relative z-10">
                <div class="billing-glass-card">
                    <button onclick="window.renderSubscribePage()" class="billing-back-btn">
                        <span>&larr;</span> Back to plans
                    </button>
                    
                    <div class="mb-10">
                        <span class="pricing-kicker">CHECKOUT</span>
                        <h2 class="pricing-title" style="font-size: 2.5rem !important;">Billing Information</h2>
                    </div>
                    
                    <div class="billing-summary-premium">
                        <div>
                            <span class="summary-item-label">SELECTED PLAN</span>
                            <div class="summary-item-value">${planName}</div>
                        </div>
                        <div class="text-right">
                            <span class="summary-item-label">AMOUNT DUE</span>
                            <div class="summary-item-price">$${amount}</div>
                        </div>
                    </div>

                    <form id="billing-form" class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="premium-form-group">
                                <label class="premium-label">First Name</label>
                                <input type="text" id="billing-first-name" class="premium-input" placeholder="e.g. John" required>
                            </div>
                            <div class="premium-form-group">
                                <label class="premium-label">Last Name</label>
                                <input type="text" id="billing-last-name" class="premium-input" placeholder="e.g. Doe" required>
                            </div>
                        </div>
                        <div class="premium-form-group">
                            <label class="premium-label">Billing Address</label>
                            <input type="text" id="billing-address" class="premium-input" placeholder="Street address, apartment, etc." required>
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <div class="premium-form-group">
                                <label class="premium-label">City</label>
                                <input type="text" id="billing-city" class="premium-input" placeholder="Nairobi" required>
                            </div>
                            <div class="premium-form-group">
                                <label class="premium-label">Country</label>
                                <input type="text" id="billing-country" class="premium-input" value="Kenya" required disabled>
                            </div>
                        </div>

                        <div id="payment-section-premium">
                            <p class="payment-note">Complete your purchase securely via PayPal</p>
                            <div id="paypal-button-container-${planId}"></div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    // Re-initialize particles for billing page
    if (typeof initPricingParticles === 'function') {
        setTimeout(initPricingParticles, 50);
    }

    // Initialize PayPal
    if (typeof paypal !== 'undefined') {
        const initButtons = (id, amount, desc) => {
            paypal.Buttons({
                createOrder: (data, actions) => {
                    return actions.order.create({
                        purchase_units: [{
                            description: desc,
                            amount: { currency_code: 'USD', value: amount },
                            payee: { email_address: 'ngideon302@gmail.com' }
                        }]
                    });
                },
                onApprove: async (data, actions) => {
                    const order = await actions.order.capture();
                    handleSubscriptionSuccess(order, desc);
                },
                onError: (err) => {
                    console.error('PayPal Error:', err);
                }
            }).render(`#${id}`);
        };

        initButtons(`paypal-button-container-${planId}`, amount.toString(), `DailyNews ${planName} Subscription`);
    }
};

updateActiveNav();

async function handleSubscriptionSuccess(order, plan) {
    if (!currentUser) {
        showToast('Success! Sign in to activate benefits.');
        localStorage.setItem('pending_subscription', JSON.stringify({ orderId: order.id, plan }));
        router.navigate('/signup');
        return;
    }

    try {
        await db.collection('users').doc(currentUser.uid).update({
            subscription: plan,
            orderId: order.id,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast(`✅ You are now ${plan}!`);
        router.navigate('/');
    } catch (error) {
        console.error('Update failed:', error);
        showError('Could not link your subscription. Contact support.');
    }
}

async function processPendingSubscription() {
    if (!currentUser) return;

    const pendingRaw = localStorage.getItem('pending_subscription');
    if (!pendingRaw) return;

    try {
        const pending = JSON.parse(pendingRaw);
        console.log('🔄 Processing pending subscription:', pending.plan);

        await db.collection('users').doc(currentUser.uid).update({
            subscription: pending.plan,
            orderId: pending.orderId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        localStorage.removeItem('pending_subscription');
        userSubscription = pending.plan;
        showToast(`🎉 Subscription Activated: ${pending.plan}!`);

        // Refresh UI if on specific pages
        if (window.location.hash.includes('subscribe')) {
            window.renderSubscribePage();
        }
    } catch (error) {
        console.error('Failed to process pending subscription:', error);
    }
}

function checkFeatureAccess(requiredLevel) {
    const levels = { 'Free': 0, 'Standard': 1, 'Premium': 2, 'Elite VIP': 3 };
    const current = levels[userSubscription] || 0;
    const required = levels[requiredLevel] || 0;
    return current >= required;
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

