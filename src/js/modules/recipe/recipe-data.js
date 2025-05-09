/**
 * Recipe Data Module
 * Handles loading and managing recipe data
 */

// Configure API endpoints based on environment
const API_CONFIG = {
    development: {
        baseUrl: '/api/recipes',
        recipeEndpoint: (id) => `${id}`,
        imagePath: '/assets'  // Base path for all assets
    },
    production: {
        baseUrl: '/api/recipes',
        recipeEndpoint: (id) => `${id}`,
        imagePath: '/assets'
    }
};

// Determine environment based on URL/hostname
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname === '';

const ENV = isDevelopment ? 'development' : 'production';
const config = API_CONFIG[ENV];

// Log the configuration for debugging
console.log('Recipe Data configuration:', config);

/**
 * Ensure recipe ID has the recipe- prefix
 * @param {string} recipeId - The ID to normalize
 * @returns {string} The normalized ID
 */
function normalizeRecipeId(recipeId) {
    if (!recipeId) return recipeId;
    return recipeId.startsWith('recipe-') ? recipeId : `recipe-${recipeId}`;
}

/**
 * Load recipe data from the API
 * @param {string} recipeId - The ID of the recipe to load
 * @returns {Promise<Object>} The recipe data
 */
export async function loadRecipeData(recipeId) {
    try {
        if (!recipeId) {
            throw new Error('Recipe ID is required');
        }
        
        const normalizedId = normalizeRecipeId(recipeId);
        console.log(`Loading recipe with normalized ID: ${normalizedId}`);
        
        const apiUrl = `${config.baseUrl}/${config.recipeEndpoint(normalizedId)}`;
        console.log(`Fetching recipe from API URL: ${apiUrl}`);
        
        const response = await fetch(apiUrl);
        console.log(`API response status: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`Failed to load recipe: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`Recipe data loaded with title: ${data.title}`);
        
        // Ensure the recipe data has all required fields
        if (!data.title || !data.metadata || !data.ingredients) {
            console.error('Invalid recipe data format. Missing required fields:', {
                hasTitle: !!data.title,
                hasMetadata: !!data.metadata,
                hasIngredients: !!data.ingredients
            });
            throw new Error('Invalid recipe data format');
        }
        
        return data;
    } catch (error) {
        console.error('Error loading recipe:', error);
        throw error;
    }
}

/**
 * Save recipe data to the API
 * @param {string} recipeId - The ID of the recipe to save
 * @param {Object} recipeData - The recipe data to save
 * @returns {Promise<Object>} The saved recipe data
 */
export async function saveRecipeData(recipeId, recipeData) {
    if (ENV === 'development') {
        console.warn('Saving recipes is not supported in development mode');
        return recipeData;
    }

    try {
        const normalizedId = normalizeRecipeId(recipeId);
        const response = await fetch(`${config.baseUrl}/${config.recipeEndpoint(normalizedId)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(recipeData),
        });
        
        if (!response.ok) {
            throw new Error(`Failed to save recipe: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error saving recipe:', error);
        throw error;
    }
}

/**
 * List all available recipes
 * @returns {Promise<Array>} Array of recipe metadata
 */
export async function listRecipes() {
    try {
        const response = await fetch('/api/recipes/index.json');
        if (!response.ok) {
            throw new Error(`Failed to load recipe list: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data; // Return data as is, without modifying paths
    } catch (error) {
        console.error('Error loading recipe list:', error);
        throw error;
    }
} 