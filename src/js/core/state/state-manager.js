/**
 * StateManager.js
 * A simple state management solution using the pub/sub pattern.
 * Provides a centralized store for application state.
 */
import eventBus from '../events/event-bus.js';

class StateManager {
  constructor() {
    this.state = {};
    this.initialState = {};
    this.namespaces = new Set();
  }

  /**
   * Initialize a namespace with default state
   * @param {string} namespace - The state namespace
   * @param {Object} initialState - The initial state for this namespace
   */
  initNamespace(namespace, initialState = {}) {
    if (this.namespaces.has(namespace)) {
      console.warn(`Namespace ${namespace} is already initialized. Skipping.`);
      return;
    }

    this.namespaces.add(namespace);
    this.state[namespace] = { ...initialState };
    this.initialState[namespace] = { ...initialState };
    
    // Notify that a namespace was initialized
    eventBus.publish('state:namespace:initialized', { namespace, state: this.state[namespace] });
  }

  /**
   * Get the current state for a namespace
   * @param {string} namespace - The state namespace
   * @returns {Object} - The current state
   */
  getState(namespace) {
    if (!this.namespaces.has(namespace)) {
      console.warn(`Namespace ${namespace} is not initialized.`);
      return {};
    }
    
    return { ...this.state[namespace] };
  }

  /**
   * Get the entire application state
   * @returns {Object} - The entire state object
   */
  getAllState() {
    return { ...this.state };
  }

  /**
   * Update state for a namespace
   * @param {string} namespace - The state namespace
   * @param {Object|Function} updater - New state object or updater function
   * @param {string} [source] - Optional source identifier for the update
   */
  setState(namespace, updater, source = '') {
    if (!this.namespaces.has(namespace)) {
      console.warn(`Namespace ${namespace} is not initialized. Initializing with empty state.`);
      this.initNamespace(namespace);
    }

    const oldState = { ...this.state[namespace] };
    let newState;
    
    if (typeof updater === 'function') {
      newState = updater(oldState);
    } else if (typeof updater === 'object' && updater !== null) {
      newState = { ...oldState, ...updater };
    } else {
      console.error('State updater must be an object or function');
      return;
    }
    
    // Update state
    this.state[namespace] = newState;
    
    // Notify subscribers
    eventBus.publish(`state:${namespace}:updated`, { 
      namespace,
      oldState,
      newState,
      source
    });
    
    // Also publish generic state update event
    eventBus.publish('state:updated', { 
      namespace,
      oldState,
      newState,
      source
    });
  }

  /**
   * Reset state for a namespace to its initial value
   * @param {string} namespace - The state namespace
   */
  resetState(namespace) {
    if (!this.namespaces.has(namespace)) {
      console.warn(`Namespace ${namespace} is not initialized.`);
      return;
    }
    
    const oldState = { ...this.state[namespace] };
    this.state[namespace] = { ...this.initialState[namespace] };
    
    // Notify subscribers
    eventBus.publish(`state:${namespace}:reset`, { 
      namespace,
      oldState,
      newState: this.state[namespace]
    });
    
    // Also publish generic state update event
    eventBus.publish('state:updated', { 
      namespace,
      oldState,
      newState: this.state[namespace],
      source: 'reset'
    });
  }

  /**
   * Subscribe to state changes for a namespace
   * @param {string} namespace - The state namespace
   * @param {Function} callback - The callback function
   * @returns {Function} - Unsubscribe function
   */
  subscribe(namespace, callback) {
    return eventBus.subscribe(`state:${namespace}:updated`, callback);
  }

  /**
   * Subscribe to all state changes
   * @param {Function} callback - The callback function
   * @returns {Function} - Unsubscribe function
   */
  subscribeToAll(callback) {
    return eventBus.subscribe('state:updated', callback);
  }
}

// Export a singleton instance
const stateManager = new StateManager();
export default stateManager; 