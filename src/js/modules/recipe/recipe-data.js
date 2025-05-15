/**
 * Recipe Data Module
 * Handles loading and managing recipe data
 */

// Configure asset paths based on environment
const ASSET_CONFIG = {
    development: {
        recipesPath: '/assets/recipes',
        imagePath: '/assets/images'
    },
    production: {
        recipesPath: '/recipe_viewer/assets/recipes',
        imagePath: '/recipe_viewer/assets/images'
    }
};

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Determine environment based on URL/hostname if in browser
const isDevelopment = isBrowser ? 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname === '') :
    true; // Default to development in Node.js environment

const ENV = isDevelopment ? 'development' : 'production';
const config = ASSET_CONFIG[ENV];

// Log the configuration for debugging
console.log('Recipe Data configuration:', config);

// Cache for recipe index data
let recipeIndexCache = null;

/**
 * Get the recipe index data
 * @returns {Promise<Object>} The recipe index data
 */
async function getRecipeIndex() {
    // Return cached data if available
    if (recipeIndexCache) {
        return recipeIndexCache;
    }
    
    try {
        const response = await fetch(`${config.recipesPath}/index.json`);
        if (!response.ok) {
            throw new Error(`Failed to load recipe index: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        recipeIndexCache = data; // Cache the data
        return data;
    } catch (error) {
        console.error('Error loading recipe index:', error);
        throw error;
    }
}

/**
 * Get the correct filename for a recipe ID
 * @param {string} recipeId - The ID of the recipe
 * @returns {Promise<string>} The correct filename (without extension)
 */
async function getRecipeFilename(recipeId) {
    if (!recipeId) return recipeId;
    
    try {
        // Get the recipe index
        const recipeIndex = await getRecipeIndex();
        
        // Find the recipe in the index
        const recipe = recipeIndex.recipes.find(r => r.id === recipeId);
        
        if (recipe) {
            // Recipe found in index, use its ID
            return recipe.id;
        }
        
        // If not found in index, use the ID as is
        console.warn(`Recipe ID "${recipeId}" not found in index.json, using as is`);
        return recipeId;
    } catch (error) {
        // If there's an error loading the index, fall back to using the ID as is
        console.error('Error getting recipe filename:', error);
        return recipeId;
    }
}

/**
 * Load recipe data from local JSON file
 * @param {string} recipeId - The ID of the recipe to load
 * @returns {Promise<Object>} The recipe data
 */
export async function loadRecipeData(recipeId) {
    try {
        if (!recipeId) {
            throw new Error('Recipe ID is required');
        }
        
        // Get the correct filename for this recipe ID
        const filename = await getRecipeFilename(recipeId);
        console.log(`Loading recipe with ID: ${recipeId}, using filename: ${filename}`);
        
        const jsonPath = `${config.recipesPath}/${filename}.json`;
        console.log(`Fetching recipe from JSON file: ${jsonPath}`);
        
        const response = await fetch(jsonPath);
        console.log(`JSON file response status: ${response.status}`);
        
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
 * Save recipe data is not supported in this version
 * @param {string} recipeId - The ID of the recipe to save
 * @param {Object} recipeData - The recipe data to save
 * @returns {Promise<Object>} The saved recipe data
 */
export async function saveRecipeData(recipeId, recipeData) {
    console.warn('Saving recipes is not supported in this version');
    return recipeData;
}

/**
 * List all available recipes from the index.json file
 * @returns {Promise<Array>} Array of recipe metadata
 */
export async function listRecipes() {
    try {
        return await getRecipeIndex();
    } catch (error) {
        console.error('Error loading recipe list:', error);
        throw error;
    }
} 