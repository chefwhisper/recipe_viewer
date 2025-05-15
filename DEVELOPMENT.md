# Recipe Viewer Development Guide

This document provides detailed information for developers working on the Recipe Viewer application.

## Development Environment Setup

### Prerequisites

- Node.js (v14.0.0 or higher)
- npm (comes with Node.js)
- A modern web browser (Chrome, Firefox, Safari, or Edge)

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd recipe-viewer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run start
   ```
   This will start the webpack dev server on http://localhost:3000.

## Code Organization

### Directory Structure

The application follows a modular structure:

```
src/
├── js/
│   ├── index.js                     # Main entry point
│   ├── core/                        # Core utilities
│   │   └── events/
│   │       └── event-bus.js         # Application event system
│   └── modules/                     # Feature modules
│       ├── recipe/                  # Recipe functionality
│       │   ├── recipe-data.js       # Data loading
│       │   ├── recipe-list.js       # Recipe grid display
│       │   └── recipe-summary.js    # Recipe detail view
│       ├── cooking/                 # Cooking mode
│       ├── timer/                   # Timer functionality
│       └── shopping/                # Shopping list
├── html/                            # HTML templates
├── styles/                          # CSS files
└── assets/                          # Static assets
    ├── images/                      # Image files
    └── recipes/                     # Recipe JSON files
        ├── index.json               # Recipe index
        └── recipe-*.json            # Individual recipes
```

### Key Components

1. **Recipe Data Module (`recipe-data.js`)**
   - Handles loading recipe data from JSON files
   - Provides environment detection for correct path resolution
   - Exports `loadRecipeData()` and `listRecipes()` functions

2. **Recipe List Module (`recipe-list.js`)**
   - Displays the grid of recipe cards on the main page
   - Loads recipe metadata from index.json
   - Handles recipe card click events

3. **Recipe Summary Module (`recipe-summary.js`)**
   - Displays detailed recipe information
   - Loads both recipe index and detailed recipe data
   - Provides navigation to cooking mode

## Development Workflow

### Adding a New Recipe

1. **Create the recipe JSON file:**
   - Add a new JSON file in `src/assets/recipes/` named `recipe-[name].json`
   - Follow the existing recipe format with required fields:
     - title
     - metadata
     - ingredients
     - steps

2. **Add the recipe to the index:**
   - Update `src/assets/recipes/index.json` with a new entry:
     ```json
     {
       "id": "recipe-[name]",
       "title": "Recipe Title",
       "thumbnail": "images/recipe-[name].jpg",
       "time": "XX minutes",
       "difficulty": "Easy|Medium|Hard"
     }
     ```

3. **Add the recipe image:**
   - Place the image in `src/assets/images/` with the name `recipe-[name].jpg`

### Browser vs. Server Environment

The application uses environment detection to work in both browser and server contexts:

```javascript
// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Determine environment based on URL/hostname if in browser
const isDevelopment = isBrowser ? 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1') :
    true; // Default to development in Node.js environment
```

When developing, be aware of this pattern and ensure code that references browser-specific objects (like `window` or `document`) is only executed in a browser context.

### Working with Static Assets

- All static assets are served directly by the webpack dev server
- The webpack configuration includes paths for serving:
  - Recipe JSON files from `src/assets/recipes/`
  - Images from `src/assets/images/`
  - CSS from `src/styles/`

### Testing Changes

1. **Start the development server:**
   ```bash
   npm run start
   ```

2. **View the application:**
   Open http://localhost:3000 in your browser

3. **Use browser developer tools:**
   - Check the Console for errors
   - Use Network tab to verify assets are loading correctly
   - Use Application tab to inspect local storage if needed

## Common Development Tasks

### Modifying the Recipe Data Structure

If you need to change the recipe data structure:

1. Update the JSON files in `src/assets/recipes/`
2. Modify the corresponding code in `recipe-data.js`, `recipe-list.js`, and `recipe-summary.js`
3. Update any UI components that display the data

### Adding a New Feature

1. Create a new module in the appropriate directory under `src/js/modules/`
2. Import the module in the relevant entry point file
3. Update HTML templates as needed
4. Add CSS styles in `src/styles/`

### Troubleshooting

- **"window is not defined" errors:**
  - This occurs when running server-side code that references browser objects
  - Use the `isBrowser` check before accessing browser-specific objects

- **Images not loading:**
  - Check that image paths in the recipe JSON files match the actual file names
  - Verify that webpack is correctly configured to serve the images

- **Hot reloading not working:**
  - Ensure you're using `npm run start` for development
  - Check for errors in the terminal or browser console 