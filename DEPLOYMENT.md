# Recipe Viewer Deployment Guide

This document provides detailed instructions for deploying the Recipe Viewer application to production environments, with a focus on GitHub Pages deployment.

## Production Build

Before deploying, you need to create a production build of the application:

### 1. Prepare for Production

Make sure all your changes are committed to version control:

```bash
git add .
git commit -m "Prepare for production build"
```

### 2. Create a Production Build

Run the build script to create a production-optimized version:

```bash
npm run build
```

This will:
- Create a `dist` directory with optimized assets
- Minify JavaScript and CSS
- Optimize images
- Generate HTML files with proper resource paths

### 3. Test the Production Build Locally

Before deploying, test the production build locally to ensure everything works:

```bash
npx serve -s dist
```

This will serve your production build at http://localhost:5000. Verify that:
- All pages load correctly
- Images display properly
- Recipe data loads successfully
- All features work as expected

## GitHub Pages Deployment

The Recipe Viewer is configured for easy deployment to GitHub Pages:

### 1. Create a Backup

Before deploying, create a backup of your current codebase:

```bash
mkdir -p backups/$(date +%Y%m%d_%H%M%S)
rsync -av --exclude 'node_modules' --exclude 'dist' ./ backups/$(date +%Y%m%d_%H%M%S)/
```

### 2. Configure GitHub Pages Settings

Ensure your GitHub repository is configured for GitHub Pages:

1. Go to your repository on GitHub
2. Navigate to Settings > Pages
3. Set the Source to "GitHub Actions" (recommended) or "Deploy from a branch"
4. If using branch deployment, select the `gh-pages` branch

### 3. Deploy to GitHub Pages

Run the deploy script:

```bash
npm run deploy
```

This script:
- Creates a production build
- Pushes the build to the `gh-pages` branch
- Makes your site available at `https://<username>.github.io/<repository-name>/`

### 4. Verify the Deployment

After deployment (which may take a few minutes):

1. Visit your GitHub Pages URL: `https://<username>.github.io/<repository-name>/`
2. Test all functionality to ensure it works in the production environment
3. Check browser console for any errors

## Production Configuration

The Recipe Viewer automatically adjusts its configuration for production environments:

### Base Path Configuration

In `webpack.config.js`, the `publicPath` is set dynamically based on the environment:

```javascript
const publicPath = isProduction ? '/recipe_viewer/' : '/';
```

This ensures assets are loaded correctly when deployed to GitHub Pages.

### Asset Path Configuration

In the recipe modules, asset paths are configured based on the detected environment:

```javascript
const ASSET_CONFIG = {
    development: {
        recipesPath: '/assets/recipes',
        imagePath: '/assets/images'
    },
    production: {
        recipesPath: '/assets/recipes',
        imagePath: '/assets/images'
    }
};
```

## Versioning and Releases

For a more structured deployment process, consider using Git tags for versioning:

### Creating a Release Version

```bash
# Tag the current commit with a version number
git tag -a v1.0.0 -m "Version 1.0.0"

# Push the tag to the remote repository
git push origin v1.0.0
```

### Deploying a Specific Version

```bash
# Checkout the specific version
git checkout v1.0.0

# Deploy that version
npm run deploy
```

## Troubleshooting Deployment Issues

### Missing Assets

If images or recipes are missing in the deployed version:

1. Check that all assets are correctly included in the `CopyWebpackPlugin` configuration in `webpack.config.js`
2. Verify that asset paths in the code use the correct format for both development and production

### 404 Errors on Page Refresh

If you get 404 errors when refreshing pages on GitHub Pages:

1. Ensure that `historyApiFallback` is properly configured in `webpack.config.js`
2. Add a custom 404.html page that redirects to index.html with the correct path

### Path Issues

If links or assets don't load correctly in production:

1. Check that all paths use the `publicPath` configuration
2. Ensure that the `publicPath` in `webpack.config.js` matches your GitHub Pages repository name

## Continuous Integration/Deployment

For automated deployments, consider setting up a GitHub Action:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
          
      - name: Install Dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Deploy
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: dist
```

Save this as `.github/workflows/deploy.yml` in your repository to enable automatic deployments when pushing to the main branch. 