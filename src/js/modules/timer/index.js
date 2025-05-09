/**
 * Timer Module
 * Main module that coordinates all timer functionality
 */

import { Timer } from './timer.js';
import { createTimerCore } from './timer-core.js';
import { createTimerUi } from './timer-ui.js';
import eventBus from '../../core/events/event-bus.js';
import * as timerUtils from './utils/timer-utils.js';

// Timer Events enum
const TimerEvents = {
  INITIALIZED: 'timer:initialized',
  REQUEST_CREATE: 'timer:request:create',
  REQUEST_START: 'timer:request:start',
  REQUEST_PAUSE: 'timer:request:pause',
  REQUEST_RESET: 'timer:request:reset',
  REQUEST_REMOVE: 'timer:request:remove',
  REQUEST_RENAME: 'timer:request:rename',
  REQUEST_ADD_METADATA: 'timer:request:addMetadata',
  REQUEST_HIGHLIGHT_STEP: 'timer:request:highlightStep'
};

export class TimerModule {
  constructor(eventBusInstance) {
    // Use the provided event bus or fall back to the imported one
    this.eventBus = eventBusInstance || eventBus;
    this.timerCore = null;
    this.timerUi = null;
    
    // Track processed steps and timers to prevent duplicates
    this.processedSteps = new Set();
    this.stepTimers = {};
    
    // Keep track of initialization status
    this.initialized = false;
  }

  /**
   * Initialize the timer module
   * @param {Object} options - Module options
   * @param {boolean} options.enableUi - Whether to enable UI
   * @returns {boolean} - Success status
   */
  async init(options = {}) {
    try {
      // Skip if already initialized
      if (this.initialized) {
        console.log('Timer module already initialized');
        return this;
      }
      
      // Store options
      this.options = {
        enableUi: true,
        autoAdvanceOnComplete: false,
        onTimerComplete: null,
        ...options
      };
      
      // Initialize event bus if not provided
      if (!this.eventBus) {
        const { default: eventBus } = await import('../../core/events/event-bus.js');
        this.eventBus = eventBus;
      }
      
      // Clear any existing timers from previous sessions if not explicitly told to keep them
      if (!options.keepExistingTimers) {
        await this.clearAllTimers();
      }
      
      // Initialize timer core
      if (!this.timerCore) {
        const { default: createTimerCore } = await import('./timer-core.js');
        this.timerCore = createTimerCore(this.eventBus);
        await this.timerCore.init();
      }
      
      // Initialize timer UI if enabled
      if (this.options.enableUi && !this.timerUi) {
        const { default: createTimerUi } = await import('./timer-ui.js');
        this.timerUi = createTimerUi(this.eventBus);
        await this.timerUi.init();
      }
      
      // Initialize command interface if available
      try {
        const { default: createTimerCommandInterface } = await import('./timer-command-interface.js');
        this.timerCommandInterface = createTimerCommandInterface(this.eventBus);
        await this.timerCommandInterface.init();
      } catch (error) {
        console.log('Timer command interface not available:', error);
      }
      
      // Set up event listeners
      this.setupEventHandlers();
      
      // Mark as initialized
      this.initialized = true;
      
      // Publish initialization event
      this.eventBus.publish('timer:initialized', {});
      
      // Dispatch global event
      document.dispatchEvent(new CustomEvent('timer:module:ready'));
      
      // Expose module to window for debugging
      if (typeof window !== 'undefined') {
        window.timerModule = this;
        console.log('Timer module exposed to window.timerModule for debugging');
      }
      
      console.log('Timer module initialized successfully');
      
      return this;
    } catch (error) {
      console.error('Error initializing timer module:', error);
      return this;
    }
  }

