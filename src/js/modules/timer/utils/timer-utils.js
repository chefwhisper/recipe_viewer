/**
 * Utility functions for working with timers
 */
import { formatTimeMMSS } from '../../utils/common.js';

/**
 * Common cooking verbs to use for timer labels
 */
const COOKING_VERBS = [
  'bake', 'boil', 'simmer', 'roast', 'grill', 'fry', 'sauté', 'steam',
  'cook', 'heat', 'mix', 'stir', 'blend', 'whip', 'knead', 'rest',
  'marinate', 'chill', 'freeze', 'thaw', 'prepare', 'microwave',
  'preheat', 'broil', 'sear', 'toast', 'caramelize', 'reduce', 'wait',
  'let', 'allow', 'cool', 'stand', 'set', 'rise', 'ferment', 'proof',
  'season', 'tenderize', 'smoke', 'cure', 'pickle', 'braise', 'poach',
  'blanch', 'infuse', 'render', 'melt', 'dissolve', 'steep', 'strain',
  'cover', 'turn', 'flip', 'fold', 'sweat', 'deglaze'
];

/**
 * Action verbs that should be prioritized over other verbs when both are present
 */
const PRIORITY_VERBS = [
  'simmer', 'bake', 'roast', 'boil', 'cook', 'wait', 'let', 'allow', 'rest'
];

/**
 * Common connecting words that should be ignored when creating timer labels
 */
const CONNECTING_WORDS = [
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'until', 'for',
  'with', 'about', 'to', 'from', 'by', 'at', 'in', 'on', 'off'
];

/**
 * Regular expression for extracting time durations from text
 * Handles formats like "X minutes", "X mins", "X min", "X seconds", "X secs", "X sec", "X hours", "X hrs", "X hr"
 */
const TIME_REGEX = /(\d+(?:-\d+)?)\s*(hour|hr|hrs|minute|min|mins|second|sec|secs)/gi;

/**
 * Regular expression for finding time in parentheses - a more specific pattern for better matches
 * This will prioritize times that appear in parentheses like (5 minutes) or (10-15 minutes)
 */
const PARENTHESES_TIME_REGEX = /\((\d+(?:-\d+)?)\s*(hour|hr|hrs|minute|min|mins|second|sec|secs)\)/gi;

/**
 * Create a key for a step timer
 * @param {string|number} stepId - The step ID
 * @param {number} index - The timer index within the step
 * @returns {string} The step timer key
 */
export function createStepTimerKey(stepId, index) {
  return `step-${stepId}-timer-${index}`;
}

/**
 * Extract duration in seconds from text
 * @param {string} text - The text to extract duration from
 * @returns {number} The duration in seconds, or 0 if no duration found
 */
export function extractDuration(text) {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  let totalSeconds = 0;
  let match;
  
  // Reset regex state
  TIME_REGEX.lastIndex = 0;
  
  // Find all time mentions in the text
  while ((match = TIME_REGEX.exec(text)) !== null) {
    const valueStr = match[1];
    const unit = match[2].toLowerCase();
    
    // Handle ranges like "10-15 minutes" by taking the higher value
    let value;
    if (valueStr.includes('-')) {
      const [min, max] = valueStr.split('-').map(v => parseInt(v.trim(), 10));
      value = max || min; // Use the max value, fall back to min if max parsing fails
    } else {
      value = parseInt(valueStr, 10);
    }
    
    if (isNaN(value)) continue;
    
    // Convert to seconds based on unit
    if (unit.startsWith('hour') || unit === 'hr' || unit === 'hrs') {
      totalSeconds += value * 3600;
    } else if (unit.startsWith('min') || unit === 'mins') {
      totalSeconds += value * 60;
    } else if (unit.startsWith('sec') || unit === 'secs') {
      totalSeconds += value;
    }
  }
  
  return totalSeconds;
}

/**
 * Create a descriptive label for a timer based on the text
 * @param {string} text - The text to extract a label from
 * @returns {string} A concise label for the timer
 */
export function createTimerLabel(text) {
  if (!text || typeof text !== 'string') {
    return 'Timer';
  }
  
  try {
    // Clean up the text - remove punctuation and extra spaces
    const cleanText = text.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Check if any cooking verbs are present
    const verbMatch = COOKING_VERBS.find(verb => {
      const regex = new RegExp(`\\b${verb}\\b`, 'i');
      return regex.test(cleanText);
    });
    
    if (verbMatch) {
      // Find the verb in the text
      const verbRegex = new RegExp(`\\b${verbMatch}\\b`, 'i');
      const verbIndex = cleanText.search(verbRegex);
      
      if (verbIndex !== -1) {
        // Extract a shorter phrase - verb + up to 2 words after
        const afterVerb = cleanText.substring(verbIndex).split(' ').slice(0, 3).join(' ');
        return afterVerb.charAt(0).toUpperCase() + afterVerb.slice(1);
      }
    }
    
    // Fallback: use the first 3-4 words
    const words = cleanText.split(' ');
    if (words.length <= 4) {
      return cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
    }
    return (words.slice(0, 3).join(' ') + '...').charAt(0).toUpperCase() + (words.slice(0, 3).join(' ') + '...').slice(1);
    
  } catch (error) {
    console.error('Error creating timer label:', error);
    return 'Timer';
  }
}

