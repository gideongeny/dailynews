// ===========================
// Client-Side Router
// ===========================

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
        const [pathname, search] = path.split('?');
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
    try {
        showLoading();
        const response = await fetch(endpoint);
        const data = await response.json();
        hideLoading();

        if (data.status === 'success') {
            return data;
        } else {
            throw new Error(data.message || 'API request failed');
        }
    } catch (error) {
        hideLoading();
        console.error('API Error:', error);
        // Don't show error for every failed request, just log it
        throw error;
    }
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
                        ${renderAdBanner()}
                        ${data.articles && data.articles.length > 0 ? renderHeroSection(data.articles[0], data.articles.slice(1, 3)) : '<p>No articles available</p>'}
                        ${data.articles && data.articles.length > 3 ? renderNewsGrid(data.articles.slice(3), 'LATEST STORIES') : ''}
                        ${renderColumnistsSection()}
                    </div>
                    ${renderSidebar(trending.articles || [])}
                </div>
            </div>
        `;

        attachArticleClickHandlers();
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
                            <img src="${mainArticle.image}" alt="${mainArticle.title}" loading="eager" onerror="this.src='images/World Bank.jpg'" style="max-width: 100%; height: auto; object-fit: cover;">
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
                            <img src="${article.image}" alt="${article.title}" loading="lazy" onerror="this.src='images/World Bank.jpg'" style="max-width: 100%; height: auto; object-fit: cover;">
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

function renderColumnistsSection() {
    return `
        <section class="columnists-section">
            <h2 class="section-title-white">COLUMNISTS</h2>
            <div class="columnists-grid">
                <article class="columnist-card">
                    <div class="columnist-avatar">
                        <img src="/images/ffhxyohfelhiamortx5q.avif" alt="John Doe" loading="lazy">
                    </div>
                    <div class="columnist-info">
                        <h3 class="columnist-name">John Doe</h3>
                        <p class="columnist-title">Political Analyst</p>
                        <p class="columnist-excerpt">Expert commentary on political developments</p>
                    </div>
                </article>
                <article class="columnist-card">
                    <div class="columnist-avatar">
                        <img src="/images/ffhxyohfelhiamortx5q.avif" alt="Jane Smith" loading="lazy">
                    </div>
                    <div class="columnist-info">
                        <h3 class="columnist-name">Jane Smith</h3>
                        <p class="columnist-title">Economics Editor</p>
                        <p class="columnist-excerpt">In-depth economic analysis and insights</p>
                    </div>
                </article>
                <article class="columnist-card">
                    <div class="columnist-avatar">
                        <img src="/images/ffhxyohfelhiamortx5q.avif" alt="Mike Johnson" loading="lazy">
                    </div>
                    <div class="columnist-info">
                        <h3 class="columnist-name">Mike Johnson</h3>
                        <p class="columnist-title">Sports Columnist</p>
                        <p class="columnist-excerpt">Covering the latest in sports and athletics</p>
                    </div>
                </article>
                <article class="columnist-card">
                    <div class="columnist-avatar">
                        <img src="/images/ffhxyohfelhiamortx5q.avif" alt="Sarah Williams" loading="lazy">
                    </div>
                    <div class="columnist-info">
                        <h3 class="columnist-name">Sarah Williams</h3>
                        <p class="columnist-title">Culture Critic</p>
                        <p class="columnist-excerpt">Exploring arts, culture, and society</p>
                    </div>
                </article>
            </div>
        </section>
    `;
}

function renderSidebar(trendingArticles = []) {
    return `
        <aside class="sidebar">
            <section class="sidebar-section">
                <h3 class="sidebar-title">MOST READ NEWS</h3>
                <div class="sidebar-tabs">
                    <button class="tab-btn active" data-tab="this-week">This Week</button>
                    <button class="tab-btn" data-tab="last-week">Last Week</button>
                    <button class="tab-btn" data-tab="last-month">Last Month</button>
                </div>
                <div class="sidebar-articles">
                    ${trendingArticles.map(article => `
                        <article class="sidebar-article">
                            <img src="${article.image}" alt="${article.title}" loading="lazy" onerror="this.src='/images/World Bank.jpg'">
                            <div class="sidebar-article-content">
                                <h4>${article.title}</h4>
                                <div class="sidebar-meta">
                                    <span class="sidebar-date">${formatDate(article.publishedAt)}</span>
                                </div>
                            </div>
                        </article>
                    `).join('')}
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

function updateActiveNav(page) {
    // Remove active class from all nav items
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
        // Match category/region routes
        else if (currentPath.startsWith('/category/') && href === currentPath) {
            item.classList.add('active');
        }
        else if (currentPath.startsWith('/region/') && href === currentPath) {
            item.classList.add('active');
        }
        // Match article pages (keep home active)
        else if (currentPath.startsWith('/article/') && href === '/') {
            // Don't add active to home when on article page
        }
        // Match search page
        else if (currentPath === '/search' && href === '/') {
            // Don't add active to home when on search page
        }
    });
}

// ===========================
// Initialize Router
// ===========================

const router = new Router();

// Define routes
router.addRoute('/', renderHomePage);
router.addRoute('/category/:name', renderCategoryPage);
router.addRoute('/region/:name', renderRegionPage);
router.addRoute('/article/:id', renderArticlePage);
router.addRoute('/search', renderSearchPage);
router.addRoute('/bookmarks', renderBookmarksPage);

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
    router.navigate = function(path) {
        originalNavigate(path);
        setTimeout(() => {
            updateActiveNav();
        }, 100);
    };

    const originalLoadRoute = router.loadRoute.bind(router);
    router.loadRoute = async function(path) {
        await originalLoadRoute(path);
        setTimeout(() => {
            updateActiveNav();
        }, 100);
    };

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
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('✅ Service Worker registered'))
            .catch(err => console.log('❌ Service Worker registration failed:', err));
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

router.addRoute('/bookmarks', renderBookmarksPage);

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

