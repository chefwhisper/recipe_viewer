/**
 * Recipe Update Tool
 * 
 * This script updates all recipe JSON files to use the new ingredient format
 * that includes unit and notation fields and removes the groceryList.
 */

const fs = require('fs');
const path = require('path');

const RECIPES_DIR = path.join(__dirname, '../../assets/recipes');

// Terms that indicate "to taste" ingredients
const TO_TASTE_TERMS = ['to taste', 'pinch', 'dash', 'as needed', 'optional', 'sprinkle'];

// Common preparation methods to capture in notation
const PREP_METHODS = [
  'chopped', 'finely chopped', 'roughly chopped', 'coarsely chopped',
  'minced', 'finely minced',
  'diced', 'finely diced',
  'sliced', 'thinly sliced', 'thickly sliced',
  'grated', 'shredded',
  'julienned', 'cut into strips',
  'cut into', 'cubed', 'cut into cubes', 'cut into pieces', 'cut into chunks',
  'peeled', 'seeded', 'cored',
  'trimmed', 'stemmed',
  'crushed', 'pressed',
  'mashed', 'pureed',
  'pitted', 'halved', 'quartered',
  'torn', 'crumbled', 'broken',
  'washed', 'rinsed', 'scrubbed',
  'deboned', 'skinned', 'skin-on',
  'bone-in', 'boneless',
  'melted', 'softened', 'room temperature',
  'packed', 'loosely packed', 'firmly packed'
];

// Mapping of units to their preferred format
const UNIT_MAPPING = {
  'tablespoon': 'Tablespoon',
  'tablespoons': 'Tablespoons',
  'tbsp': 'Tbsp',
  'teaspoon': 'Teaspoon',
  'teaspoons': 'Teaspoons',
  'tsp': 'tsp',
  'cup': 'cup',
  'cups': 'cups',
  'pound': 'pound',
  'pounds': 'pounds',
  'lb': 'lb',
  'lbs': 'lbs',
  'ounce': 'ounce',
  'ounces': 'ounces',
  'oz': 'oz',
  'can': 'can',
  'cans': 'cans',
  'clove': 'clove',
  'cloves': 'cloves'
};

// Common units to check for
const COMMON_UNITS = [
  'Tablespoon', 'Tablespoons', 'tablespoon', 'tablespoons', 'tbsp', 'Tbsp',
  'teaspoon', 'teaspoons', 'Teaspoon', 'Teaspoons', 'tsp',
  'cup', 'cups', 'Cup', 'Cups',
  'pound', 'pounds', 'Pound', 'Pounds', 'lb', 'lbs',
  'ounce', 'ounces', 'Ounce', 'Ounces', 'oz',
  'gram', 'grams', 'g',
  'kilogram', 'kilograms', 'kg',
  'milliliter', 'milliliters', 'ml',
  'liter', 'liters', 'l',
  'pinch', 'dash',
  'can', 'cans', 'bottle', 'bottles', 'package', 'packages',
  'clove', 'cloves', 'head', 'heads', 'bunch', 'bunches',
  'large', 'small', 'medium'
];