/**
 * Find all potential timers in a step
 * @param {Object} step - The step object with description and bullets
 * @returns {Array<Object>} Array of timer objects with duration and label
 */
export function findTimersInStep(step) {
  if (!step) return [];
  
  const timers = [];
  const mainStep = step.description || step.mainStep;
  
  // Check main step for timers
  if (mainStep && typeof mainStep === 'string') {
    // Find all parentheses in the text
    const parenthesesMatches = findParenthesesWithTimes(mainStep);
    
    for (const match of parenthesesMatches) {
      if (match.seconds > 0) {
        timers.push({
          duration: match.seconds,
          label: generateTimerName(mainStep, match.index, step.title),
          source: 'main',
          matchIndex: match.index,
          inParentheses: true,
          originalText: match.text
        });
      }
    }
  }
  
  // Check bullet points for timers
  if (step.bullets && Array.isArray(step.bullets)) {
    step.bullets.forEach((bullet, index) => {
      if (typeof bullet === 'string') {
        // Find all parentheses in the text
        const parenthesesMatches = findParenthesesWithTimes(bullet);
        
        for (const match of parenthesesMatches) {
          if (match.seconds > 0) {
            timers.push({
              duration: match.seconds,
              label: generateTimerName(bullet, match.index, step.title),
              source: 'bullet',
              bulletIndex: index,
              matchIndex: match.index,
              inParentheses: true,
              originalText: match.text
            });
          }
        }
      }
    });
  }
  
  return timers;
}

/**
 * Find all parentheses in text and check if they contain valid time expressions
 * @param {string} text - The text to search in
 * @returns {Array<Object>} Array of matches with text, index, and duration in seconds
 */
function findParenthesesWithTimes(text) {
  const results = [];
  const regex = /\([^)]+\)/g;
  let match;
  
  // Find all parenthetical expressions
  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0]; // e.g., "(15 minutes)"
    const content = fullMatch.slice(1, -1).trim(); // Remove parentheses
    const timeMatches = [];
    
    // Check if the content has a time expression
    const timeRegex = /(\d+(?:-\d+)?)\s*(hour|hr|hrs|minute|min|mins|second|sec|secs)/gi;
    let timeMatch;
    
    while ((timeMatch = timeRegex.exec(content)) !== null) {
      const timeValue = timeMatch[1]; // e.g., "15" or "10-15"
      const timeUnit = timeMatch[2]; // e.g., "minutes"
      
      // Calculate seconds from the time expression
      let seconds = 0;
      
      // Handle ranges like "10-15 minutes" by taking the higher value
      let value;
      if (timeValue.includes('-')) {
        const [min, max] = timeValue.split('-').map(v => parseInt(v.trim(), 10));
        value = max || min; // Use the max value, fall back to min if max parsing fails
      } else {
        value = parseInt(timeValue, 10);
      }
      
      if (!isNaN(value)) {
        // Convert to seconds based on unit
        const unit = timeUnit.toLowerCase();
        if (unit.startsWith('hour') || unit === 'hr' || unit === 'hrs') {
          seconds = value * 3600;
        } else if (unit.startsWith('min') || unit === 'mins') {
          seconds = value * 60;
        } else if (unit.startsWith('sec') || unit === 'secs') {
          seconds = value;
        }
        
        if (seconds > 0) {
          timeMatches.push({
            value,
            unit: timeUnit,
            seconds
          });
        }
      }
    }
    
    // If we found time expressions, add this parenthetical expression to results
    if (timeMatches.length > 0) {
      // Use the first time expression found (typically there's only one per parenthesis)
      results.push({
        text: fullMatch,
        content,
        index: match.index,
        seconds: timeMatches[0].seconds
      });
    }
  }
  
  return results;
}

/**
 * Format time in seconds to a display string (MM:SS)
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export function formatTimeForDisplay(seconds) {
  return formatTimeMMSS(seconds);
}

/**
 * Calculate completion percentage
 * @param {number} total - Total duration in seconds
 * @param {number} remaining - Remaining time in seconds
 * @returns {number} Completion percentage (0-100)
 */
