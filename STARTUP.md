# Recipe Viewer Startup Instructions

## Starting the Application

1. Open your terminal and navigate to the project directory:
   ```bash
   cd /Users/livia/Desktop/Recipe\ Viewer
   ```

2. Start both the frontend and API servers using the dev script:
   ```bash
   npm run dev
   ```

This will start:
- The webpack dev server on http://localhost:3000 (frontend)
- The API server on http://localhost:3001 (backend)

## Accessing the Application

1. Open your browser
2. Go to http://localhost:3000
3. You should see the Recipe Viewer with:
   - List of recipe cards
   - "List of Recipes" button in the header
   - Recipe images and details

## Important Notes

### Image Serving
The application serves images through a unified path:
- All images are served from `/assets/images/*`
- Image configuration is managed in:
  - Frontend: `src/js/modules/recipe/recipe-list.js`
  - Backend: `src/config/server.config.js`

If you need to add new images:
1. Place them in `src/assets/images/`
2. They will be automatically available at `/assets/images/[filename]`

### Troubleshooting
If you see missing images:
1. Make sure both servers are running (`npm run dev`)
2. Check that images exist in `src/assets/images/`
3. Clear your browser cache
4. Restart both servers using the commands in the "Stopping Servers" section

## Stopping the Servers

If you need to stop the servers at any time:
```bash
pkill -f "node server.js" && pkill -f "webpack"
```

## What's Running

The `npm run dev` command starts:
1. Frontend (Webpack Dev Server)
   - Serves the web application
   - Handles hot reloading
   - Port: 3000
   - Serves static assets through unified paths

2. Backend (Express API Server)
   - Serves recipe data
   - Handles API requests
   - Port: 3001
   - Serves static assets through consistent configuration

Note: The `npm run dev` command uses `concurrently` to run both servers at once, so you only need this one command to start everything. 