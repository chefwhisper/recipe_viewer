/**
 * EventBus
 * A simple pub/sub system for cross-module communication
 */

// Event storage for subscribers
const subscribers = new Map();

/**
 * Subscribe to an event
 * @param {string} event - The event name to subscribe to
 * @param {Function} callback - The callback function when event is published
 * @returns {Function} - Function to unsubscribe
 */
function subscribe(event, callback) {
  if (!subscribers.has(event)) {
    subscribers.set(event, new Set());
  }
  
  const callbacks = subscribers.get(event);
  callbacks.add(callback);
  
  // Return unsubscribe function
  return () => {
    callbacks.delete(callback);
    if (callbacks.size === 0) {
      subscribers.delete(event);
    }
  };
}

/**
 * Unsubscribe from an event
 * @param {string} event - The event name to unsubscribe from
 * @param {Function} callback - The callback function to remove
 * @returns {boolean} - True if the callback was found and removed
 */
function unsubscribe(event, callback) {
  if (!subscribers.has(event)) {
    return false;
  }
  
  const callbacks = subscribers.get(event);
  const result = callbacks.delete(callback);
  
  // Clean up if no more callbacks
  if (callbacks.size === 0) {
    subscribers.delete(event);
  }
  
  return result;
}

/**
 * Publish an event
 * @param {string} event - The event name to publish
 * @param {*} data - The data to pass to subscribers
 */
function publish(event, data) {
  if (!subscribers.has(event)) {
    return; // No subscribers
  }
  
  const callbacks = subscribers.get(event);
  callbacks.forEach(callback => {
    try {
      callback(data);
    } catch (error) {
      console.error(`Error in event handler for ${event}:`, error);
    }
  });
}

/**
 * Check if an event has subscribers
 * @param {string} event - The event name to check
 * @returns {boolean} - True if the event has subscribers
 */
function hasSubscribers(event) {
  return subscribers.has(event) && subscribers.get(event).size > 0;
}

/**
 * Clear all subscribers for an event, or all events if no event is specified
 * @param {string} [event] - Optional event name to clear
 */
function clear(event) {
  if (event) {
    subscribers.delete(event);
  } else {
    subscribers.clear();
  }
}

// Create EventBus object
const eventBus = {
  subscribe,
  unsubscribe,
  publish,
  hasSubscribers,
  clear
};

// Make eventBus accessible from the window object for debugging
window.eventBus = eventBus;

// Export as both default and named export for flexibility
export { eventBus };
export default eventBus; 