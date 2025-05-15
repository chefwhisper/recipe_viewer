# Recipe Viewer Application

An interactive recipe viewer application that helps users follow cooking instructions with features like cooking mode and an integrated timer system.

## Quick Start

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start the Application (Recommended Method):**
   ```bash
   npm run start
   ```
   This command starts only the webpack dev server, which is all you need to run the application.

3. **Alternative Start Methods:**
   ```bash
   # Only if you need both servers (not typically required):
   npm run dev:clean
   
   # If you want to manually check ports first:
   lsof -i :3000 | grep LISTEN
   kill -9 <PID>
   npm run start
   ```

4. **Access the Application:**
   Open your browser and navigate to `http://localhost:3000`

## Features

### Recipe Summary
- Detailed recipe information including ingredients, cooking time, and difficulty level
- Clear, step-by-step instructions
- High-quality images of the finished dish
- Serving size adjustments

### Cooking Mode
- Distraction-free interface
- Large, easy-to-read text
- Step-by-step navigation
- Progress tracking
- Keep screen active during cooking

### Timer System
- Multiple concurrent timers
- Visual and audio alerts
- Timer presets for common cooking operations
- Pause and resume functionality

## Project Structure

```
recipe-viewer/
├── src/
│   ├── styles/            # Stylesheets
│   │   ├── main.css       # Global styles
│   │   └── components/    # Component-specific styles
│   ├── js/
│   │   ├── index.js       # Main entry point
│   │   ├── modules/       # Feature modules
│   │   │   ├── recipe/    # Recipe-related functionality
│   │   │   ├── cooking/   # Cooking mode functionality
│   │   │   ├── timer/     # Timer functionality
│   │   │   ├── voice/     # Voice control functionality
│   │   │   ├── shopping/  # Shopping list functionality
│   │   │   └── core/      # Core functionality
│   │   └── core/          # Core utilities
│   ├── html/              # HTML templates
│   │   ├── index.html     # Main page
│   │   ├── recipe-summary.html # Recipe details page
│   │   └── cooking.html   # Cooking mode page
│   └── assets/            # Static assets
│       ├── recipes/       # Recipe JSON files
│       └── images/        # Image files
├── server.js              # Express server for static file serving (optional)
├── webpack.config.js      # Webpack configuration
├── package.json           # Project dependencies
└── docs/                  # Additional documentation
    └── startup.md         # Detailed startup instructions
```

## Application Architecture

The Recipe Viewer uses a client-side architecture that loads recipe data directly from JSON files:

1. **Static File Serving**: 
   - All recipe data is stored in JSON files in `src/assets/recipes/`
   - The main recipe index is in `src/assets/recipes/index.json`
   - Individual recipe details are in separate JSON files

2. **No API Required**:
   - The application is designed to work without any backend API
   - All data is loaded directly from static JSON files
   - The webpack dev server serves these files directly

3. **Browser Environment Detection**:
   - The code includes environment detection to work in both development and production
   - Paths are configured appropriately based on the detected environment

## Available Scripts

- `npm run start`: Start the webpack dev server (recommended for development)
- `npm run build`: Create a production build
- `npm run test`: Run tests
- `npm run lint`: Lint JavaScript files
- `npm run deploy`: Deploy to GitHub Pages

## GitHub Pages Deployment

To deploy to GitHub Pages:

1. **Build and Test Locally First**:
   ```bash
   npm run build
   npx serve -s dist
   ```

2. **Create a Backup Before Deploying**:
   ```bash
   mkdir -p backups/$(date +%Y%m%d_%H%M%S)
   rsync -av --exclude 'node_modules' --exclude 'dist' ./ backups/$(date +%Y%m%d_%H%M%S)/
   ```

3. **Deploy to GitHub Pages**:
   ```bash
   npm run deploy
   ```

4. **Verify the Deployment**:
   Check your GitHub Pages URL to ensure everything is working correctly.

## Troubleshooting

### Common Issues

1. **"Address already in use" errors**:
   ```
   Error: listen EADDRINUSE: address already in use :::3000
   ```
   
   **Solution**: Kill the process and restart:
   ```bash
   # Find the process using port 3000
   lsof -i :3000 | grep LISTEN
   # Kill the process
   kill -9 <PID>
   # Start again
   npm run start
   ```

2. **"window is not defined" errors in server logs**:
   
   **Solution**: This is normal when running the server.js file. The application is designed to run in the browser, and some code checks for browser-specific objects. You can ignore these errors or simply use `npm run start` instead of `npm run dev`.

3. **Images not loading**:
   
   **Solution**: Check that the image paths in the recipe JSON files match the actual file names in the src/assets/images directory. Image references should use the format:
   ```json
   "thumbnail": "images/recipe-name.jpg"
   ```

4. **Missing modules after pulling updates**:
   
   **Solution**: Reinstall dependencies:
   ```bash
   npm install
   ```

## Development Guidelines

### Code Style
- Use consistent indentation (2 spaces)
- Follow JavaScript ES6+ conventions
- Write meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### JavaScript Best Practices
- Use modular architecture
- Implement error handling
- Write unit tests for critical functionality
- Optimize performance
- Follow accessibility guidelines

## Browser Support

The application supports the following browsers:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Additional Documentation

For more detailed instructions, refer to [docs/startup.md](docs/startup.md).

## Acknowledgments

- Icons provided by [Font Awesome](https://fontawesome.com/)
- Recipe data structure inspired by industry standards
- Voice recognition powered by Web Speech API

## Documentation

- [Project Structure](docs/architecture/project-structure.md): Detailed documentation of the codebase organization 