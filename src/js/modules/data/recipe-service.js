/**
 * Recipe Service
 * Provides an interface to the recipe data module
 */

import { loadRecipeData, saveRecipeData, listRecipes } from '../recipe/recipe-data.js';

/**
 * Get a recipe by ID
 * @param {string} recipeId - The recipe ID
 * @returns {Promise<Object>} The recipe object
 */
export async function getRecipeById(recipeId) {
  return loadRecipeData(recipeId);
}

/**
 * Save a recipe
 * @param {string} recipeId - The recipe ID
 * @param {Object} recipeData - The recipe data
 * @returns {Promise<Object>} The saved recipe
 */
export async function saveRecipe(recipeId, recipeData) {
  return saveRecipeData(recipeId, recipeData);
}

/**
 * Get all recipes
 * @returns {Promise<Array>} Array of recipe metadata
 */
export async function getAllRecipes() {
  return listRecipes();
}

// Re-export the original functions for compatibility
export { loadRecipeData, saveRecipeData, listRecipes }; 