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

// Map of recipe IDs to their correct filenames (without extension)
// This handles the inconsistency in naming patterns
const recipeFileMap = {
    // Recipes that don't have "recipe-" prefix in their ID but need it in the filename
    'fiesta-chili': 'fiesta-chili',
    'chicken-turmeric-soup': 'chicken-turmeric-soup',
    'cozy-chicken-chili': 'cozy-chicken-chili',
    'beef-veggie-stew': 'beef-veggie-stew',
    'oven-baked-sausage-cheese-pasta': 'oven-baked-sausage-cheese-pasta',
    'caramelized-eggplant-pasta': 'caramelized-eggplant-pasta',
    'one-pan-chicken-bites-with-potatoes': 'one-pan-chicken-bites-with-potatoes',
    'one-pot-coconut-chicken-and-rice': 'one-pot-coconut-chicken-and-rice',
    
    // Recipes that already have "recipe-" prefix in both ID and filename
    'recipe-fusion-garlic-steak-bites-with-miso-butter-broccoli': 'recipe-fusion-garlic-steak-bites-with-miso-butter-broccoli',
    'recipe-fusion-miso-caramel-pork-chops-with-apples-and-garlic-mashed-potatoes': 'recipe-fusion-miso-caramel-pork-chops-with-apples-and-garlic-mashed-potatoes',
    'recipe-fusion-pan-seared-salmon-with-tomato-pop-couscous': 'recipe-fusion-pan-seared-salmon-with-tomato-pop-couscous',
    'recipe-fusion-rib-eye-steaks-with-potatoes-au-gratin': 'recipe-fusion-rib-eye-steaks-with-potatoes-au-gratin'
};

/**
 * Get the correct filename for a recipe ID
 * @param {string} recipeId - The ID of the recipe
 * @returns {string} The correct filename (without extension)
 */
function getRecipeFilename(recipeId) {
    if (!recipeId) return recipeId;
    
    // If we have a mapping for this ID, use it
    if (recipeFileMap[recipeId]) {
        return recipeFileMap[recipeId];
    }
    
    // For IDs that start with 'recipe-', use as is
    if (recipeId.startsWith('recipe-')) {
        return recipeId;
    }
    
    // Default case: use the ID as is
    return recipeId;
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
        const filename = getRecipeFilename(recipeId);
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
        const response = await fetch(`${config.recipesPath}/index.json`);
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