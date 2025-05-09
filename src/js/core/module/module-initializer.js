/**
 * Module Initializer
 * Centralizes the initialization of all modules in the application
 */

import eventBus from '../events/event-bus.js';
import recipeModule from '../../modules/recipe/index.js';
import timerModule from '../../modules/timer/index.js';
import voiceModule from '../../modules/voice/index.js';
import { initializeCompatibilityLayer } from '../../modules/compatibility/index.js';

// Make eventBus globally available
window.eventBus = eventBus;

/**
 * Initialize all modules
 * @param {Object} options - Initialization options
 * @returns {Promise<boolean>} - Success status
 */
export async function initializeModules(options = {}) {
    console.log('Initializing all modules...');
    
    try {
        // Initialize compatibility layer
        initializeCompatibilityLayer();
        
        // Initialize recipe module
        await recipeModule.initialize();
        
        // Initialize timer module
        await timerModule.initialize({
            enableUi: true
        });
        
        // Initialize voice module
        await voiceModule.initialize();
        
        console.log('All modules initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing modules:', error);
        return false;
    }
}

/**
 * Load a recipe by ID
 * @param {string} recipeId - Recipe ID
 * @returns {Promise<Object>} - Recipe data
 */
export async function loadRecipe(recipeId) {
    console.log('Loading recipe with ID:', recipeId);
    
    try {
        const recipe = await recipeModule.loadRecipe(recipeId);
        console.log('Recipe loaded successfully');
        return recipe;
    } catch (error) {
        console.error('Error loading recipe:', error);
        throw error;
    }
}

/**
 * Set up event listeners for the application
 */
export function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Recipe navigation
    document.getElementById('start-recipe')?.addEventListener('click', () => {
        eventBus.publish('recipe:navigation:start');
    });
    
    document.getElementById('next-step')?.addEventListener('click', () => {
        eventBus.publish('recipe:navigation:next');
    });
    
    document.getElementById('prev-step')?.addEventListener('click', () => {
        eventBus.publish('recipe:navigation:prev');
    });
    
    // Voice controls
    document.getElementById('read-step')?.addEventListener('click', () => {
        eventBus.publish('recipe:speech:read');
    });
    
    document.getElementById('pause-speech')?.addEventListener('click', () => {
        eventBus.publish('recipe:speech:pause');
    });
    
    document.getElementById('resume-speech')?.addEventListener('click', () => {
        eventBus.publish('recipe:speech:resume');
    });
    
    document.getElementById('stop-speaking')?.addEventListener('click', () => {
        eventBus.publish('recipe:speech:stop');
    });
    
    // Shopping list
    document.getElementById('shopping-list')?.addEventListener('click', () => {
        eventBus.publish('recipe:shopping:show');
    });
    
    console.log('Event listeners set up successfully');
}

/**
 * Show error message to user
 * @param {string} message - Error message
 */
export function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    } else {
        // Create error element if it doesn't exist
        const errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.prepend(errorDiv);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing application...');
    
    try {
        // Get recipe ID from URL or use default
        const urlParams = new URLSearchParams(window.location.search);
        const recipeId = urlParams.get('id') || 'one-pan-chicken-bites-with-potatoes';
        
        // Initialize all modules
        await initializeModules();
        
        // Load recipe data
        await loadRecipe(recipeId);
        
        // Set up event listeners
        setupEventListeners();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
        showError('Error loading recipe. Please try again later.');
    }
}); 