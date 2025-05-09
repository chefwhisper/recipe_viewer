/**
 * Services.js
 * Registers services with the dependency container.
 */
import dependencyContainer from './di/dependency-container.js';
import eventBus from './events/event-bus.js';
import moduleLoader from './module/module-loader.js';
import moduleRegistry from './module/module-registry.js';
import stateManager from './state/state-manager.js';

/**
 * Register core services
 */
export function registerCoreServices() {
  // Register each service as a singleton
  dependencyContainer.registerInstance('eventBus', eventBus);
  dependencyContainer.registerInstance('moduleLoader', moduleLoader);
  dependencyContainer.registerInstance('moduleRegistry', moduleRegistry);
  dependencyContainer.registerInstance('stateManager', stateManager);
  dependencyContainer.registerInstance('dependencyContainer', dependencyContainer);
  
  console.log('Core services registered with dependency container');
}

/**
 * Register a module with the dependency container and module registry
 * @param {string} name - The module name
 * @param {Object} moduleInstance - The module instance
 * @param {Object} metadata - Optional module metadata
 * @param {Array<string>} dependencies - Optional module dependencies
 */
export function registerModule(name, moduleInstance, metadata = {}, dependencies = []) {
  // Register with dependency container
  dependencyContainer.registerInstance(`module.${name}`, moduleInstance);
  
  // Register with module registry
  moduleRegistry.register(name, metadata, dependencies);
  
  // Register with module loader
  moduleLoader.register(name, moduleInstance);
  
  console.log(`Module '${name}' registered with dependency container, registry, and loader`);
}

// Automatically register core services
registerCoreServices(); 