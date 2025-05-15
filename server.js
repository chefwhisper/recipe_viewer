const express = require('express');
const path = require('path');
const serverConfig = require('./src/config/server.config');

const app = express();
const PORT = serverConfig.api.port || 3001;

// Configure static file serving
Object.values(serverConfig.static).forEach(staticConfig => {
  app.use(
    staticConfig.route,
    express.static(
      path.join(__dirname, staticConfig.path),
      staticConfig.options || {}
    )
  );
  console.log(`Serving static files from ${staticConfig.path} at ${staticConfig.route}`);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Serving static files only - no API endpoints`);
}); 