// Process a single recipe file
function processRecipeFile(filePath) {
  console.log(`Processing ${filePath}...`);
  
  // Read the recipe file
  const fileContent = fs.readFileSync(filePath, 'utf8');
  let recipe;
  
  try {
    recipe = JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error parsing ${filePath}: ${error.message}`);
    return;
  }
  
  // Skip if the file doesn't have ingredients
  if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
    console.log(`Skipping ${filePath} - no ingredients array found`);
    return;
  }
  
  // Update the ingredients format
  recipe.ingredients = recipe.ingredients.map(ingredient => {
    const updated = { ...ingredient };
    
    // Check if this is a "to taste" ingredient
    const quantityStr = String(ingredient.quantity || '').toLowerCase();
    const nameStr = String(ingredient.name || '').toLowerCase();
    
    const isToTaste = TO_TASTE_TERMS.some(term => 
      quantityStr.includes(term) || nameStr.includes(term)
    );
    
    // Extract preparation method from name
    let prepMethod = '';
    let updatedName = ingredient.name;
    
    if (ingredient.name) {
      // First check for preparation instructions after a comma
      const commaIndex = ingredient.name.indexOf(',');
      if (commaIndex > -1) {
        const beforeComma = ingredient.name.substring(0, commaIndex).trim();
        const afterComma = ingredient.name.substring(commaIndex + 1).trim();
        
        // What comes after the comma is likely a preparation instruction
        prepMethod = afterComma;
        updatedName = beforeComma;
      } else {
        // Look for specific preparation methods in the name
        for (const method of PREP_METHODS) {
          if (ingredient.name.toLowerCase().includes(method)) {
            // Check if it's a phrase like "cut into 2-inch cubes"
            const methodIndex = ingredient.name.toLowerCase().indexOf(method);
            const endOfName = ingredient.name.toLowerCase().indexOf(',', methodIndex);
            
            if (endOfName > -1) {
              // If there's a comma after the method, extract everything up to the comma
              prepMethod = ingredient.name.substring(methodIndex, endOfName).trim();
            } else {
              // Otherwise, try to determine the end of the preparation phrase
              // Find all text from the method keyword to the end or to the next comma
              const remainingText = ingredient.name.substring(methodIndex);
              prepMethod = remainingText;
            }
            
            // The name is everything before the preparation method
            updatedName = ingredient.name.substring(0, methodIndex).trim();
            
            // If we've successfully extracted a prep method, break the loop
            if (prepMethod && updatedName) {
              break;
            }
          }
        }
        
        // Handle special case for ingredients that start with prep methods
        if (!prepMethod) {
          // Check if the name starts with a prep method
          for (const method of PREP_METHODS) {
            if (nameStr.startsWith(method)) {
              const restOfName = ingredient.name.substring(method.length).trim();
              // If there's text after the method, it's likely the ingredient name
              if (restOfName) {
                prepMethod = method;
                updatedName = restOfName;
                break;
              }
            }
          }
        }
      }
    }
    
    // Update the name with the cleaned version
    if (updatedName && updatedName !== ingredient.name) {
      updated.name = updatedName;
    }
    
    if (isToTaste) {
      // Format as a "to taste" ingredient
      updated.quantity = '';
      updated.unit = '';
      updated.notation = 'to taste';
      
      // Add prep method to notation if present
      if (prepMethod) {
        updated.notation = `${prepMethod}, to taste`;
      }
    } else {
      // Handle normal ingredient with prep method
      if (prepMethod && !updated.notation) {
        updated.notation = prepMethod;
      }
      
      // Extract unit from quantity if present
      if (ingredient.quantity) {
        let unitFound = false;
        
        // Check if quantity contains any known units
        for (const unit of COMMON_UNITS) {
          const unitRegex = new RegExp(`\\b${unit}\\b`, 'i');
          if (unitRegex.test(ingredient.quantity)) {
            // Extract the numeric part before the unit
            const parts = ingredient.quantity.split(unitRegex);
            updated.quantity = parts[0].trim();
            // Use the case from the original text for the unit
            const unitMatch = ingredient.quantity.match(unitRegex);
            if (unitMatch) {
              updated.unit = unitMatch[0];
              unitFound = true;
              break;
            }
          }
        }
        
        // If no unit found, try to separate by looking for numbers
        if (!unitFound) {
          const numericRegex = /^([\d\s⅛¼⅓½⅔¾⅝⅞\.\/]+)(?:\s+)(.+)?$/;
          const match = String(ingredient.quantity).match(numericRegex);
          
          if (match && match[2]) {
            updated.quantity = match[1].trim();
            updated.unit = match[2].trim();
          } else if (!updated.unit || updated.unit === '') {
            updated.unit = '';
          }
        }
      } else {
        // No quantity, just add empty unit if not already set
        if (!updated.unit) {
          updated.unit = '';
        }
      }
    }
    
    return updated;
  });
  
  // Remove the groceryList if present
  if (recipe.groceryList) {
    delete recipe.groceryList;
    console.log(`Removed groceryList from ${filePath}`);
  }
  
  // Write the updated recipe back to the file
  fs.writeFileSync(filePath, JSON.stringify(recipe, null, 2), 'utf8');
  console.log(`Updated ${filePath}`);
}

// Process all recipe files in the directory
function updateAllRecipes() {
  const files = fs.readdirSync(RECIPES_DIR);
  
  let count = 0;
  files.forEach(file => {
    if (file.endsWith('.json') && file !== 'index.json') {
      const filePath = path.join(RECIPES_DIR, file);
      processRecipeFile(filePath);
      count++;
    }
  });
  
  console.log(`Processed ${count} recipe files`);
}

// Run the update
updateAllRecipes(); 