  /**
   * Check if the module is initialized
   * @returns {boolean} - True if the module is initialized
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Set up additional event handlers
   */
  setupEventHandlers() {
    // Listen for step changes to update highlighting
    this.eventBus.subscribe('step:changed', (data) => {
      if (data && data.stepId !== undefined) {
        this.highlightStep(data.stepId);
      }
    });
    
    // Listen for timer command processing events
    this.eventBus.subscribe('timer:command:process', (data) => {
      if (data && data.command && this.timerCommandInterface) {
        console.log('Timer module received command to process:', data.command);
        
        try {
          // Process the command and log detailed results
          const success = this.timerCommandInterface.processCommand(data.command);
          console.log('Timer command processing result:', success ? 'Successful' : 'Failed');
          
          // If the command failed to process, try to identify why
          if (!success) {
            // Try direct startTimer by name for commands like "start X timer"
            const startTimerMatch = data.command.match(/start\s+(?:the\s+)?(.+?)(?:\s+timer)?/i);
            if (startTimerMatch && startTimerMatch[1]) {
              const timerName = startTimerMatch[1].toLowerCase();
              const timerNameWithSuffix = timerName.endsWith(' timer') ? timerName : timerName + ' timer';
              
              console.log(`Trying direct timer start for: "${timerName}" or "${timerNameWithSuffix}"`);
              
              // Get all timers and find matching ones
              const allTimers = this.timerCore.getAllTimers();
              console.log('Available timers:', Object.keys(allTimers).map(id => allTimers[id].name));
              
              // Try to find a timer with a similar name
              let foundMatch = false;
              const timerIds = Object.keys(allTimers);
              
              for (const id of timerIds) {
                const timer = allTimers[id];
                const timerNameLower = timer.name.toLowerCase();
                
                if (timerNameLower.includes(timerName) || 
                    timerName.includes(timerNameLower) ||
                    timerNameLower === timerNameWithSuffix.toLowerCase()) {
                  console.log(`Found matching timer: ${timer.name}, starting it directly`);
                  this.eventBus.publish('timer:request:start', { id });
                  foundMatch = true;
                }
              }
              
              if (!foundMatch) {
                console.log(`No timer found matching name: ${timerName} or ${timerNameWithSuffix}`);
              }
              
              return foundMatch;
            }
          }
        } catch (error) {
          console.error('Error processing timer command:', error);
        }
      } else {
        console.log('Invalid timer command data received:', data);
      }
    });
    
    // Listen for timer list requests
    this.eventBus.subscribe('timer:request:list:all', (data) => {
      console.log('Received request to list all timers');
      const timers = this.getAllTimers();
      
      // Format timers for better logging
      const formattedTimers = Object.entries(timers).map(([id, timer]) => ({
        id,
        name: timer.name,
        duration: timer.duration,
        status: timer.status
      }));
      
      console.log('Available timers:', formattedTimers);
      
      // Call the callback if provided
      if (data && typeof data.callback === 'function') {
        data.callback(formattedTimers);
      }
    });
  }

  /**
   * Clean up the timer module
   */
  cleanup() {
    if (this.timerCore) {
      this.timerCore.cleanup();
    }
    if (this.timerUi) {
      this.timerUi.cleanup();
    }
    
    // Clear the step timers and processed steps
    this.stepTimers = {};
    this.processedSteps.clear();
    
    // Reset initialization status
    this.initialized = false;
  }

