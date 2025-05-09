/**
 * Recipe List Module
 * Handles the display and interaction of the recipe grid on the main page
 */

import { listRecipes } from './recipe-data.js';

// Configure asset paths based on environment
const ASSET_CONFIG = {
    development: {
        imagePath: '/assets/images'  // Updated to match server config
    },
    production: {
        imagePath: '/assets/images'  // Updated to match server config
    }
};

// Determine environment based on URL/hostname
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname === '';

const ENV = isDevelopment ? 'development' : 'production';
const config = ASSET_CONFIG[ENV];

export class RecipeList {
    constructor() {
        this.recipeGrid = document.getElementById('recipe-grid');
        this.listRecipesBtn = document.getElementById('list-recipes-btn');
        this.initialize();
    }

    initialize() {
        // Load recipes initially
        this.loadRecipeList();

        // Add click handler for the List of Recipes button
        if (this.listRecipesBtn) {
            this.listRecipesBtn.addEventListener('click', () => {
                this.loadRecipeList();
            });
        }
    }

    /**
     * Loads and displays the list of recipes
     */
    async loadRecipeList() {
        console.log("Loading recipe list...");
        try {
            // Clear any existing content
            this.recipeGrid.innerHTML = '';
            
            // Use the listRecipes function from recipe-data.js
            const recipeIndex = await listRecipes();
            this.displayRecipes(recipeIndex.recipes);
        } catch (error) {
            console.error('Error loading recipes:', error);
            this.displayError(error);
        }
    }

    /**
     * Displays the list of recipes in the grid
     * @param {Array} recipes - Array of recipe objects
     */
    displayRecipes(recipes) {
        if (!recipes || recipes.length === 0) {
            this.displayEmptyState();
            return;
        }

        console.log(`Displaying ${recipes.length} recipes`);
        recipes.forEach(recipe => {
            const recipeCard = this.createRecipeCard(recipe);
            this.recipeGrid.appendChild(recipeCard);
        });
    }

    /**
     * Creates a recipe card element
     * @param {Object} recipe - Recipe data object
     * @returns {HTMLElement} The recipe card element
     */
    createRecipeCard(recipe) {
        console.log(`Creating card for recipe: ${recipe.title}`);
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.setAttribute('data-recipe-id', recipe.id);
        
        // Handle image path - remove images/ prefix if it exists
        const imagePath = `${config.imagePath}/${recipe.thumbnail.replace(/^images\//, '')}`;
        const placeholderPath = `${config.imagePath}/placeholder.jpg`;
        
        card.innerHTML = `
            <img src="${imagePath}" alt="${recipe.title}" class="recipe-thumbnail" 
                 onerror="this.src='${placeholderPath}'">
            <div class="recipe-info">
                <h2 class="recipe-title">${recipe.title}</h2>
                <div class="recipe-meta">
                    <span>${recipe.time ? `${recipe.time}` : ''} ${recipe.difficulty ? `• ${recipe.difficulty}` : ''}</span>
                </div>
                ${recipe.description ? `<p class="recipe-description">${recipe.description}</p>` : ''}
            </div>
        `;
        
        // Add click event to navigate to the recipe summary
        card.addEventListener('click', () => {
            window.location.href = `recipe-summary.html?id=${recipe.id}`;
        });
        
        return card;
    }

    /**
     * Displays an empty state message when no recipes are available
     */
    displayEmptyState() {
        this.recipeGrid.innerHTML = `
            <div class="message empty-state">
                <h2>No Recipes Found</h2>
                <p>Your recipe collection is empty.</p>
                <button onclick="window.location.reload()" class="btn refresh">Refresh Page</button>
            </div>
        `;
    }

    /**
     * Displays an error message when loading fails
     * @param {Error} error - The error that occurred
     */
    displayError(error) {
        this.recipeGrid.innerHTML = `
            <div class="error-message">
                <h2>Oops! Something went wrong</h2>
                <p>We couldn't load the recipes. Please try again later.</p>
                <p class="error-details">Error: ${error.message}</p>
                <button onclick="window.location.reload()" class="btn retry">Try Again</button>
            </div>
        `;
    }
}

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new RecipeList();
}); 