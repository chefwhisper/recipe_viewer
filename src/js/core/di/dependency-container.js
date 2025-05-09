/**
 * DependencyContainer.js
 * A simple dependency injection container.
 * Helps manage module dependencies and makes testing easier.
 */

class DependencyContainer {
  constructor() {
    this.services = new Map();
    this.factories = new Map();
    this.singletons = new Map();
  }

  /**
   * Register a service factory
   * @param {string} name - The service name
   * @param {Function} factory - The factory function
   * @param {boolean} [singleton=false] - Whether to create a singleton instance
   */
  register(name, factory, singleton = false) {
    if (typeof factory !== 'function') {
      throw new Error(`Factory for ${name} must be a function`);
    }

    this.factories.set(name, factory);
    
    if (singleton) {
      // Mark as singleton but don't instantiate yet (lazy loading)
      this.singletons.set(name, null);
    }
    
    return this;
  }

  /**
   * Get a service instance
   * @param {string} name - The service name
   * @returns {any} - The service instance
   */
  get(name) {
    // Check if it's a singleton that's already instantiated
    if (this.singletons.has(name) && this.singletons.get(name) !== null) {
      return this.singletons.get(name);
    }
    
    // Check if it's a transient service that's already instantiated
    if (this.services.has(name)) {
      return this.services.get(name);
    }
    
    // Check if the factory exists
    if (!this.factories.has(name)) {
      throw new Error(`Service ${name} is not registered`);
    }
    
    // Create the service
    const factory = this.factories.get(name);
    const instance = factory(this);
    
    // If it's a singleton, store it
    if (this.singletons.has(name)) {
      this.singletons.set(name, instance);
    }
    
    return instance;
  }

  /**
   * Register a singleton instance
   * @param {string} name - The service name
   * @param {any} instance - The singleton instance
   */
  registerInstance(name, instance) {
    this.singletons.set(name, instance);
    return this;
  }

  /**
   * Check if a service is registered
   * @param {string} name - The service name
   * @returns {boolean} - True if the service is registered
   */
  has(name) {
    return this.factories.has(name) || this.singletons.has(name);
  }

  /**
   * Remove a service registration
   * @param {string} name - The service name
   */
  remove(name) {
    this.factories.delete(name);
    this.services.delete(name);
    this.singletons.delete(name);
  }

  /**
   * Clear all registrations
   */
  clear() {
    this.factories.clear();
    this.services.clear();
    this.singletons.clear();
  }

  /**
   * Create a child container that inherits registrations
   * @returns {DependencyContainer} - A child container
   */
  createChildContainer() {
    const child = new DependencyContainer();
    
    // Copy parent registrations
    this.factories.forEach((factory, name) => {
      child.factories.set(name, factory);
    });
    
    this.singletons.forEach((instance, name) => {
      child.singletons.set(name, instance);
    });
    
    return child;
  }
}

// Export a singleton instance
const dependencyContainer = new DependencyContainer();
export default dependencyContainer; 