  /**
   * Create a timer
   * @param {Object} timerData - Timer data
   * @returns {Promise<string|null>} - Timer ID or null if failed
   */
  createTimer(timerData) {
    // Enhanced duplicate detection - create a more reliable signature
    const stepId = timerData.metadata?.stepId;
    const timerSignature = this._createTimerSignature(timerData);
    
    if (stepId !== undefined) {
      const stepKey = `step-${stepId}`;
      
      // Initialize tracking for this step if needed
      if (!this.stepTimers[stepKey]) {
        this.stepTimers[stepKey] = new Set();
      }
      
      // Skip if this timer has already been created for this step
      if (this.stepTimers[stepKey].has(timerSignature)) {
        console.log(`Skipping duplicate timer: ${timerSignature} for step ${stepKey}`);
        return Promise.resolve(null);
      }
      
      // Track this timer to avoid duplicates
      this.stepTimers[stepKey].add(timerSignature);
    }
    
    console.log('Timer module creating timer with data:', timerData);
    
    // Set current step ID for proper highlighting
    if (stepId !== undefined) {
      document.body.dataset.currentStepId = stepId.toString();
      
      // Set additional data if available
      if (timerData.metadata?.stepPhase) {
        document.body.dataset.currentPhase = timerData.metadata.stepPhase;
      }
      
      if (timerData.metadata?.phaseStepNumber) {
        document.body.dataset.currentPhaseStepNumber = timerData.metadata.phaseStepNumber.toString();
      }
    }

    // Publish the request to the event bus
    this.eventBus.publish(TimerEvents.REQUEST_CREATE, timerData);
    
    // Return a promise that resolves when the timer is created
    return new Promise((resolve) => {
      // Use a variable to store the unsubscribe function
      let unsubscribeFunc = null;
      
      // Add a timeout to prevent hanging if no response is received
      const timeoutId = setTimeout(() => {
        console.warn(`Timer creation timeout for ${timerData.name}`);
        // Clean up the subscription if the timeout is hit
        if (unsubscribeFunc && typeof unsubscribeFunc === 'function') {
          unsubscribeFunc();
        } else if (this.eventBus.unsubscribe) {
          this.eventBus.unsubscribe('timer:created:response', responseHandler);
        }
        resolve(null);
      }, 3000); // 3 seconds timeout
      
      // Listen for the response
      const responseHandler = (response) => {
        // Clear the timeout
        clearTimeout(timeoutId);
        
        // Resolve with the timer ID
        if (response && response.id) {
          resolve(response.id);
        } else {
          resolve(null);
        }
        
        // Clean up the event handler
        if (unsubscribeFunc && typeof unsubscribeFunc === 'function') {
          unsubscribeFunc();
        } else if (this.eventBus.unsubscribe) {
          this.eventBus.unsubscribe('timer:created:response', responseHandler);
        }
      };
      
      // Add the event listener
      if (this.eventBus.subscribeOnce) {
        unsubscribeFunc = this.eventBus.subscribeOnce('timer:created:response', responseHandler);
      } else {
        this.eventBus.subscribe('timer:created:response', responseHandler);
      }
    });
  }

  /**
   * Create timers for a recipe step
   * @param {Object} step - Recipe step object
   * @param {Object} context - Step context information
   * @param {number} context.stepIndex - Current step index
   * @param {string} context.phase - Current phase (preparation/cooking)
   * @param {number} context.phaseStepNumber - Step number within the current phase
   * @returns {Promise<Array>} - Array of created timer IDs
   */
  async createTimersForStep(step, context) {
    // Ensure the module is initialized
    if (!this.initialized) {
      console.error('Timer module not initialized. Call initialize() first.');
      return Promise.resolve([]);
    }
    
    if (!step) {
      console.error('Invalid step provided to createTimersForStep');
      return [];
    }

    const { stepIndex, phase, phaseStepNumber } = context;
    
    // Generate a unique key for this step
    const stepKey = `${phase}-step-${stepIndex}`;
    
    // Skip if we've already processed this step
    if (this.processedSteps.has(stepKey)) {
      console.log('Step already processed, skipping timer detection');
      return [];
    }
    
    // Mark this step as processed to avoid duplicate timer creation
    this.processedSteps.add(stepKey);
    
    try {
      // Create step context information
      const phaseDisplayName = phase === 'preparation' ? 'Preparation' : 'Cooking';
      const stepLabel = `${phaseDisplayName} Step ${phaseStepNumber}`;
      
      // Find timers in the step content
      const timers = timerUtils.findTimersInStep(step);
      console.log(`Found ${timers.length} timers in step`, timers);
      
      // Array to hold promises for timer creation
      const timerPromises = [];
      
      // Process each found timer
      for (const timerInfo of timers) {
        try {
          // Get the source text for better naming
          const sourceText = timerInfo.source === 'main' ? 
            step.description : 
            step.bullets[timerInfo.bulletIndex];
          
          // Create timer with proper metadata
          const timerPromise = this.createTimer({
            name: timerInfo.label || stepLabel,
            duration: timerInfo.duration,
            metadata: {
              stepId: stepIndex,
              stepIndex: stepIndex,
              stepPhase: phase,
              phaseStepNumber: phaseStepNumber,
              source: timerInfo.source,
              bulletIndex: timerInfo.bulletIndex,
              matchIndex: timerInfo.matchIndex,
              stepTitle: stepLabel,
              sourceText: sourceText
            }
          });
          
          timerPromises.push(timerPromise);
        } catch (timerError) {
          console.error("Error creating timer:", timerError);
        }
      }
      
      // Wait for all timers to be created and return their IDs
      const timerIds = await Promise.all(timerPromises);
      console.log(`Created ${timerIds.filter(id => id !== null).length} timers for step ${stepIndex}`);
      return timerIds.filter(id => id !== null);
    } catch (error) {
      console.error("Error processing timers for step:", error);
      return [];
    }
  }

