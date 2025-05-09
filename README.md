# Recipe Viewer Application

An interactive recipe viewer application that helps users follow cooking instructions with features like cooking mode, voice control, and an integrated timer system.

## Quick Start

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start the Application (Recommended Method):**
   ```bash
   npm run dev:clean
   ```
   This command will automatically kill any processes using ports 3000 and 3001 before starting the application.

3. **Alternative Start Methods:**
   ```bash
   # Only if you're sure the ports are free:
   npm run dev
   
   # If you want to manually check ports first:
   lsof -i :3000 -i :3001 | grep LISTEN
   kill -9 <PID>
   npm run dev
   ```

4. **Access the Application:**
   Open your browser and navigate to `http://localhost:3000`

## Features

### Recipe Summary
- Detailed recipe information including ingredients, cooking time, and difficulty level
- Clear, step-by-step instructions
- High-quality images of the finished dish
- Serving size adjustments
- Nutritional information

### Cooking Mode
- Distraction-free interface
- Large, easy-to-read text
- Step-by-step navigation
- Progress tracking
- Keep screen active during cooking

### Voice Control
- Hands-free navigation through recipe steps
- Voice commands for timer control
- Voice-activated ingredient list review
- Verbal cooking instructions

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
├── server.js              # Express server for API endpoints
├── webpack.config.js      # Webpack configuration
├── package.json           # Project dependencies
└── docs/                  # Additional documentation
    └── startup.md         # Detailed startup instructions
```

## Server Architecture

The application uses two servers:
1. **API Server (Port 3001)**: Express server that serves recipe data and static assets
2. **Webpack Dev Server (Port 3000)**: Serves the bundled frontend with hot reloading

Both servers must be running for the application to work properly.

## Available Scripts

- `npm run dev`: Start both servers simultaneously (recommended for development)
- `npm run start:api`: Start only the API server
- `npm run start`: Start only the webpack dev server
- `npm run build`: Create a production build
- `npm run test`: Run tests
- `npm run lint`: Lint JavaScript files

## Troubleshooting

### Common Issues

1. **"Address already in use" errors**:
   ```
   Error: listen EADDRINUSE: address already in use :::3000
   Error: listen EADDRINUSE: address already in use :::3001
   ```
   
   **Solution**: Kill the processes using the ports:
   ```bash
   lsof -i :3000 -i :3001 | grep LISTEN
   kill -9 <PID>
   ```

2. **Missing modules after pulling updates**:
   
   **Solution**: Reinstall dependencies:
   ```bash
   npm install
   ```

3. **API server not responding**:
   
   **Solution**: Check that both servers are running:
   ```bash
   # In separate terminal windows:
   npm run start:api
   npm run start
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