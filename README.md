# DAILYNEWS - Modern News Website

A world-class news website built with Node.js, Express, and vanilla JavaScript. Features real-time news from multiple APIs, beautiful modern design, and full navigation functionality.

## 🚀 Features

- **Real-time News**: Fetches news from NewsData.io and TheNewsAPI
- **Multiple Categories**: Politics, Economy, World, Sports, Technology, Health, and more
- **Search Functionality**: Search for articles across all categories
- **Article Pages**: Full article view with social sharing
- **Bookmarks**: Save articles for later reading
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern UI**: Beautiful gradients, animations, and typography
- **Fast Loading**: Caching system for optimal performance

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (for cloning) - [Download here](https://git-scm.com/)

## 🛠️ Installation

### Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd newsweek-main
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages:
- `express` - Web server framework
- `node-fetch` - For making API requests

## ⚙️ Configuration

### Step 3: Configure API Keys (Optional)

The website works with mock data by default, but you can add your own API keys for real news:

1. Open `config.mjs`
2. Add your API keys:
   - **NewsData.io API Key**: Get one at [newsdata.io](https://newsdata.io/)
   - **TheNewsAPI Key**: Get one at [thenewsapi.com](https://www.thenewsapi.com/)

```javascript
NEWSDATA_API_KEYS: [
    'your-newsdata-api-key-here'
],
THENEWSAPI_KEY: 'your-thenewsapi-key-here'
```

**Note**: The website will work with mock data even without API keys!

## 🚀 Launching the Website

### Step 4: Start the Server

```bash
npm start
```

You should see:

```
╔════════════════════════════════════════╗
║                                        ║
║         DAILY NEWS SERVER              ║
║         Multi-Page Edition             ║
║                                        ║
╚════════════════════════════════════════╝
🚀 Server running on http://localhost:3000
```

### Step 5: Open in Browser

Open your web browser and navigate to:

```
http://localhost:3000
```

## 📱 Using the Website

### Navigation

- Click any category in the top navigation (HOME, POLITICS, ECONOMY, etc.)
- Use the search bar to find specific articles
- Click on any news card to read the full article

### Features

- **Search**: Type in the search bar and press Enter
- **Bookmarks**: Click the bookmark icon on article pages
- **Share**: Use social sharing buttons on article pages
- **Categories**: Browse news by category

## 🛑 Stopping the Server

Press `Ctrl + C` in the terminal to stop the server.

## 📁 Project Structure

```
newsweek-main/
├── index.html          # Main HTML file
├── style.css           # All styles and design
├── script.js           # Client-side JavaScript and routing
├── proxy.mjs           # Express server and API endpoints
├── config.mjs          # API configuration
├── package.json        # Project dependencies
├── images/             # News images
└── README.md          # This file
```

## 🔧 Troubleshooting

### Port Already in Use

If port 3000 is already in use, you can change it:

1. Open `proxy.mjs`
2. Find: `const PORT = process.env.PORT || 3000;`
3. Change to: `const PORT = process.env.PORT || 3001;`
4. Access at: `http://localhost:3001`

### CSS Not Loading

1. Hard refresh your browser: `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)
2. Check browser console (F12) for errors
3. Verify CSS file is accessible at: `http://localhost:3000/style.css`

### API Errors

- The website uses mock data as fallback
- Check your API keys in `config.mjs` if you want real news
- Mock data will work even if APIs fail

## 🌐 API Endpoints

The server provides these endpoints:

- `GET /api/news` - Get all news
- `GET /api/news/category/:category` - Get news by category
- `GET /api/news/region/:region` - Get news by region
- `GET /api/search?q=query` - Search articles
- `GET /api/trending` - Get trending articles
- `GET /health` - Server health check

## 🎨 Customization

### Changing Colors

Edit `style.css` and search for color values:
- `#dc143c` - Primary red color
- `#1a1a1a` - Dark text
- `#f8f9fa` - Light background

### Changing Fonts

The website uses:
- **Playfair Display** - For headings (serif)
- **Inter** - For body text (sans-serif)

Change fonts in `index.html` and `style.css`.

## 📝 License

This project is open source and available for personal and commercial use.

## 🤝 Contributing

Feel free to fork this project and submit pull requests for improvements!

## 📧 Support

For issues or questions, please open an issue on GitHub.

---

**Enjoy your news website!** 📰✨