export function calculateCompletion(total, remaining) {
  if (total <= 0 || remaining < 0) {
    return 0;
  }
  
  if (remaining === 0) {
    return 100;
  }
  
  const completed = total - remaining;
  const percentage = (completed / total) * 100;
  
  return Math.min(Math.max(0, Math.round(percentage)), 100);
}

/**
 * Expanded list of food items (ingredients) to look for
 */
const INGREDIENTS = [
  // Proteins
  'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'tofu', 'lamb', 'duck',
  'turkey', 'sausage', 'bacon', 'ham', 'steak', 'ribs', 'chops', 'ground beef', 'ground turkey',
  'ground pork', 'meatballs', 'tempeh', 'seitan', 'crab', 'lobster', 'scallops', 'eggs',
  
  // Vegetables
  'onion', 'garlic', 'carrot', 'celery', 'potato', 'tomato', 'bell pepper', 'jalapeno',
  'broccoli', 'cauliflower', 'spinach', 'kale', 'lettuce', 'cabbage', 'asparagus', 'zucchini',
  'eggplant', 'squash', 'pumpkin', 'cucumber', 'mushroom', 'corn', 'peas', 'green beans',
  'brussels sprouts', 'artichoke', 'leek', 'shallot', 'radish', 'turnip', 'beet',
  
  // Grains & Starches
  'rice', 'pasta', 'noodles', 'bread', 'dough', 'flour', 'oats', 'quinoa', 'couscous',
  'barley', 'farro', 'bulgur', 'polenta', 'grits', 'tortilla', 'pita', 'bagel',
  
  // Legumes & Beans
  'beans', 'lentils', 'chickpeas', 'black beans', 'kidney beans', 'pinto beans',
  'navy beans', 'lima beans', 'edamame', 'split peas',
  
  // Dairy & Alternatives
  'milk', 'cream', 'cheese', 'butter', 'yogurt', 'sour cream', 'buttermilk',
  'almond milk', 'soy milk', 'oat milk', 'coconut milk',
  
  // Fruits
  'apple', 'banana', 'orange', 'lemon', 'lime', 'berry', 'berries', 'strawberry',
  'blueberry', 'raspberry', 'blackberry', 'cherry', 'grape', 'pear', 'peach',
  'plum', 'pineapple', 'mango', 'kiwi', 'melon', 'watermelon', 'cantaloupe',
  
  // Herbs & Spices
  'basil', 'thyme', 'rosemary', 'oregano', 'parsley', 'cilantro', 'mint', 'dill',
  'sage', 'bay leaf', 'cumin', 'coriander', 'paprika', 'turmeric', 'ginger',
  
  // Sauces & Condiments
  'sauce', 'ketchup', 'mustard', 'mayonnaise', 'vinegar', 'oil', 'olive oil',
  'salsa', 'soy sauce', 'marinara', 'gravy', 'dressing', 'glaze',
  
  // Common cooking terms
  'mixture', 'batter', 'stock', 'broth', 'soup', 'stew', 'casserole', 'filling',
  'frosting', 'icing', 'syrup', 'caramel', 'roux', 'crust', 'seasoning',
  
  // Nuts & Seeds
  'nuts', 'almonds', 'walnuts', 'pecans', 'cashews', 'pistachios', 'seeds',
  'sesame', 'sunflower', 'pumpkin seeds', 'flax', 'chia'
];

/**
 * Intelligently generate a timer name based on context
 * @param {string} stepText - The text content of the step
 * @param {number} matchIndex - The index where the timer duration was found
 * @param {string} stepTitle - Optional step title for context
 * @returns {string} - Generated timer name
 */
