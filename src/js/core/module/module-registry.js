/**
 * ModuleRegistry.js
 * A lightweight registry for tracking module dependencies and metadata.
 * Helps modules discover and interact with each other.
 */
import eventBus from '../events/event-bus.js';

class ModuleRegistry {
    constructor() {
        this.registry = new Map();
        this.dependencyGraph = new Map();
        
        // Register core modules
        this.register('core', { description: 'Core functionality' });
        this.register('event-bus', { description: 'Event bus for pub/sub communication' }, ['core']);
        this.register('state-manager', { description: 'State management' }, ['event-bus']);
        this.register('dependency-container', { description: 'Dependency injection container' }, ['core']);
        this.register('module-loader', { description: 'Module lifecycle management' }, ['event-bus', 'module-registry']);
        this.register('module-registry', { description: 'Module dependency tracking' }, ['core']);
        
        // Register timer module
        this.register('timer', { 
          description: 'Timer functionality for recipe steps',
          version: '1.0.0'
        }, ['event-bus', 'state-manager']);
    }

    /**
     * Register a module with metadata
     * @param {string} name - The module name
     * @param {Object} metadata - The module metadata
     * @param {Array<string>} [dependencies=[]] - Array of dependency module names
     */
    register(name, metadata = {}, dependencies = []) {
        if (this.registry.has(name)) {
            console.warn(`Module ${name} is already registered in the registry. Updating metadata.`);
        }
        
        this.registry.set(name, { 
            name,
            metadata,
            dependencies,
            registeredAt: new Date()
        });
        
        // Update dependency graph
        this.dependencyGraph.set(name, dependencies);
        
        // Emit registration event
        eventBus.publish('registry:module:registered', { name, metadata, dependencies });
        
        // Verify no circular dependencies
        if (this.hasCircularDependency(name)) {
            throw new Error(`Circular dependency detected for module ${name}`);
        }
        
        return this;
    }

    /**
     * Get a module's metadata
     * @param {string} name - The module name
     * @returns {Object} - The module metadata or undefined if not found
     */
    get(name) {
        return this.registry.get(name);
    }

    /**
     * Check if a module is registered
     * @param {string} name - The module name
     * @returns {boolean} - True if the module is registered
     */
    has(name) {
        return this.registry.has(name);
    }

    /**
     * Get all registered modules
     * @returns {Map} - The registry map
     */
    getAll() {
        return new Map(this.registry);
    }

    /**
     * Get modules that depend on a given module
     * @param {string} name - The module name
     * @returns {Array<string>} - Array of dependent module names
     */
    getDependents(name) {
        const dependents = [];
        
        for (const [moduleName, dependencies] of this.dependencyGraph.entries()) {
            if (dependencies.includes(name)) {
                dependents.push(moduleName);
            }
        }
        
        return dependents;
    }

    /**
     * Get a module's dependencies
     * @param {string} name - The module name
     * @returns {Array<string>} - Array of dependency module names
     */
    getDependencies(name) {
        return this.dependencyGraph.get(name) || [];
    }

    /**
     * Check if a circular dependency exists
     * @param {string} name - The module name
     * @param {Array<string>} [path=[]] - Current path for cycle detection
     * @returns {boolean} - True if a cycle is detected
     */
    hasCircularDependency(name, path = []) {
        if (path.includes(name)) {
            console.error(`Circular dependency detected: ${path.join(' -> ')} -> ${name}`);
            return true;
        }
        
        const dependencies = this.getDependencies(name);
        if (!dependencies.length) {
            return false;
        }
        
        const newPath = [...path, name];
        return dependencies.some(dep => this.hasCircularDependency(dep, newPath));
    }

    /**
     * Get a topological sort of the modules based on dependencies
     * @returns {Array<string>} - Array of module names in dependency order
     */
    getLoadOrder() {
        const visited = new Set();
        const temp = new Set();
        const order = [];
        
        const visit = (name) => {
            if (temp.has(name)) {
                throw new Error(`Circular dependency detected: ${name}`);
            }
            
            if (visited.has(name)) {
                return;
            }
            
            temp.add(name);
            
            const dependencies = this.getDependencies(name);
            dependencies.forEach(dep => {
                visit(dep);
            });
            
            temp.delete(name);
            visited.add(name);
            order.push(name);
        };
        
        // Visit each module
        for (const name of this.registry.keys()) {
            if (!visited.has(name)) {
                visit(name);
            }
        }
        
        return order.reverse();
    }

    /**
     * Unregister a module
     * @param {string} name - The module name
     */
    unregister(name) {
        if (!this.registry.has(name)) {
            console.warn(`Module ${name} is not registered in the registry.`);
            return;
        }
        
        // Check for dependents first
        const dependents = this.getDependents(name);
        if (dependents.length > 0) {
            console.warn(`Module ${name} has dependents: ${dependents.join(', ')}. Unregistration might cause issues.`);
        }
        
        this.registry.delete(name);
        this.dependencyGraph.delete(name);
        
        // Update dependency graph to remove references to this module
        for (const [moduleName, dependencies] of this.dependencyGraph.entries()) {
            if (dependencies.includes(name)) {
                this.dependencyGraph.set(
                    moduleName,
                    dependencies.filter(dep => dep !== name)
                );
            }
        }
        
        // Emit unregistration event
        eventBus.publish('registry:module:unregistered', { name });
    }
}

// Export a singleton instance
const moduleRegistry = new ModuleRegistry();
export default moduleRegistry; 