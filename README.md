# DAILYNEWS - Premium News Platform

![DailyNews Homepage](file:///c:/Users/mukht/Desktop/vs%20code%20projects/newsweek-main/public/images/screenshot.png)

## Premium Experience
DAILYNEWS v1.1.1 is a high-performance news aggregator with a world-class design:
- **Premium Subscription**: Glassmorphism pricing cards, animated particles, and dynamic logic.
- **Global Trending Bar**: Real-time news ticker with "swallow" effect labels.
- **Regional Content**: Dedicated feeds for Africa, Asia, Europe, Middle East, Oceania, and ASEAN.
- **Interactive Sidebar**: Historical news tracking (This Week, Last Week, Last Month).
- **Responsive Media**: Integrated video badges and live YouTube news channels.

## Requirements
Before starting, make sure you have:
- **Node.js** installed ([Download](https://nodejs.org/))
- **Firebase CLI** (for hosting/functions)

## How to Get Started (3 Simple Steps)

### Step 1: Open the Project Folder

1. Open your terminal/command prompt
2. Navigate to the project folder:
   ```bash
   cd "C:\Users\mukht\Desktop\vs code projects\newsweek-main"
   ```
   (Or wherever you saved the project)

### Step 2: Install Required Files

Type this command and press Enter:
```bash
npm install
```

Wait for it to finish (it will take a minute or two). You'll see a message when it's done.

### Step 3: Start the Website

Type this command and press Enter:
```bash
npm start
```

You should see a message like:
```
🚀 Server running on http://localhost:3000
```

## Open the Website

1. Open your web browser (Chrome, Firefox, Edge, etc.)
2. Type this in the address bar: `http://localhost:3000`
3. Press Enter

**That's it! Your website is now running!** 🎉

## How to Use the Website

- **Click any category** at the top (HOME, POLITICS, ECONOMY, etc.) to see news in that category
- **Use the search bar** to find articles about specific topics
- **Click on any news card** to read the full article
- **Bookmark articles** you want to save for later

## Stop the Website

When you're done, go back to the terminal/command prompt and press:
```
Ctrl + C
```

This will stop the server.

## Troubleshooting

### "npm is not recognized"
- This means Node.js isn't installed or isn't in your PATH
- Download and install Node.js from [nodejs.org](https://nodejs.org/)
- Restart your computer after installing

### "Port 3000 is already in use"
- Another program is using port 3000
- Close other programs or restart your computer
- Or change the port number in `proxy.mjs` (line 11) from `3000` to `3001`

### Website looks broken (no colors/styling)
- Press `Ctrl + F5` to refresh the page (this clears the cache)
- Make sure the server is running (`npm start`)
- Check that you're going to `http://localhost:3000`

### Can't see any news
- The website uses mock data by default, so news should always appear
- Check your internet connection
- Try refreshing the page

## What's Inside This Project

```
newsweek-main/
├── index.html       → The main webpage
├── style.css        → All the colors and design
├── script.js        → Makes everything work
├── proxy.mjs        → The server that runs the website
├── config.mjs       → Settings for news APIs
└── images/          → Pictures for the news articles
```

## Need Help?

If something doesn't work:
1. Make sure Node.js is installed
2. Make sure you ran `npm install`
3. Make sure you ran `npm start`
4. Check that you're going to the right address: `http://localhost:3000`

## Mobile, Tablet & Desktop

The website works perfectly on:
- 📱 **Mobile phones** (iPhone, Android)
- 📱 **Tablets** (iPad, Android tablets)
- 💻 **Desktop computers** (Windows, Mac, Linux)

The design automatically adjusts to fit any screen size!

## Publish Your Website Online

Want to share your website with the world? See `DEPLOY.md` for simple step-by-step instructions to publish it online for free!

Popular options:
- **Vercel** (easiest, recommended)
- **Netlify** (also very easy)
- **Render** (good for backend)

All are free and take just a few minutes to set up!

## That's All!

You now have a working news website. Just remember:
1. `npm install` (only needed once)
2. `npm start` (every time you want to use the website)
3. Open `http://localhost:3000` in your browser

Enjoy! 📰
