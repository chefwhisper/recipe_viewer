/**
 * Timer UI Component
 * Handles the timer's visual representation
 */

import { createTimerContainer } from './components/timer-ui-container.js';
import { createTimerControls } from './components/timer-ui-controls.js';
import { createTimerDisplay } from './components/timer-ui-display.js';
import { createTimerNotifications } from './components/timer-ui-notifications.js';

/**
 * Create a timer UI module
 * @param {Object} eventBus - Event bus for communication
 * @returns {Object} - Timer UI module
 */
export function createTimerUi(eventBus) {
  // Initialize components
  const container = createTimerContainer();
  const controls = createTimerControls(eventBus);
  const display = createTimerDisplay();
  const notifications = createTimerNotifications();

  return {
    eventBus,
    timerElements: new Map(),
    timersMap: {},
    _updateQueue: new Map(),
    _renderQueue: new Map(),
    _processingUpdate: false,
    _processingRender: false,
    _processingTimers: new Set(),

    /**
     * Initialize the timer UI
     */
    init() {
      try {
        console.log('Timer UI initializing');
        
        // Initialize references
        this.timersMap = {};
        this.timerElements = new Map();
        
        // Set up the container with robust error handling
        const containerInitialized = container.init();
        if (!containerInitialized) {
          console.error('Failed to initialize timer container');
          // Try to initialize the container again after a slight delay
          setTimeout(() => {
            console.log('Retrying timer container initialization');
            container.setupContainer();
          }, 500);
        }
        
        // Check if the container is in the DOM
        const containerElement = container.getContainer();
        if (!containerElement || !document.body.contains(containerElement)) {
          console.error('Timer container not found in DOM after initialization');
          // Try to set up the container again
          setTimeout(() => {
            console.log('Attempting container recovery');
            container.setupContainer();
          }, 1000);
        } else {
          console.log('Timer container found and verified in DOM');
        }
        
        // Set up event handlers
        this.setupEventHandlers();
        
        // Load existing timers
        this.loadExistingTimers();
        
        console.log('Timer UI initialized successfully');
        return true;
      } catch (error) {
        console.error('Error initializing timer UI:', error);
        return false;
      }
    },

    /**
     * Load existing timers
     */
    loadExistingTimers() {
      try {
        console.log('Loading existing timers');
        
        // Request all timers from timer core
        this.eventBus.publish('timer:request:getAll', {});
        
        // As a backup, directly try to render any timers if available
        if (window.moduleLoader && window.moduleLoader.has('timer')) {
          try {
            const timerModule = window.moduleLoader.get('timer')._timerModuleInstance;
            if (timerModule && timerModule._timerCoreInstance) {
              const timers = timerModule._timerCoreInstance.getAllTimers();
              if (timers && timers.length > 0) {
                console.log(`Directly rendering ${timers.length} timers from core instance`);
                this.renderTimers(timers);
              }
            }
          } catch (e) {
            console.error('Error accessing timer module directly:', e);
          }
        }
      } catch (error) {
        console.error('Error loading existing timers:', error);
      }
    },

    /**
     * Set up event handlers
     */
    setupEventHandlers() {
      try {
        console.log('Setting up timer UI event handlers');
        
        // Timer created event
        this.eventBus.subscribe('timer:created', (data) => {
          console.log('Received timer:created event:', data);
          this.renderTimer(data.timer);
        });
        
        // Timer updated events
        this.eventBus.subscribe('timer:started', (data) => {
          console.log('Received timer:started event:', data);
          this.updateTimer(data.timer);
        });
        
        this.eventBus.subscribe('timer:paused', (data) => {
          console.log('Received timer:paused event:', data);
          this.updateTimer(data.timer);
        });
        
        this.eventBus.subscribe('timer:reset', (data) => {
          console.log('Received timer:reset event:', data);
          this.updateTimer(data.timer);
        });
        
        this.eventBus.subscribe('timer:updated', (data) => {
          console.log('Received timer:updated event:', data);
          this.updateTimer(data.timer);
        });
        
        this.eventBus.subscribe('timer:tick', (data) => {
          this.updateTimer(data.timer);
        });
        
        this.eventBus.subscribe('timer:completed', (data) => {
          console.log('Received timer:completed event:', data);
          this.updateTimer(data.timer);
          notifications.handleTimerComplete(data.timer);
        });
        
        // Timer removal event
        this.eventBus.subscribe('timer:removed', (data) => {
          console.log('Received timer:removed event:', data);
          // Handle both formats: either {id} or {timer: {id}}
          const timerId = data.id || (data.timer && data.timer.id);
          if (timerId) {
            console.log(`Removing timer element for timer ${timerId}`);
            this.removeTimerElement(timerId);
          } else {
            console.error('Invalid timer:removed event data format:', data);
          }
        });
        
        // Clear all timers event
        this.eventBus.subscribe('timers:cleared', () => {
          console.log('Received timers:cleared event');
          container.clearContainer();
          this.timersMap = {};
          this.timerElements.clear();
        });
        
        // Timer core reload event
        this.eventBus.subscribe('timers:loaded', (data) => {
          console.log('Received timers:loaded event:', data);
          this.renderTimers(data.timers);
        });
        
        // Timer initialization
        this.eventBus.subscribe('timer:initialized', () => {
          console.log('Received timer:initialized event');
          this.renderExistingTimers();
        });
        
        // Handle window resize
        window.addEventListener('resize', () => container.handleWindowResize());
        
        // Global events
        document.addEventListener('timer:module:ready', () => {
          this.renderExistingTimers();
        });
        
        // Subscribe to the notification event from timer-core
        this.eventBus.subscribe('timer:notify:complete', this.handleTimerNotification.bind(this));
        
        console.log('Timer UI event handlers set up successfully');
      } catch (error) {
        console.error('Error setting up timer UI event handlers:', error);
      }
    },

    /**
     * Process the next update in the queue
     */
    _processUpdateQueue() {
      if (this._processingUpdate || this._updateQueue.size === 0) {
        return;
      }
      
      this._processingUpdate = true;
      let timerId;
      
      try {
        const [id, timer] = this._updateQueue.entries().next().value;
        timerId = id;
        this._updateQueue.delete(id);
        
        if (this._processingTimers.has(timerId)) {
          console.log(`Timer ${timerId} already being processed, skipping update`);
          return;
        }
        
        this._processingTimers.add(timerId);
        
        const timerRefs = this.timersMap[timerId];
        if (!timerRefs) {
          console.log(`Timer ${timerId} not found in UI, queueing render`);
          this._processingTimers.delete(timerId);
          this._queueRender(timer);
          return;
        }
        
        if (!document.body.contains(timerRefs.el)) {
          console.log(`Timer ${timerId} element not in DOM, queueing re-render`);
          delete this.timersMap[timerId];
          this.timerElements.delete(timerId);
          this._processingTimers.delete(timerId);
          this._queueRender(timer);
          return;
        }
        
        display.updateDisplay(timer, timerRefs);
        controls.updatePlayPauseButton(timer);
      } catch (error) {
        console.error('Error processing update queue:', error);
      } finally {
        this._processingUpdate = false;
        if (timerId) {
          this._processingTimers.delete(timerId);
        }
        
        if (this._updateQueue.size > 0) {
          setTimeout(() => this._processUpdateQueue(), 0);
        }
      }
    },

    /**
     * Queue a timer for update
     */
    _queueUpdate(timer) {
      if (this._processingTimers.has(timer.id)) {
        console.log(`Timer ${timer.id} already being processed, skipping update`);
        return;
      }
      this._updateQueue.set(timer.id, timer);
      setTimeout(() => this._processUpdateQueue(), 0);
    },

    /**
     * Process the next render in the queue
     */
    _processRenderQueue() {
      if (this._processingRender || this._renderQueue.size === 0) {
        return;
      }
      
      this._processingRender = true;
      let timerId;
      
      try {
        const [id, timer] = this._renderQueue.entries().next().value;
        timerId = id;
        this._renderQueue.delete(id);
        
        if (this._processingTimers.has(id)) {
          console.log(`Timer ${id} already being processed, skipping render`);
          return;
        }
        
        this._processingTimers.add(id);
        this._renderTimerInternal(timer);
      } catch (error) {
        console.error('Error processing render queue:', error);
      } finally {
        this._processingRender = false;
        if (timerId) {
          this._processingTimers.delete(timerId);
        }
        
        if (this._renderQueue.size > 0) {
          setTimeout(() => this._processRenderQueue(), 0);
        }
      }
    },

    /**
     * Queue a timer for rendering
     */
    _queueRender(timer) {
      if (this._processingTimers.has(timer.id)) {
        console.log(`Timer ${timer.id} already being processed, skipping render`);
        return;
      }
      this._renderQueue.set(timer.id, timer);
      setTimeout(() => this._processRenderQueue(), 0);
    },

    /**
     * Internal method to render a timer
     */
    _renderTimerInternal(timer) {
      try {
        // Check if timer already exists
        const existingContainer = document.getElementById(`timer-container-${timer.id}`);
        if (existingContainer) {
          display.updateDisplay(timer, this.timersMap[timer.id]);
          controls.updatePlayPauseButton(timer);
          return existingContainer;
        }
        
        // Create new timer container
        const timerContainer = document.createElement('div');
        timerContainer.id = `timer-container-${timer.id}`;
        timerContainer.className = 'timer';
        timerContainer.dataset.timerId = timer.id;
        timerContainer.dataset.stepId = timer.metadata?.stepId || '';
        
        try {
          // Create timer name container and name element
          const nameContainer = document.createElement('div');
          nameContainer.className = 'timer-name-container';
          
          const nameElement = document.createElement('span');
          nameElement.className = 'timer-name';
          nameElement.dataset.timerId = timer.id;
          nameElement.textContent = timer.name || controls.generateTimerName(timer) || 'Timer';
          nameElement.title = "Click to edit timer name";
          nameElement.addEventListener('click', () => controls.startEditingName(timer.id));
          
          nameContainer.appendChild(nameElement);
          
          // Create and add step indicator to the name container (next to timer name)
          if (timer.metadata && timer.metadata.stepId !== undefined) {
            const stepIndicator = document.createElement('span');
            stepIndicator.className = 'timer-step-indicator';
            stepIndicator.dataset.stepId = timer.metadata.stepId;
            
            // Get phase-specific step number
            const phaseStep = timer.metadata.phaseStepNumber || '?';
            
            // Check if this is the current step and add current class if needed
            const currentStepId = document.body.dataset.currentStepId;
            const isCurrentStep = currentStepId && currentStepId === timer.metadata.stepId.toString();
            
            if (isCurrentStep) {
              stepIndicator.classList.add('current');
              // Only add dot for current step
              stepIndicator.textContent = `Step ${phaseStep} `;
              
              // Add current indicator dot only for current step
              const currentDot = document.createElement('span');
              currentDot.className = 'current-dot';
              currentDot.textContent = '•';
              stepIndicator.appendChild(currentDot);
            } else {
              // No dot for non-current steps
              stepIndicator.textContent = `Step ${phaseStep}`;
            }
            
            // Create a wrapper for the step pill and delete button
            const rightControls = document.createElement('div');
            rightControls.className = 'timer-right-controls';
            
            // Add the step indicator to the right side wrapper
            rightControls.appendChild(stepIndicator);
            
            // We'll add the delete button to this wrapper later
            nameContainer.appendChild(rightControls);
            
            // Store rightControls for later reference when adding the delete button
            timerContainer.rightControls = rightControls;
          }
          
          timerContainer.appendChild(nameContainer);
          
          // Add timer duration to the container dataset for controls to access
          timerContainer.dataset.duration = timer.duration || 0;
          
          // Fix: Pass timer object along with container and ID to createControls
          const timerControls = controls.createControls(timerContainer, timer.id, timer);
          
          // Add the delete button to the right controls wrapper instead of the name container
          if (timerControls && timerControls.deleteButton) {
            if (timerContainer.rightControls) {
              // Add the delete button next to the step pill
              timerContainer.rightControls.appendChild(timerControls.deleteButton);
            } else {
              // Fallback if no rightControls exists
              nameContainer.appendChild(timerControls.deleteButton);
            }
          }
          
          // Create the timer display with proper error handling
          let timerDisplay;
          try {
            timerDisplay = display.createDisplay(timer);
          } catch (displayError) {
            console.error(`Error creating display for timer ${timer.id}:`, displayError);
            return null;
          }
          
          // Only append to container if the controls and display were created successfully
          if (timerControls && timerDisplay) {
            // Assemble timer - controls first, then display (we're no longer adding the progress bar)
            timerContainer.appendChild(timerControls.container);
            
            // Add to DOM
            const containerEl = container.getContainer();
            if (containerEl) {
              containerEl.appendChild(timerContainer);
            } else {
              console.error('Cannot find timer container element in DOM');
              return null;
            }
            
            // Store references (no longer including the progress bar)
            this.timersMap[timer.id] = {
              el: timerContainer,
              nameEl: nameElement,
              inlineDisplay: timerControls.container.querySelector('.inline-time-display'),
              controls: timerControls.container
            };
            
            return timerContainer;
          } else {
            console.error(`Failed to create UI components for timer ${timer.id}`);
            return null;
          }
        } catch (componentError) {
          console.error(`Error creating timer UI components for timer ${timer.id}:`, componentError);
          return null;
        }
      } catch (error) {
        console.error('Error rendering timer:', error);
        throw error;
      }
    },

    /**
     * Render a timer in the UI
     */
    renderTimer(timer) {
      this._queueRender(timer);
    },

    /**
     * Update a timer in the UI
     */
    updateTimer(timer) {
      this._queueUpdate(timer);
    },

    /**
     * Remove timer element
     */
    removeTimerElement(id) {
      try {
        console.log(`Attempting to remove timer element for ${id}`);
        const timerRef = this.timersMap[id];
        if (!timerRef) {
          console.log(`No timer reference found for ${id}`);
          return;
        }
        
        console.log(`Found timer element reference:`, timerRef);
        
        // Remove the element if it exists in the DOM
        if (timerRef.el && document.body.contains(timerRef.el)) {
          console.log(`Removing timer element from DOM for ${id}`);
          timerRef.el.remove();
        } else {
          console.log(`Timer element not found in DOM for ${id}`);
        }
        
        // Clean up references
        delete this.timersMap[id];
        this.timerElements.delete(id);
        
        console.log(`Timer ${id} removed successfully`);
      } catch (error) {
        console.error('Error removing timer element:', error);
      }
    },

    /**
     * Render multiple timers
     */
    renderTimers(timers) {
      try {
        console.log('Rendering multiple timers:', timers);
        
        if (Array.isArray(timers)) {
          timers.forEach(timer => {
            this.renderTimer(timer);
          });
        }
      } catch (error) {
        console.error('Error rendering multiple timers:', error);
      }
    },

    /**
     * Render existing timers
     */
    renderExistingTimers() {
      this.loadExistingTimers();
    },

    /**
     * Handle timer notification event
     * @param {Object} data - Event data
     */
    handleTimerNotification(data) {
      // Forward to notifications component to play sound
      if (data && data.playSound) {
        // Only attempt to play sound if explicitly requested
        notifications.playTimerCompleteSound();
      }
    }
  };
}

export default createTimerUi;