export function generateTimerName(stepText, matchIndex, stepTitle) {
    if (!stepText || typeof stepText !== 'string') {
        return "Timer";
    }
    
    try {
        // Extract surrounding text for context
        const contextWindowSize = 200; // Increased window size for better context
        const contextStartIndex = Math.max(0, matchIndex - contextWindowSize);
        const beforeText = stepText.substring(contextStartIndex, matchIndex).trim();
        const afterText = stepText.substring(matchIndex).trim();
        const fullContext = beforeText + ' ' + afterText;
        
        // Process step text for analysis
        const cleanText = fullContext.replace(/[.,()]/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim();
        const words = cleanText.split(' ');

        // Check for special cases like "wait" patterns
        if (/\b(wait|let\s+rest|let\s+stand|allow\s+to\s+rest|allow\s+to\s+sit)\b/i.test(beforeText)) {
            return "Wait timer";
        }
        
        // Find all cooking verbs in the text
        const foundVerbs = [];
        for (const verb of COOKING_VERBS) {
            const verbRegex = new RegExp(`\\b${verb}\\b`, 'i');
            if (verbRegex.test(beforeText)) {
                foundVerbs.push(verb.toLowerCase());
            }
        }
        
        // Prioritize specific verbs if multiple are found
        let primaryVerb = null;
        
        // First check priority verbs
        for (const verb of PRIORITY_VERBS) {
            if (foundVerbs.includes(verb)) {
                primaryVerb = verb;
                break;
            }
        }
        
        // If no priority verb found, use the last verb (closest to the timer)
        if (!primaryVerb && foundVerbs.length > 0) {
            // Find the verb position closest to the timer
            let closestVerb = null;
            let closestDistance = Infinity;
            
            for (const verb of foundVerbs) {
                const verbIndex = beforeText.toLowerCase().lastIndexOf(verb);
                if (verbIndex !== -1) {
                    const distance = matchIndex - contextStartIndex - verbIndex;
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestVerb = verb;
                    }
                }
            }
            
            primaryVerb = closestVerb;
        }
        
        // If still no verb found, use a default
        if (!primaryVerb) {
            return "Timer";
        }
        
        // Normalize the primary verb (convert inflections to base form)
        if (primaryVerb === "cooking" || primaryVerb === "cooks" || primaryVerb === "cooked") {
            primaryVerb = "cook";
        } else if (primaryVerb === "baking" || primaryVerb === "bakes" || primaryVerb === "baked") {
            primaryVerb = "bake";
        } else if (primaryVerb === "simmering" || primaryVerb === "simmers" || primaryVerb === "simmered") {
            primaryVerb = "simmer";
        } else if (primaryVerb === "waiting" || primaryVerb === "waits" || primaryVerb === "waited") {
            primaryVerb = "wait";
        }
        
        // Find all ingredients in the text
        const foundIngredients = [];
        for (const ingredient of INGREDIENTS) {
            const ingredientRegex = new RegExp(`\\b${ingredient}\\b`, 'i');
            if (ingredientRegex.test(cleanText)) {
                // Avoid duplicates when one ingredient is contained in another
                if (!foundIngredients.some(existing => 
                    existing.includes(ingredient) || ingredient.includes(existing))) {
                    foundIngredients.push(ingredient.toLowerCase());
                }
            }
        }
        
        // Prioritize ingredients that appear closer to the primary verb
        let primaryIngredient = null;
        
        if (foundIngredients.length > 0) {
            const verbIndex = beforeText.toLowerCase().lastIndexOf(primaryVerb);
            
            if (verbIndex !== -1) {
                const verbContext = beforeText.substring(verbIndex) + ' ' + afterText.substring(0, 50);
                const cleanVerbContext = verbContext.toLowerCase();
                
                // Find the closest ingredient to the verb
                let closestIngredient = null;
                let closestDistance = Infinity;
                
                for (const ingredient of foundIngredients) {
                    const ingredientIndex = cleanVerbContext.indexOf(ingredient);
                    if (ingredientIndex !== -1) {
                        // Consider ingredients that appear after the verb to be more relevant
                        const distance = ingredientIndex;
                        if (distance < closestDistance) {
                            closestDistance = distance;
                            closestIngredient = ingredient;
                        }
                    }
                }
                
                primaryIngredient = closestIngredient;
            }
            
            // If no ingredient found near the verb, use the first ingredient in the step
            if (!primaryIngredient) {
                primaryIngredient = foundIngredients[0];
            }
        }
        
        // Handle specific patterns for Case 3: "Add... Cook..." - prioritize cook verb for pork chops
        if (primaryVerb === "add" && beforeText.toLowerCase().includes("cook") && 
            (cleanText.includes("pork") || cleanText.includes("steak") || 
             cleanText.includes("chicken") || cleanText.includes("meat"))) {
            primaryVerb = "cook";
        }
        
        // Handle specific patterns for Case 4: "Add... simmer..." - prioritize simmer verb
        if (primaryVerb === "add" && beforeText.toLowerCase().includes("simmer")) {
            primaryVerb = "simmer";
        }
        
        // Generate the timer label
        if (primaryIngredient) {
            // Capitalize just the first letter of the verb and ingredient
            return `${primaryVerb.charAt(0).toUpperCase() + primaryVerb.slice(1)} ${primaryIngredient}`;
        } else {
            // If no ingredient was found, use just the verb
            return `${primaryVerb.charAt(0).toUpperCase() + primaryVerb.slice(1)} timer`;
        }
    } catch (error) {
        console.error('Error generating timer name:', error);
        return "Timer";
    }
}

// Export all the utility functions
export default {
  COOKING_VERBS,
  TIME_REGEX,
  PARENTHESES_TIME_REGEX,
  createStepTimerKey,
  extractDuration,
  createTimerLabel,
  findTimersInStep,
  formatTimeForDisplay,
  generateTimerName
}; 