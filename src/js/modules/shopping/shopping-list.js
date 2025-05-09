/**
 * Shopping List Module
 * Handles the creation and display of shopping lists from recipe ingredients
 */

import eventBus from '../../core/events/event-bus.js';

// Initialize shopping list
export function initializeShoppingList(ingredients) {
    if (!ingredients || !Array.isArray(ingredients)) {
        console.error('Invalid ingredients data provided to shopping list');
        return;
    }
    
    // Store ingredients for later use
    window.recipeIngredients = ingredients;
    
    console.log('Shopping list initialized with', ingredients.length, 'ingredients');
}

// Organize ingredients by category
function organizeByCategory(ingredients) {
    const categories = {};
    
    ingredients.forEach(ingredient => {
        const category = ingredient.category || 'Other';
        if (!categories[category]) {
            categories[category] = [];
        }
        
        // Format the ingredient string based on available fields
        let ingredientText = '';
        
        if (ingredient.notation) {
            // For "to taste" items
            ingredientText = `${ingredient.name}, ${ingredient.notation}`;
        } else {
            // For normal ingredients
            const quantityText = ingredient.quantity || '';
            const unitText = ingredient.unit ? ` ${ingredient.unit}` : '';
            ingredientText = `${quantityText}${unitText} ${ingredient.name}`;
        }
        
        categories[category].push(ingredientText);
    });
    
    return categories;
}

// Show shopping list
export function showShoppingList() {
    if (!window.recipeIngredients) {
        console.error('No ingredients available for shopping list');
        return;
    }
    
    // Create shopping list modal
    const modal = document.createElement('div');
    modal.className = 'shopping-list-modal';
    modal.id = 'shopping-list-modal';
    
    // Create modal content
    const content = document.createElement('div');
    content.className = 'shopping-list-content';
    
    // Create close button
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => {
        document.body.removeChild(modal);
    };
    
    // Create title
    const title = document.createElement('h2');
    title.textContent = 'Shopping List';
    
    // Add title and close button first
    content.appendChild(closeBtn);
    content.appendChild(title);
    
    // Organize ingredients by category
    const categorizedIngredients = organizeByCategory(window.recipeIngredients);
    
    // Add each category and its ingredients
    Object.entries(categorizedIngredients).forEach(([category, items]) => {
        // Create category container - use shopping-list-category as per CSS
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'shopping-list-category';
        
        // Create category header
        const categoryHeader = document.createElement('h3');
        categoryHeader.textContent = category;
        categoryDiv.appendChild(categoryHeader);
        
        // Create list for this category
        const list = document.createElement('ul');
        // No class needed as per CSS structure
        
        // Add items to the list
        items.forEach(item => {
            const listItem = document.createElement('li');
            listItem.textContent = item;
            list.appendChild(listItem);
        });
        
        categoryDiv.appendChild(list);
        content.appendChild(categoryDiv);
    });
    
    // Add actions container
    const actions = document.createElement('div');
    actions.className = 'shopping-list-actions';
    
    // Add print button to actions
    const printBtn = document.createElement('button');
    printBtn.className = 'btn primary';
    printBtn.textContent = 'Print List';
    printBtn.onclick = () => {
        window.print();
    };
    actions.appendChild(printBtn);
    content.appendChild(actions);
    
    // Add content to modal
    modal.appendChild(content);
    
    // Add to document
    document.body.appendChild(modal);
    
    console.log('Shopping list displayed with categories');
}

/**
 * Setup event handlers for the shopping list module
 */
export function setupEventHandlers() {
    console.log('Setting up shopping list event handlers');
    
    // Listen for shopping list show event
    eventBus.subscribe('recipe:shopping:show', () => {
        console.log('Received recipe:shopping:show event');
        if (window.recipeIngredients) {
            showShoppingList();
        } else {
            console.error('No ingredients available for shopping list');
        }
    });
}

// Initialize event handlers when module is loaded
setupEventHandlers(); 