  /**
   * Clear processed steps tracker
   */
  clearProcessedSteps() {
    // Clear the set of processed steps
    this.processedSteps.clear();
    
    // Also clear local tracking
    this.stepTimers = {};
  }

  /**
   * Create a unique signature for a timer to detect duplicates
   * @private
   * @param {Object} timerData - Timer data
   * @returns {string} - Unique timer signature
   */
  _createTimerSignature(timerData) {
    const stepId = timerData.metadata?.stepId || 'unknown';
    const duration = timerData.duration || 0;
    const source = timerData.metadata?.source || 'unknown';
    const bulletIndex = timerData.metadata?.bulletIndex !== undefined ? timerData.metadata.bulletIndex : -1;
    const matchIndex = timerData.metadata?.matchIndex !== undefined ? timerData.metadata.matchIndex : -1;
    
    // Create a unique signature that captures all the essential characteristics
    return `${stepId}-${source}-${bulletIndex}-${matchIndex}-${duration}`;
  }

  /**
   * Start a timer
   * @param {string} id - Timer ID
   */
  startTimer(id) {
    this.eventBus.publish(TimerEvents.REQUEST_START, { id });
  }

  /**
   * Pause a timer
   * @param {string} id - Timer ID
   */
  pauseTimer(id) {
    this.eventBus.publish(TimerEvents.REQUEST_PAUSE, { id });
  }

  /**
   * Reset a timer
   * @param {string} id - Timer ID
   */
  resetTimer(id) {
    this.eventBus.publish(TimerEvents.REQUEST_RESET, { id });
  }

  /**
   * Remove a timer
   * @param {string} id - Timer ID
   */
  removeTimer(id) {
    this.eventBus.publish(TimerEvents.REQUEST_REMOVE, { id });
  }

  /**
   * Get a timer
   * @param {string} id - Timer ID
   * @returns {Object|null} - Timer object
   */
  getTimer(id) {
    if (this.timerCore) {
      return this.timerCore.getTimer(id);
    }
    return null;
  }

  /**
   * Get all timers
   * @returns {Array} - Array of timer objects
   */
  getAllTimers() {
    if (this.timerCore) {
      return this.timerCore.getAllTimers();
    }
    return [];
  }

  /**
   * Clear all timers
   */
  clearAllTimers() {
    console.log('Timer module: clearAllTimers called');
    try {
      if (this.timerCore) {
        if (typeof this.timerCore.clearAllTimers === 'function') {
          this.timerCore.clearAllTimers();
        } else {
          // Fall back to the event bus approach
          this.eventBus.publish('timer:request:clear', {});
        }
      } else {
        // Directly publish an event if no timerCore
        this.eventBus.publish('timer:request:clear', {});
      }
      
      // Clear step tracking data
      this.stepTimers = {};
      this.processedSteps.clear();
      
      // Dispatch a global event to notify other components
      document.dispatchEvent(new CustomEvent('timers:all:cleared'));
      
      console.log('All timers cleared completely from the timer module');
      return true;
    } catch (error) {
      console.error('Error clearing all timers:', error);
      return false;
    }
  }

