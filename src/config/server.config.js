const path = require('path');

const serverConfig = {
    // Static file serving configuration
    static: {
        // Main assets directory configuration
        assets: {
            route: '/assets',
            path: 'src/assets',
            options: {
                maxAge: '1d',
                etag: true
            }
        },
        // Source files configuration (for development)
        source: {
            route: '/src',
            path: 'src',
            options: {
                maxAge: '1h',
                etag: true
            }
        },
        // Styles configuration with specific paths for CSS modules
        styles: {
            route: '/styles',
            path: 'src/styles',
            options: {
                maxAge: '1h',
                etag: true,
                index: false,
                setHeaders: (res, path) => {
                    if (path.endsWith('.css')) {
                        res.setHeader('Content-Type', 'text/css');
                    }
                }
            }
        },
        // CSS Utils configuration
        cssUtils: {
            route: '/styles/utils',
            path: 'src/styles/utils',
            options: { maxAge: '1h', etag: true }
        },
        // CSS Base configuration
        cssBase: {
            route: '/styles/base',
            path: 'src/styles/base',
            options: { maxAge: '1h', etag: true }
        },
        // CSS Layout configuration
        cssLayout: {
            route: '/styles/layout',
            path: 'src/styles/layout',
            options: { maxAge: '1h', etag: true }
        },
        // CSS Components configuration
        cssComponents: {
            route: '/styles/components',
            path: 'src/styles/components',
            options: { maxAge: '1h', etag: true }
        }
    },
    // API configuration
    api: {
        prefix: '/api',
        port: process.env.PORT || 3001
    }
};

module.exports = serverConfig; 