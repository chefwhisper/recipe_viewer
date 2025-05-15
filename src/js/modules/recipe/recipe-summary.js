/**
 * Recipe Summary Module
 * Handles the recipe overview page functionality
 */

// Import styles
import '../../../styles/main.css';

import { loadRecipeData, listRecipes } from './recipe-data.js';
import { initializeShoppingList, showShoppingList } from '../shopping/shopping-list.js';
import { formatTime } from '../core/utils/utils.js';
import eventBus from '../../core/events/event-bus.js';

// Configure asset paths based on environment
const ASSET_CONFIG = {
    development: {
        imagePath: '/assets/images'  // Updated to match server config
    },
    production: {
        imagePath: '/recipe_viewer/assets/images'  // Updated with repository name prefix
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

// Simple function to get recipe ID from URL query parameter
function getRecipeIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

class RecipeSummary {
    constructor() {
        console.log('Initializing RecipeSummary...');
        // Initialize elements object
        this.elements = {};
        
        // Create error container early
        this.elements.errorContainer = this.createErrorContainer();
        
        // Extract recipe ID from URL search parameters
        this.recipeId = getRecipeIdFromUrl();
        console.log('Recipe ID from URL:', this.recipeId);
        
        if (!this.recipeId) {
            this.displayError(new Error('No recipe ID provided'));
            return;
        }

        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        console.log('Initializing recipe summary page...');
        this.initializeElements();
        console.log('Elements loaded:', this.elements, 'elementsLoaded:', this.elementsLoaded);
        if (this.elements.mainContent) {
            console.log('Main content element found, proceeding with recipe loading');
            this.showLoading();
            this.bindEvents();
            this.loadRecipe();
        } else {
            console.error('Main content element not found, cannot proceed with recipe loading');
        }
    }

    initializeElements() {
        console.log('Initializing elements...');
        // Recipe metadata elements
        this.elements = {
            ...this.elements, // Keep the error container we created earlier
            title: document.getElementById('recipe-title'),
            image: document.getElementById('recipe-image'),
            yields: document.getElementById('recipe-yields'),
            totalTime: document.getElementById('recipe-time'),
            prepTime: document.getElementById('recipe-prep-time'),
            activeTime: document.getElementById('recipe-active-time'),
            handsOffTime: document.getElementById('recipe-hands-off-time'),
            ingredientsList: document.getElementById('ingredients-list'),
            startCookingBtn: document.getElementById('start-cooking'),
            shoppingListBtn: document.getElementById('shopping-list'),
            mainContent: document.querySelector('.recipe-main-content')
        };

        console.log('Elements initialized:', {
            titleFound: !!this.elements.title,
            imageFound: !!this.elements.image,
            mainContentFound: !!this.elements.mainContent,
            errorContainerFound: !!this.elements.errorContainer
        });

        // Verify all required elements exist
        let allElementsFound = true;
        Object.entries(this.elements).forEach(([key, element]) => {
            if (!element) {
                console.error(`Missing required element: ${key}`);
                allElementsFound = false;
            }
        });
        
        this.elementsLoaded = allElementsFound;
        console.log('All elements loaded:', this.elementsLoaded);
    }

    createErrorContainer() {
        let container = document.getElementById('error-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'error-container';
            container.className = 'error-message';
            document.querySelector('.container').appendChild(container);
        }
        return container;
    }

    showLoading() {
        if (!this.elements.mainContent) return;
        
        // Create a loading overlay instead of replacing content
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading recipe...</p>
            </div>
        `;
        
        // Add the overlay to the main content
        this.elements.mainContent.appendChild(loadingOverlay);
        
        // Store a reference so we can remove it later
        this.loadingOverlay = loadingOverlay;
    }

    bindEvents() {
        if (!this.elements.startCookingBtn || !this.elements.shoppingListBtn) {
            console.error('Missing button elements for event binding');
            return;
        }

        this.elements.startCookingBtn.addEventListener('click', (event) => {
            console.log('Start cooking button clicked, navigating to cooking mode with ID:', this.recipeId);
            window.location.href = `cooking.html?id=${this.recipeId}`;
        });

        this.elements.shoppingListBtn.addEventListener('click', () => {
            if (this.currentRecipe?.ingredients) {
                console.log('Triggering shopping list with ingredients:', this.currentRecipe.ingredients);
                // Initialize shopping list
                initializeShoppingList(this.currentRecipe.ingredients);
                // Trigger the event instead of directly calling showShoppingList
                eventBus.publish('recipe:shopping:show');
            } else {
                console.error('No ingredients available for shopping list');
            }
        });
    }

    async loadRecipe() {
        console.log('Loading recipe data for ID:', this.recipeId);
        try {
            // First, load the recipe index to get the thumbnail
            const recipeIndex = await listRecipes();
            this.recipeIndex = recipeIndex;
            
            // Find the current recipe in the index
            const recipeInfo = recipeIndex.recipes.find(recipe => recipe.id === this.recipeId);
            
            // Now load the full recipe data
            const recipe = await loadRecipeData(this.recipeId);
            console.log('Recipe data loaded:', recipe);
            
            // Add the thumbnail from the index if available
            if (recipeInfo && recipeInfo.thumbnail) {
                recipe.thumbnail = recipeInfo.thumbnail;
            }
            
            this.currentRecipe = recipe;
            this.displayRecipe(recipe);
        } catch (error) {
            console.error('Error loading recipe:', error);
            this.displayError(error);
        }
    }

    displayRecipe(recipe) {
        console.log('Attempting to display recipe:', recipe ? recipe.title : 'No recipe data');
        
        if (!recipe) {
            console.error('Cannot display recipe: missing data');
            return;
        }
        
        if (!this.elements.mainContent) {
            console.error('Cannot display recipe: missing main content container');
            return;
        }

        // Remove loading overlay if it exists
        if (this.loadingOverlay && this.loadingOverlay.parentNode) {
            this.loadingOverlay.parentNode.removeChild(this.loadingOverlay);
        }

        console.log('Displaying recipe:', recipe.title);

        // Update the title instead of replacing it
        if (this.elements.title) {
            this.elements.title.textContent = recipe.title;
            console.log('Updated title to:', recipe.title);
        }

        // Update the image with improved error handling
        if (this.elements.image) {
            // Pre-load placeholder image to ensure it's in cache
            const placeholderImg = new Image();
            placeholderImg.src = `${config.imagePath}/placeholder.jpg`;
            
            // Use the thumbnail from the index.json if available
            const imageUrl = recipe.thumbnail 
                ? `${config.imagePath}/${recipe.thumbnail.replace(/^images\//, '')}`
                : `${config.imagePath}/placeholder.jpg`;
                
            console.log('Setting image URL to:', imageUrl);
            
            // Set up error handling before setting src
            this.elements.image.onerror = () => {
                console.error('Image failed to load, falling back to placeholder');
                this.elements.image.src = `${config.imagePath}/placeholder.jpg`;
                // Only log an error once
                this.elements.image.onerror = null;
            };
            
            // Now set the image src
            this.elements.image.src = imageUrl;
            this.elements.image.alt = recipe.title;
        }

        // Update metadata
        console.log('Updating metadata with:', recipe.metadata);
        if (this.elements.yields) this.elements.yields.textContent = recipe.metadata?.yields || 'Not specified';
        if (this.elements.totalTime) this.elements.totalTime.textContent = recipe.metadata?.totalTime || 'Not specified';
        if (this.elements.prepTime) this.elements.prepTime.textContent = recipe.metadata?.prepTime || 'Not specified';
        if (this.elements.activeTime) this.elements.activeTime.textContent = recipe.metadata?.activeTime || 'Not specified';
        if (this.elements.handsOffTime) this.elements.handsOffTime.textContent = recipe.metadata?.handsOffTime || 'Not specified';

        // Update ingredients list
        if (this.elements.ingredientsList) {
            const ingredientsHtml = recipe.ingredients?.map(ingredient => {
                // Check if there's a notation like "to taste"
                if (ingredient.notation) {
                    return `<li>${ingredient.name}, ${ingredient.notation}</li>`;
                }
                
                // Handle normal ingredients with quantity/unit format
                const quantityText = ingredient.quantity || '';
                const unitText = ingredient.unit ? ` ${ingredient.unit}` : '';
                
                return `<li>${quantityText}${unitText} ${ingredient.name}</li>`;
            }).join('') || '<li>No ingredients listed</li>';
            
            console.log('Setting ingredients HTML:', ingredientsHtml.substring(0, 100) + '...');
            this.elements.ingredientsList.innerHTML = ingredientsHtml;
        }

        // Store current recipe for shopping list functionality
        this.currentRecipe = recipe;

        // Make sure everything is visible
        this.elements.mainContent.style.display = 'block';
        if (this.elements.errorContainer) {
            this.elements.errorContainer.style.display = 'none';
        }
        
        console.log('Recipe display complete');
    }

    displayError(error) {
        console.error('Recipe error:', error);
        
        if (!this.elements?.errorContainer) {
            console.error('No error container available');
            return;
        }

        this.elements.errorContainer.innerHTML = `
            <div class="error-content">
                <h2>Oops! Something went wrong</h2>
                <p>We couldn't load the recipe. Please try again later.</p>
                <p class="error-details">Error: ${error.message}</p>
                <div class="error-actions">
                    <button onclick="window.location.reload()" class="btn retry">Try Again</button>
                    <button onclick="window.location.href='/'" class="btn home">Go to Homepage</button>
                </div>
            </div>
        `;

        // Hide the main content if it exists
        if (this.elements.mainContent) {
            this.elements.mainContent.style.display = 'none';
        }
        this.elements.errorContainer.style.display = 'block';
    }
}

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing RecipeSummary...');
    new RecipeSummary();
}); 