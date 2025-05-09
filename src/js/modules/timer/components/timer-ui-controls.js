/**
 * Timer UI Controls Component
 * Handles timer controls and interactions
 */
import { generateTimerName } from '../utils/timer-utils.js';
import { formatTimeMMSS } from '../../utils/common.js';

/**
 * Create timer controls module
 * @param {Object} eventBus - Event bus instance
 * @returns {Object} Timer controls interface
 */
export function createTimerControls(eventBus) {
  if (!eventBus) {
    throw new Error('Event bus is required for timer controls');
  }

  // Track active name editors
  const activeEditors = new Map();
  // Track time displays by timer ID
  const timeDisplays = new Map();

  // Subscribe to timer events to update time displays
  eventBus.subscribe('timer:created', (data) => {
    if (data && data.timer) {
      const timerId = data.timer.id;
      const display = timeDisplays.get(timerId);
      if (display) {
        display.innerHTML = formatTimeMMSS(data.timer.duration);
      }
    }
  });

  eventBus.subscribe('timer:started', (data) => {
    if (data && data.timer) {
      const timerId = data.timer.id;
      const display = timeDisplays.get(timerId);
      if (display) {
        display.innerHTML = formatTimeMMSS(data.timer.remaining);
      }
    }
  });
  
  // Add a subscriber for reset events to update the display immediately
  eventBus.subscribe('timer:reset', (data) => {
    if (data && data.id) {
      // First try to use the timer object directly from the event data
      if (data.timer) {
        const display = timeDisplays.get(data.id);
        if (display) {
          display.innerHTML = formatTimeMMSS(data.timer.duration);
        }
      } 
      // Fall back to getting the timer from the timer module
      else if (window.timerModule && typeof window.timerModule.getTimer === 'function') {
        const timer = window.timerModule.getTimer(data.id);
        if (timer) {
          const display = timeDisplays.get(data.id);
          if (display) {
            display.innerHTML = formatTimeMMSS(timer.duration);
          }
        }
      }
    }
  });

  return {
    /**
     * Create controls for a timer
     * @param {HTMLElement} container - The container to add controls to
     * @param {string} timerId - The ID of the timer
     * @param {Object} [timerObject] - The timer object (optional)
     * @returns {Object} - References to the created elements
     */
    createControls(container, timerId, timerObject) {
      if (!container || !timerId) {
        console.error('Cannot create timer controls: missing container or timer ID');
        return null;
      }

      console.log(`Creating timer controls for timer ${timerId}`);
      
      try {
        // Create main controls container
        const controls = document.createElement('div');
        controls.className = 'timer-controls';
        controls.dataset.timerId = timerId;
        
        // Create button container div that will hold ALL buttons AND the time display
        const buttonRow = document.createElement('div');
        buttonRow.className = 'timer-button-row';
        
        // Get the timer object to display the actual duration
        let timerDuration = 0;
        console.log(`Creating controls for timer ${timerId}, attempting to get duration`);
        
        // First, try to use the directly passed timer object
        if (timerObject && timerObject.duration) {
          timerDuration = timerObject.duration;
          console.log(`Using direct timer object duration: ${timerDuration}`);
        }
        // Next, try to get duration from the timer module
        else if (window.timerModule && typeof window.timerModule.getTimer === 'function') {
          console.log(`Timer module available, trying to get timer data for ${timerId}`);
          const timer = window.timerModule.getTimer(timerId);
          console.log('Timer data:', timer);
          if (timer) {
            timerDuration = timer.duration || timer.remaining || 0;
            console.log(`Got timer duration: ${timerDuration}`);
          }
        } else {
          console.log('Timer module not available or getTimer method missing');
        }
        
        // Fallback to the container data if timer object is not available
        if (!timerDuration && container.dataset.duration) {
          timerDuration = parseInt(container.dataset.duration, 10);
          console.log(`Using container dataset duration: ${timerDuration}`);
        }
        
        // Additional fallback - try to get duration from the document dataset
        if (!timerDuration && document.querySelector(`[data-timer-id="${timerId}"]`)?.dataset?.duration) {
          timerDuration = parseInt(document.querySelector(`[data-timer-id="${timerId}"]`).dataset.duration, 10);
          console.log(`Using DOM element dataset duration: ${timerDuration}`);
        }
        
        console.log(`Final timer duration for display: ${timerDuration}`);
        
        // Create INLINE time display for showing current time
        const timeDisplay = document.createElement('div');
        timeDisplay.className = 'inline-time-display';
        timeDisplay.innerHTML = formatTimeMMSS(timerDuration);
        timeDisplay.dataset.timerId = timerId;
        
        // Store the time display element for later updates
        timeDisplays.set(timerId, timeDisplay);
        
        // Create buttons with proper labeling and styling
        const startButton = document.createElement('button');
        startButton.className = 'timer-button start-button';
        startButton.innerHTML = '<i class="fa fa-play"></i>';
        startButton.dataset.action = 'start';
        startButton.dataset.timerId = timerId;
        startButton.setAttribute('aria-label', 'Start Timer');
        startButton.title = 'Start Timer';
        
        const pauseButton = document.createElement('button');
        pauseButton.className = 'timer-button pause-button';
        pauseButton.innerHTML = '<i class="fa fa-pause"></i>';
        pauseButton.dataset.action = 'pause';
        pauseButton.dataset.timerId = timerId;
        pauseButton.setAttribute('aria-label', 'Pause Timer');
        pauseButton.title = 'Pause Timer';
        
        const resetButton = document.createElement('button');
        resetButton.className = 'timer-button reset-button';
        resetButton.innerHTML = '<i class="fa fa-sync-alt"></i>';
        resetButton.dataset.action = 'reset';
        resetButton.dataset.timerId = timerId;
        resetButton.setAttribute('aria-label', 'Reset Timer');
        resetButton.title = 'Reset Timer';
        
        // Assemble the buttons and time display in the correct order
        buttonRow.appendChild(startButton);
        buttonRow.appendChild(pauseButton);
        buttonRow.appendChild(resetButton);
        buttonRow.appendChild(timeDisplay); // Time display is INLINE with buttons
        
        // Add button row to controls
        controls.appendChild(buttonRow);
        
        // Add delete button (separate from button row)
        const deleteButton = document.createElement('button');
        deleteButton.className = 'timer-button delete-button';
        deleteButton.innerHTML = '<i class="fa fa-trash"></i>';
        deleteButton.dataset.action = 'delete';
        deleteButton.dataset.timerId = timerId;
        deleteButton.setAttribute('aria-label', 'Delete Timer');
        deleteButton.title = 'Delete Timer';
        
        // Explicitly add the click handler to ensure it works
        deleteButton.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log(`Delete button clicked directly for timer ${timerId}`);
          eventBus.publish('timer:request:remove', { id: timerId });
        });
        
        // Add controls to container but not the delete button (it will be positioned elsewhere)
        container.appendChild(controls);
        
        // Set up event listeners
        this.setupControlEvents(controls);
        
        // Cleanup timeDisplays when timer is removed
        container.addEventListener('DOMNodeRemoved', () => {
          timeDisplays.delete(timerId);
        });
        
        // Return references to created elements (including the separate delete button)
        return {
          container: controls,
          startButton,
          pauseButton,
          resetButton,
          deleteButton, // Return the delete button separately so it can be positioned elsewhere
          timeDisplay, // Return reference to the inline time display
        };
      } catch (error) {
        console.error('Error creating timer controls:', error);
        return null;
      }
    },

    /**
     * Generate a smart timer name based on context
     * Uses the implementation from timer-utils.js
     * @param {Object} timer - Timer object
     * @returns {string} - Generated timer name
     */
    generateTimerName(timer) {
      // First, prioritize using the label if it was already generated by timer-utils.js
      if (timer.label) {
        return timer.label;
      }
      
      // Use metadata for naming if available
      if (timer.metadata) {
        // If we have source text and match index, use the advanced naming function
        if (timer.metadata.sourceText && timer.metadata.matchIndex !== undefined) {
          return generateTimerName(
            timer.metadata.sourceText,
            timer.metadata.matchIndex,
            timer.metadata.stepTitle
          );
        }
        
        // Fallback to simple metadata-based naming
        if (timer.metadata.stepTitle) {
          return timer.metadata.stepTitle;
        }
        
        if (timer.metadata.stepPhase && timer.metadata.stepIndex !== undefined) {
          return `${timer.metadata.stepPhase.charAt(0).toUpperCase() + timer.metadata.stepPhase.slice(1)} step ${timer.metadata.stepIndex + 1}`;
        }
      }
      
      // Default name if no context available
      return timer.name || "Timer";
    },

    /**
     * Start editing timer name
     * @param {string} id - Timer ID
     */
    startEditingName(id) {
      if (!id || activeEditors.has(id)) return;

      const nameEl = document.querySelector(`.timer-name[data-timer-id="${id}"]`);
      if (!nameEl) return;

      const originalName = nameEl.textContent;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'timer-name-input';
      input.value = originalName;
      input.maxLength = 50;
      input.dataset.timerId = id;

      const handleSave = () => this.saveNameEdit(id, input.value.trim());
      const handleCancel = () => this.cancelNameEdit(id, originalName);

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSave();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCancel();
        }
      });

      input.addEventListener('blur', handleSave);

      nameEl.replaceWith(input);
      input.focus();
      input.select();

      activeEditors.set(id, { originalName, input });
    },

    /**
     * Save timer name edit
     * @param {string} id - Timer ID
     * @param {string} name - New timer name
     */
    saveNameEdit(id, name) {
      if (!id || !activeEditors.has(id)) return;

      const { originalName } = activeEditors.get(id);
      const validName = name || 'Timer';

      if (validName !== originalName) {
        eventBus.publish('timer:rename', { id, name: validName });
      }

      const nameEl = document.createElement('span');
      nameEl.className = 'timer-name';
      nameEl.dataset.timerId = id;
      nameEl.textContent = validName;
      nameEl.title = "Click to edit timer name";
      nameEl.addEventListener('click', () => this.startEditingName(id));

      const input = document.querySelector(`.timer-name-input[data-timer-id="${id}"]`);
      if (input) {
        input.replaceWith(nameEl);
      }

      activeEditors.delete(id);
    },

    /**
     * Cancel timer name edit
     * @param {string} id - Timer ID
     * @param {string} originalName - Original timer name
     */
    cancelNameEdit(id, originalName) {
      if (!id || !activeEditors.has(id)) return;

      const nameEl = document.createElement('span');
      nameEl.className = 'timer-name';
      nameEl.dataset.timerId = id;
      nameEl.textContent = originalName;
      nameEl.title = "Click to edit timer name";
      nameEl.addEventListener('click', () => this.startEditingName(id));

      const input = document.querySelector(`.timer-name-input[data-timer-id="${id}"]`);
      if (input) {
        input.replaceWith(nameEl);
      }

      activeEditors.delete(id);
    },

    /**
     * Update play/pause button based on timer state
     * @param {Object} timer - Timer object
     */
    updatePlayPauseButton(timer) {
      if (!timer?.id) return;

      const startBtn = document.querySelector(`.start-btn[data-timer-id="${timer.id}"]`);
      const pauseBtn = document.querySelector(`.pause-btn[data-timer-id="${timer.id}"]`);
      const resetBtn = document.querySelector(`.reset-btn[data-timer-id="${timer.id}"]`);
      
      if (!startBtn || !pauseBtn || !resetBtn) return;

      const isRunning = timer.isRunning || timer.status === 'running';
      const isPaused = timer.isPaused || timer.status === 'paused';
      const isCompleted = timer.isComplete || timer.status === 'completed';
      
      // Update time display if available
      const timeDisplay = timeDisplays.get(timer.id);
      if (timeDisplay) {
        timeDisplay.innerHTML = formatTimeMMSS(timer.remaining || timer.duration || 0);
      }
      
      // Handle button visibility based on timer state
      if (isRunning) {
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-block';
        resetBtn.style.display = 'inline-block';
      } else if (isPaused || isCompleted) {
        startBtn.style.display = 'inline-block';
        pauseBtn.style.display = 'none';
        resetBtn.style.display = 'inline-block';
      } else {
        // Initial state
        startBtn.style.display = 'inline-block';
        pauseBtn.style.display = 'none';
        resetBtn.style.display = 'none';
      }
    },

    /**
     * Clean up timer resources
     * @param {string} id - Timer ID
     */
    cleanupTimer(id) {
      if (activeEditors.has(id)) {
        activeEditors.delete(id);
      }
    },
    
    /**
     * Setup event listeners for timer controls
     * @param {HTMLElement} controlsElement - The controls container element
     */
    setupControlEvents(controlsElement) {
      if (!controlsElement) return;
      
      try {
        const timerId = controlsElement.dataset.timerId;
        if (!timerId) {
          console.error('Cannot set up control events: missing timer ID');
          return;
        }
        
        // Get all control buttons
        const buttons = controlsElement.querySelectorAll('.timer-button');
        
        // Add event listeners to each button
        buttons.forEach(button => {
          const action = button.dataset.action;
          if (!action) return;
          
          button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Ensure the event doesn't bubble up
            
            console.log(`Button clicked: ${action} for timer ${timerId}`);
            
            switch (action) {
              case 'start':
                eventBus.publish('timer:request:start', { id: timerId });
                break;
              case 'pause':
                eventBus.publish('timer:request:pause', { id: timerId });
                break;
              case 'reset':
                eventBus.publish('timer:request:reset', { id: timerId });
                break;
              case 'delete':
                console.log(`Deleting timer ${timerId}`);
                eventBus.publish('timer:request:remove', { id: timerId });
                break;
            }
          });
        });
        
        console.log(`Set up control events for timer ${timerId}`);
      } catch (error) {
        console.error('Error setting up control events:', error);
      }
    }
  };
}

export default createTimerControls;