  /**
   * Rename a timer
   * @param {string} id - Timer ID
   * @param {string} name - New name
   */
  renameTimer(id, name) {
    this.eventBus.publish(TimerEvents.REQUEST_RENAME, { id, name });
  }

  /**
   * Add metadata to a timer
   * @param {string} id - Timer ID
   * @param {Object} metadata - Timer metadata
   */
  addMetadata(id, metadata) {
    this.eventBus.publish(TimerEvents.REQUEST_ADD_METADATA, { id, metadata });
  }

  /**
   * Highlight timers for a specific step
   * @param {string|number} stepId - Step ID
   */
  highlightStep(stepId) {
    if (stepId === undefined || stepId === null) return;
    
    // Set step ID in document body for UI components to access
    document.body.dataset.currentStepId = stepId.toString();
    
    // Publish event for UI component to update highlighting
    this.eventBus.publish(TimerEvents.REQUEST_HIGHLIGHT_STEP, { stepId });
    
    // Update UI immediately if available
    if (this.timerUi) {
      // Get all timer elements
      const timerElements = document.querySelectorAll('.timer');
      
      // Update each timer's highlighting state
      timerElements.forEach(timerEl => {
        const timerStepId = timerEl.dataset.stepId;
        
        if (timerStepId) {
          // Add or remove highlighting classes
          timerEl.classList.toggle('current-step', timerStepId === stepId.toString());
          timerEl.classList.toggle('previous-step', 
            timerStepId !== stepId.toString() && parseInt(timerStepId) < parseInt(stepId));
        }
      });
      
      // Update step indicators
      const stepIndicators = document.querySelectorAll('.timer-step-indicator');
      stepIndicators.forEach(indicator => {
        if (indicator.dataset.stepId) {
          indicator.classList.toggle('current', indicator.dataset.stepId === stepId.toString());
        }
      });
    }
  }
}

// Create a singleton instance after the class is defined
const timerModule = new TimerModule();

// Export the singleton instance with proper method binding
export default {
  // Expose the instance methods properly bound to the instance
  initialize: async (options = {}) => timerModule.init(options),
  isInitialized: () => timerModule.isInitialized(),
  createTimer: (timerData) => timerModule.createTimer(timerData),
  startTimer: (id) => timerModule.startTimer(id),
  pauseTimer: (id) => timerModule.pauseTimer(id),
  resetTimer: (id) => timerModule.resetTimer(id),
  removeTimer: (id) => timerModule.removeTimer(id),
  getTimer: (id) => timerModule.getTimer(id),
  getAllTimers: () => timerModule.getAllTimers(),
  clearAllTimers: () => timerModule.clearAllTimers(),
  renameTimer: (id, name) => timerModule.renameTimer(id, name),
  addMetadata: (id, metadata) => timerModule.addMetadata(id, metadata),
  highlightStep: (stepId) => timerModule.highlightStep(stepId),
  
  // Add step timer manager methods directly in the main module
  createTimersForStep: (step, context) => timerModule.createTimersForStep(step, context),
  clearProcessedSteps: () => timerModule.clearProcessedSteps(),
  
  // Expose utility functions
  utils: {
    findTimersInStep: timerUtils.findTimersInStep,
    createStepTimerKey: timerUtils.createStepTimerKey,
    createTimerLabel: timerUtils.createTimerLabel,
    generateTimerName: timerUtils.generateTimerName,
    extractDuration: timerUtils.extractDuration,
    formatTimeForDisplay: timerUtils.formatTimeForDisplay,
    calculateCompletion: timerUtils.calculateCompletion
  }
};

// Expose the instance to the window object for easy debugging
if (typeof window !== 'undefined') {
  window.timerModule = timerModule;
}

// Export the factory function for creating additional instances
export function createTimerModule(options = {}) {
  const moduleInstance = new TimerModule(options.eventBus);
  moduleInstance.init(options);
  return moduleInstance;
}