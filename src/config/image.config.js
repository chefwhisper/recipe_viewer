/**
 * Central configuration for image handling across the application
 */

const imageConfig = {
    // Base path for all images
    basePath: '/assets/images',
    
    // Default images
    defaults: {
        placeholder: '/assets/images/placeholder.jpg',
        favicon: '/assets/images/favicon.ico'
    },

    // Helper functions for image paths
    getImagePath: (filename) => {
        // If filename already includes 'images/', remove it
        const cleanFilename = filename.replace('images/', '');
        return `${imageConfig.basePath}/${cleanFilename}`;
    },

    getPlaceholder: () => imageConfig.defaults.placeholder,
    getFavicon: () => imageConfig.defaults.favicon
};

module.exports = imageConfig; 