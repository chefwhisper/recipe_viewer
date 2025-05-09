/**
 * ModuleLoader.js
 * A utility for consistent module initialization.
 * Provides lifecycle management for modules.
 */
import eventBus from '../events/event-bus.js';

class ModuleLoader {
    constructor() {
        this.modules = new Map();
        this.initialized = new Set();
    }

    /**
     * Register a module
     * @param {string} name - The module name
     * @param {Object} module - The module object with init method
     */
    register(name, module) {
        if (this.modules.has(name)) {
            console.warn(`Module ${name} is already registered. Overwriting.`);
        }
        
        this.modules.set(name, module);
        
        // Emit registration event
        eventBus.publish('module:registered', { name, module });
        return this;
    }

    /**
     * Initialize a module
     * @param {string} name - The module name
     * @param {Object} [options] - Options to pass to the module init method
     * @returns {Promise} - Promise that resolves when the module is initialized
     */
    async init(name, options = {}) {
        const module = this.modules.get(name);
        if (!module) {
            throw new Error(`Module ${name} is not registered`);
        }

        if (this.initialized.has(name)) {
            console.warn(`Module ${name} is already initialized`);
            return Promise.resolve();
        }

        try {
            // If the module has dependencies, initialize them first
            if (module.dependencies && Array.isArray(module.dependencies)) {
                for (const dependency of module.dependencies) {
                    if (!this.initialized.has(dependency)) {
                        await this.init(dependency, options);
                    }
                }
            }

            // Initialize the module
            if (typeof module.init === 'function') {
                await Promise.resolve(module.init(options));
            }
            
            this.initialized.add(name);
            eventBus.publish('module:initialized', { name, module });
            
            return Promise.resolve();
        } catch (error) {
            eventBus.publish('module:error', { name, error, stage: 'init' });
            throw error;
        }
    }

    /**
     * Get a registered module
     * @param {string} name - The module name
     * @returns {Object} - The module object
     */
    get(name) {
        return this.modules.get(name);
    }

    /**
     * Check if a module is registered
     * @param {string} name - The module name
     * @returns {boolean} - True if the module is registered
     */
    has(name) {
        return this.modules.has(name);
    }

    /**
     * Check if a module is initialized
     * @param {string} name - The module name
     * @returns {boolean} - True if the module is initialized
     */
    isInitialized(name) {
        return this.initialized.has(name);
    }
}

// Export a singleton instance
const moduleLoader = new ModuleLoader();
export default moduleLoader;

// Register core modules
import eventBusModule from '../events/event-bus.js';
import stateManager from '../state/state-manager.js';
import dependencyContainer from '../di/dependency-container.js';

// Register timer module
import { createTimerModule } from '../../modules/timer/index.js';

// Register voice integration
import { createTimerVoiceIntegration } from '../../modules/voice/timer-voice-integration.js';

// Initialize modules
moduleLoader.register('event-bus', eventBusModule);
moduleLoader.register('state-manager', stateManager);
moduleLoader.register('dependency-container', dependencyContainer);

// Register the timer module with proper handling of the module instance
moduleLoader.register('timer', { 
  _timerModuleInstance: null,
  init: async (options = {}) => {
    // Pass the event bus to the timer module
    const timerModule = createTimerModule({
      eventBus: eventBus,
      container: document.getElementById('timer-container')
    });
    await timerModule.init(options);
    moduleLoader.modules.get('timer')._timerModuleInstance = timerModule;
    console.log('Timer module initialized successfully');
    return timerModule;
  }
});

// Register the timer voice integration
moduleLoader.register('timer-voice', {
  _voiceIntegration: null,
  // Define timer as a dependency to ensure it's loaded first
  dependencies: ['timer'],
  init: async () => {
    console.log('Initializing timer voice integration');
    const voiceIntegration = createTimerVoiceIntegration();
    moduleLoader.modules.get('timer-voice')._voiceIntegration = voiceIntegration;
    return voiceIntegration;
  }
}); 