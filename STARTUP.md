# Recipe Viewer Startup Instructions

## Starting the Application

1. Open your terminal and navigate to the project directory:
   ```bash
   cd /path/to/recipe-viewer
   ```

2. Start the webpack dev server (recommended):
   ```bash
   npm run start
   ```

   This will start the webpack dev server on http://localhost:3000, which is all you need to run the application.

3. Alternative: Start both servers (not typically needed):
   ```bash
   npm run dev
   ```

   This will start:
   - The webpack dev server on http://localhost:3000 (frontend)
   - The static file server on http://localhost:3001 (optional)

## Accessing the Application

1. Open your browser
2. Go to http://localhost:3000
3. You should see the Recipe Viewer with:
   - List of recipe cards
   - "List of Recipes" button in the header
   - Recipe images and details

## Important Notes

### Static File Serving
The application serves static files directly through the webpack dev server:
- Recipe data is loaded from JSON files in `src/assets/recipes/`
- Images are served from `src/assets/images/`
- No API endpoints are required

### Image Configuration
Image paths are configured in:
- `src/js/modules/recipe/recipe-list.js`
- `src/js/modules/recipe/recipe-summary.js`

If you need to add new images:
1. Place them in `src/assets/images/`
2. They will be automatically available at `/assets/images/[filename]`
3. Reference them in recipe JSON files as `"thumbnail": "images/[filename]"`

### Troubleshooting
If you see missing images:
1. Check that images exist in `src/assets/images/`
2. Verify that image paths in recipe JSON files are correct
3. Clear your browser cache
4. Restart the server using the commands in the "Stopping Servers" section

### Browser Environment Detection
The application includes environment detection to handle both browser and server contexts:
```javascript
const isBrowser = typeof window !== 'undefined';
```

If you see "window is not defined" errors in the server logs, this is normal and can be ignored when using `npm run dev`.

## Stopping the Servers

If you need to stop the servers at any time:
```bash
# If using npm run start
pkill -f "webpack"

# If using npm run dev
pkill -f "node server.js" && pkill -f "webpack"
```

## What's Running

The `npm run start` command runs:
- Webpack Dev Server
  - Serves the web application
  - Handles hot reloading
  - Port: 3000
  - Serves static assets (images, recipe JSON files, styles)
  - Handles routing with history API fallback

The optional `npm run dev` command additionally runs:
- Express Static File Server
  - Serves static assets
  - Port: 3001
  - Not required for normal development 