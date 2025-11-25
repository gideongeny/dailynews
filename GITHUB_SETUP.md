# GitHub Setup Guide

Follow these steps to push your DAILYNEWS website to GitHub:

## Step 1: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right corner
3. Select **"New repository"**
4. Fill in the details:
   - **Repository name**: `dailynews` (or any name you prefer)
   - **Description**: "Modern news website with real-time updates"
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **"Create repository"**

## Step 2: Connect Your Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these:

### Option A: If you haven't pushed yet (First time)

```bash
git remote add origin https://github.com/YOUR_USERNAME/dailynews.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

### Option B: If you need to authenticate

If you're asked for credentials:

1. **For HTTPS**: Use a Personal Access Token instead of password
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with `repo` permissions
   - Use the token as your password

2. **For SSH** (Recommended):
   ```bash
   git remote set-url origin git@github.com:YOUR_USERNAME/dailynews.git
   git push -u origin main
   ```

## Step 3: Verify the Push

1. Go to your GitHub repository page
2. You should see all your files there
3. The README.md will automatically display on the repository homepage

## Step 4: Future Updates

Whenever you make changes, use these commands:

```bash
git add .
git commit -m "Description of your changes"
git push
```

## Troubleshooting

### If you get "remote origin already exists"

```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/dailynews.git
```

### If you get authentication errors

- Use Personal Access Token instead of password
- Or set up SSH keys: [GitHub SSH Guide](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)

### If you want to change the remote URL

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/dailynews.git
```

---

**Your website is now on GitHub!** 🎉

You can share the repository URL with others, and they can clone it using:
```bash
git clone https://github.com/YOUR_USERNAME/dailynews.git
```

