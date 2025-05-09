/**
 * Timer Core
 * Core timer functionality implementation
 */

import { generateId, formatTime, getFromStorage, setToStorage } from '../utils/common.js';
import { Timer } from './timer.js';
import { extractDuration, createTimerLabel } from './utils/timer-utils.js';

// Storage key for persisting timers
const TIMERS_STORAGE_KEY = 'recipe-viewer-timers';

// Timer status enum
const TimerStatus = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed'
};

// Make sure we have a console.log to help with debugging
console.log("timer-core.js loaded");

/**
 * Create a timer core module
 * @param {Object} eventBus - Event bus for communication
 * @returns {Object} - Timer core module
 */
export function createTimerCore(eventBus) {
  return {
    eventBus: eventBus,
    timers: {},
    timerIntervals: {},
    
    /**
     * Initialize the timer core
     */
    init() {
      try {
        console.log('Initializing timer core...');
        
        // Initialize internal state
        this.timers = {};
        this.timerIntervals = {};
        
        // Load any saved timers
        this.loadTimers();
        
        // Set up request event handlers
        this.setupEventHandlers();
        
        console.log('Timer core initialized successfully');
        
        // Publish initialization event
        this.eventBus.publish('timer:initialized', null);
        
        return true;
      } catch (error) {
        console.error('Error initializing timer core:', error);
        return false;
      }
    },
    
    /**
     * Set up event handlers
     */
    setupEventHandlers() {
      // Timer operation requests
      this.eventBus.subscribe('timer:request:create', this.handleCreateRequest.bind(this));
      this.eventBus.subscribe('timer:request:start', this.handleStartRequest.bind(this));
      this.eventBus.subscribe('timer:request:pause', this.handlePauseRequest.bind(this));
      this.eventBus.subscribe('timer:request:reset', this.handleResetRequest.bind(this));
      this.eventBus.subscribe('timer:request:remove', this.handleRemoveRequest.bind(this));
      this.eventBus.subscribe('timer:request:get', this.handleGetRequest.bind(this));
      this.eventBus.subscribe('timer:request:getAll', this.handleGetAllRequest.bind(this));
      this.eventBus.subscribe('timer:request:list:all', this.handleListAllRequest.bind(this));
      this.eventBus.subscribe('timer:request:clear', this.handleClearAllRequest.bind(this));
      this.eventBus.subscribe('timer:request:rename', this.handleRenameRequest.bind(this));
      this.eventBus.subscribe('timer:request:addMetadata', this.handleAddMetadataRequest.bind(this));
      this.eventBus.subscribe('timer:request:highlightStep', this.handleHighlightStepRequest.bind(this));
      
      // Add handlers for batch timer operations
      this.eventBus.subscribe('timer:request:start:all', this.handleStartAllRequest.bind(this));
      this.eventBus.subscribe('timer:request:pause:all', this.handlePauseAllRequest.bind(this));
      this.eventBus.subscribe('timer:request:reset:all', this.handleResetAllRequest.bind(this));
      
      // Add handlers for name-based timer operations
      this.eventBus.subscribe('timer:request:start:byName', this.handleStartByNameRequest.bind(this));
      this.eventBus.subscribe('timer:request:pause:byName', this.handlePauseByNameRequest.bind(this));
      this.eventBus.subscribe('timer:request:reset:byName', this.handleResetByNameRequest.bind(this));
      this.eventBus.subscribe('timer:request:remove:byName', this.handleRemoveByNameRequest.bind(this));
      
      console.log('Timer core event handlers set up');
    },
    
    /**
     * Handle timer create request
     */
    handleCreateRequest(data) {
      const timerId = this.createTimer(data);
      this.eventBus.publish('timer:created:response', { id: timerId });
      this.persistTimers();
    },
    
    /**
     * Handle timer start request
     */
    handleStartRequest(data) {
      if (data && data.id) {
        const success = this.startTimer(data.id);
        this.eventBus.publish('timer:start:response', { id: data.id, success });
      }
    },
    
    /**
     * Handle timer pause request
     */
    handlePauseRequest(data) {
      if (data && data.id) {
        const success = this.pauseTimer(data.id);
        this.eventBus.publish('timer:pause:response', { id: data.id, success });
      }
    },
    
    /**
     * Handle timer reset request
     */
    handleResetRequest(data) {
      if (data && data.id) {
        const success = this.resetTimer(data.id);
        this.eventBus.publish('timer:reset:response', { id: data.id, success });
      }
    },
    
    /**
     * Handle timer remove request
     */
    handleRemoveRequest(data) {
      console.log('Received timer:request:remove event with data:', data);
      if (data && data.id) {
        console.log(`Attempting to remove timer with ID: ${data.id}`);
        const success = this.removeTimer(data.id);
        console.log(`Timer removal ${success ? 'successful' : 'failed'} for ID: ${data.id}`);
        this.eventBus.publish('timer:remove:response', { id: data.id, success });
      } else {
        console.error('Invalid timer remove request - missing timer ID:', data);
      }
    },
    
    /**
     * Handle get timer request
     */
    handleGetRequest(data) {
      if (data && data.id) {
        const timer = this.timers[data.id];
        this.eventBus.publish('timer:get:response', { timer });
        
        // Also call callback if provided
        if (data.callback && typeof data.callback === 'function') {
          data.callback(timer);
        }
      }
    },
    
    /**
     * Handle get all timers request
     */
    handleGetAllRequest() {
      const timers = Object.values(this.timers);
      this.eventBus.publish('timers:loaded', { timers });
    },
    
    /**
     * Handle list all timers request with callback
     */
    handleListAllRequest(data) {
      console.log('Handling request to list all timers with callback');
      const timers = Object.values(this.timers).map(timer => ({
        id: timer.id,
        name: timer.name,
        status: timer.status,
        remaining: timer.remaining,
        isRunning: timer.isRunning
      }));
      
      // Call the provided callback if any
      if (data && typeof data.callback === 'function') {
        console.log(`Calling callback with ${timers.length} timers`);
        data.callback(timers);
      }
      
      return timers;
    },
    
    /**
     * Handle clear all timers request
     */
    handleClearAllRequest() {
      try {
        // Get all timer IDs
        const timerIds = Object.keys(this.timers);
        
        // Remove each timer
        timerIds.forEach(id => {
          try {
            this.removeTimer(id);
          } catch (err) {
            console.error(`Error removing timer ${id} during clear all:`, err);
          }
        });
        
        // Make sure timers object is empty
        this.timers = {};
        
        // Make sure intervals are cleared
        Object.keys(this.timerIntervals).forEach(id => {
          if (this.timerIntervals[id]) {
            clearInterval(this.timerIntervals[id]);
            delete this.timerIntervals[id];
          }
        });
        
        // Force clear storage
        this.persistTimers();
        
        // Publish event
        this.eventBus.publish('timers:cleared', null);
      } catch (error) {
        console.error('Error clearing timers:', error);
        
        // Emergency cleanup - reset everything
        this.timers = {};
        this.timerIntervals = {};
        this.persistTimers();
      }
    },
    
    /**
     * Handle rename request
     * @param {Object} data - Request data
     */
    handleRenameRequest(data) {
      try {
        const { id, name } = data;
        const timer = this.timers[id];
        
        if (!timer) {
          console.error(`Timer not found: ${id}`);
          return;
        }
        
        // Rename the timer
        timer.rename(name);
        
        // Persist timers to storage
        this.persistTimers();
        
        // Publish event
        this.eventBus.publish('timer:renamed', { id, name });
      } catch (error) {
        console.error(`Error renaming timer ${data.id}:`, error);
      }
    },
    
    /**
     * Handle add metadata request
     * @param {Object} data - Request data
     */
    handleAddMetadataRequest(data) {
      try {
        const { id, metadata } = data;
        const timer = this.timers[id];
        
        if (!timer) {
          console.error(`Timer not found: ${id}`);
          return;
          }
          
        // Add metadata to the timer
        timer.addMetadata(metadata);
          
        // Persist timers to storage
          this.persistTimers();
        
        // Publish event
        this.eventBus.publish('timer:metadata:added', { id, metadata });
      } catch (error) {
        console.error(`Error adding metadata to timer ${data.id}:`, error);
      }
    },
    
    /**
     * Handle highlight step request
     * @param {Object} data - Request data
     */
    handleHighlightStepRequest(data) {
      try {
        const { stepId } = data;
        
        // Find timers associated with the step
        const stepTimers = Object.values(this.timers).filter(timer => {
          const metadata = timer.getMetadata();
          return metadata && metadata.stepId === stepId;
        });
        
        // Publish event
        this.eventBus.publish('timer:highlight:step', { stepId, timers: stepTimers });
      } catch (error) {
        console.error(`Error highlighting step ${data.stepId}:`, error);
      }
    },
    
    /**
     * Update a timer (called on each tick)
     * @param {string} id - Timer ID
     */
    updateTimer(id) {
      try {
        const timer = this.timers[id];
        if (!timer) {
          console.error(`Timer not found: ${id}`);
          return;
        }
        
        // Get timer properties
        const status = timer.getStatus();
        const remainingTime = timer.getRemainingTime();
        
        // Only emit tick events if timer is running
        if (status === 'running') {
          // Publish timer tick event with full timer object for UI updates
          this.eventBus.publish('timer:tick', { timer });
        }
        
        // Check if timer is complete
        if (remainingTime <= 0 && status === 'running') {
          this.completeTimer(id);
        }
      } catch (error) {
        console.error(`Error updating timer ${id}:`, error);
      }
    },
    
    /**
     * Complete a timer
     * @param {string} id - Timer ID
     */
    completeTimer(id) {
      try {
        const timer = this.timers[id];
        if (!timer) {
          console.error(`Timer not found: ${id}`);
          return;
        }
        
        // Complete the timer
        timer.complete();
        
        // Show notification
        this.showTimerNotification(timer);
        
        // Publish completion event
        this.eventBus.publish('timer:completed', { timer });
        
        // Persist timers to storage
        this.persistTimers();
      } catch (error) {
        console.error(`Error completing timer ${id}:`, error);
      }
    },
    
    /**
     * Create a new timer
     * @param {Object} timerData - Timer data
     * @returns {string} - Timer ID
     */
    createTimer(timerData) {
      try {
        // Generate a unique ID
        const id = 'timer_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        
        console.log('Creating timer with data:', timerData);
        
        // Create a new Timer instance
        const timer = new Timer({
          id: id,
          name: timerData.name || 'Timer',
          duration: timerData.duration || 60,
          onComplete: () => {
            this.completeTimer(id);
          },
          metadata: timerData.metadata || {}
        });
        
        // Store the timer
        this.timers[id] = timer;
        
        console.log(`Created timer: ${id}, name: ${timer.name}, duration: ${timer.duration}s`);
        
        // Persist timers to storage
        this.persistTimers();
        
        // Publish event
        this.eventBus.publish('timer:created', { timer: timer });
        
        // Auto-start if specified
        if (timerData.autoStart) {
          console.log(`Auto-starting timer: ${id}`);
          setTimeout(() => {
            this.startTimer(id);
          }, 100); // Small delay to ensure UI is ready
        }
        
        return id;
      } catch (error) {
        console.error('Error creating timer:', error);
        return null;
      }
    },
    
    /**
     * Start a timer
     * @param {string} id - Timer ID
     * @returns {boolean} - Success status
     */
    startTimer(id) {
      try {
        console.log(`startTimer called for ${id}`);
        const timer = this.timers[id];
        if (!timer) {
          console.error(`Timer not found: ${id}`);
          return false;
        }
        
        console.log(`Starting timer: ${timer.name} (${id})`);
        
        // Start the timer
        timer.start();
        
        // Set up interval for tick events
        if (!this.timerIntervals[id]) {
          console.log(`Setting up interval for timer ${id}`);
          this.timerIntervals[id] = setInterval(() => {
            this.updateTimer(id);
          }, 1000);
        }
        
        // Publish event with timer data (not just ID)
        this.eventBus.publish('timer:started', { timer });
        console.log(`Published timer:started event for ${id}`);
        
        return true;
      } catch (error) {
        console.error(`Error starting timer ${id}:`, error);
        return false;
      }
    },
    
    /**
     * Pause a timer
     * @param {string} id - Timer ID
     * @returns {boolean} - Success status
     */
    pauseTimer(id) {
      try {
        const timer = this.timers[id];
        if (!timer) {
          console.error(`Timer not found: ${id}`);
          return false;
        }
        
        // Pause the timer
        timer.pause();
        
        // Publish event
        this.eventBus.publish('timer:paused', { id });
        
        return true;
      } catch (error) {
        console.error(`Error pausing timer ${id}:`, error);
        return false;
      }
    },
    
    /**
     * Reset a timer
     * @param {string} id - Timer ID
     * @returns {boolean} - Success status
     */
    resetTimer(id) {
      try {
        const timer = this.timers[id];
        if (!timer) {
          console.error(`Timer not found: ${id}`);
          return false;
        }
        
        // Reset the timer
        timer.reset();
        
        // Publish event with the full timer object for immediate UI update
        this.eventBus.publish('timer:reset', { id, timer });
        
        return true;
      } catch (error) {
        console.error(`Error resetting timer ${id}:`, error);
        return false;
      }
    },
    
    /**
     * Stop a timer
     * @param {string} id - Timer ID
     * @returns {boolean} - Success status
     */
    stopTimer(id) {
      try {
        const timer = this.timers[id];
        if (!timer) {
          console.error(`Timer not found: ${id}`);
          return false;
        }
        
        // Pause the timer
        timer.pause();
        
        // Publish event
        this.eventBus.publish('timer:stopped', { id });
        
        return true;
      } catch (error) {
        console.error(`Error stopping timer ${id}:`, error);
        return false;
      }
    },
    
    /**
     * Remove a timer
     * @param {string} id - Timer ID
     * @returns {boolean} - Success status
     */
    removeTimer(id) {
      try {
        console.log(`removeTimer called for ${id}`);
        const timer = this.timers[id];
        if (!timer) {
          console.error(`Timer not found: ${id}`);
          return false;
        }
        
        console.log(`Found timer to remove: ${timer.name} (${id})`);
        
        // Clean up the timer
        timer.cleanup();
        
        // Remove from timers
        delete this.timers[id];
        console.log(`Deleted timer ${id} from timers collection`);
        
        // Remove from intervals
        if (this.timerIntervals[id]) {
          console.log(`Clearing interval for timer ${id}`);
          clearInterval(this.timerIntervals[id]);
          delete this.timerIntervals[id];
        }
        
        // Persist timers to storage
        this.persistTimers();
        
        // Publish event
        console.log(`Publishing timer:removed event for ${id}`);
        this.eventBus.publish('timer:removed', { id });
        
        return true;
      } catch (error) {
        console.error(`Error removing timer ${id}:`, error);
        return false;
      }
    },
    
    /**
     * Get all timers
     * @returns {Array} - Array of timer objects
     */
    getAllTimers() {
      return Object.values(this.timers);
    },
    
    /**
     * Get a timer
     * @param {string} id - Timer ID
     * @returns {Object|null} - Timer object
     */
    getTimer(id) {
      return this.timers[id] || null;
    },
    
    /**
     * Show a notification for a timer
     * @param {Object} timer - Timer object
     */
    showTimerNotification(timer) {
      try {
        // Get timer data
        const name = timer.name;
        const id = timer.id;
        
        // Check if notifications are supported
        if ('Notification' in window) {
          // Request permission if needed
          if (Notification.permission === 'granted') {
            // Create notification
            const notification = new Notification('Timer Complete', {
              body: `Timer "${name}" has completed!`,
              icon: '/assets/images/favicon.ico'
            });
        
            // Add click handler
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          } else if (Notification.permission !== 'denied') {
            // Request permission
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                this.showTimerNotification(timer);
              }
            });
          }
        }
        
        // Delegate sound playing to the timer UI notifications component via event
        // This prevents duplicated sound code and potential errors
        this.eventBus.publish('timer:notify:complete', { 
          id, name, 
          playSound: true 
        });
        
      } catch (error) {
        console.error('Error showing timer notification:', error);
      }
    },
    
    /**
     * Load timers from storage
     */
    loadTimers() {
      try {
        // Get timers from storage
        const storedTimers = getFromStorage(TIMERS_STORAGE_KEY, []);
        
        // Create Timer instances from stored data
        storedTimers.forEach(timerData => {
          const timer = new Timer({
            id: timerData.id,
            name: timerData.name,
            duration: timerData.duration,
            onComplete: () => {
              this.completeTimer(timerData.id);
            },
            metadata: timerData.metadata || {}
          });
          
          // Set remaining time and status
          timer.remaining = timerData.remainingTime || timerData.duration;
          timer.status = timerData.status || 'idle';
          timer.completion = timerData.completion || 0;
          
          // Store the timer
          this.timers[timerData.id] = timer;
        });
        
        console.log(`Loaded ${Object.keys(this.timers).length} timers from storage`);
      } catch (error) {
        console.error('Error loading timers from storage:', error);
      }
    },
    
    /**
     * Save timers to storage
     */
    saveTimersToStorage() {
      try {
        // Convert timers to serializable format
        const timersToStore = Object.values(this.timers).map(timer => ({
          id: timer.id,
          name: timer.name,
          duration: timer.duration,
          remainingTime: timer.getRemainingTime(),
          status: timer.getStatus(),
          completion: timer.getCompletion(),
          metadata: timer.getMetadata()
        }));
        
        // Save to storage
        setToStorage(TIMERS_STORAGE_KEY, timersToStore);
        
        console.log(`Saved ${timersToStore.length} timers to storage`);
      } catch (error) {
        console.error('Error saving timers to storage:', error);
      }
    },
    
    /**
     * Persist timers to storage
     */
    persistTimers() {
        // Clear timers from storage if no active timers
        if (Object.keys(this.timers).length === 0) {
            setToStorage(TIMERS_STORAGE_KEY, []);
            console.log('Cleared all timers from storage');
        } else {
            this.saveTimersToStorage();
        }
    },

    /**
     * Handle start all timers request
     */
    handleStartAllRequest() {
      try {
        console.log("handleStartAllRequest called - starting all timers");
        const timerIds = Object.keys(this.timers);
        console.log(`Found ${timerIds.length} timers to potentially start:`, timerIds);
        
        let startedCount = 0;
        
        timerIds.forEach(id => {
          // Only start timers that aren't already running
          const timer = this.timers[id];
          if (timer) {
            console.log(`Checking timer ${id}:`, { 
              isRunning: timer._isRunning, 
              status: timer.status, 
              name: timer.name 
            });
            
            if (!timer._isRunning && timer.status !== 'completed') {
              console.log(`Starting timer ${id}: ${timer.name}`);
              this.startTimer(id);
              startedCount++;
            } else {
              console.log(`Skipping timer ${id} because it's already running or completed`);
            }
          }
        });
        
        console.log(`Started ${startedCount} timers`);
        this.eventBus.publish('timer:start:all:response', { count: startedCount });
      } catch (error) {
        console.error('Error starting all timers:', error);
      }
    },

    /**
     * Handle pause all timers request
     */
    handlePauseAllRequest() {
      try {
        const timerIds = Object.keys(this.timers);
        let pausedCount = 0;
        
        timerIds.forEach(id => {
          const timer = this.timers[id];
          if (timer && timer._isRunning) {
            this.pauseTimer(id);
            pausedCount++;
          }
        });
        
        console.log(`Paused ${pausedCount} timers`);
        this.eventBus.publish('timer:pause:all:response', { count: pausedCount });
      } catch (error) {
        console.error('Error pausing all timers:', error);
      }
    },

    /**
     * Handle reset all timers request
     */
    handleResetAllRequest() {
      try {
        const timerIds = Object.keys(this.timers);
        let resetCount = 0;
        
        timerIds.forEach(id => {
          this.resetTimer(id);
          resetCount++;
        });
        
        console.log(`Reset ${resetCount} timers`);
        this.eventBus.publish('timer:reset:all:response', { count: resetCount });
      } catch (error) {
        console.error('Error resetting all timers:', error);
      }
    },

    /**
     * Clear all timers
     */
    clearAllTimers() {
      try {
        Object.keys(this.timers).forEach(id => {
          this.removeTimer(id);
        });
        this.persistTimers();
        return true;
      } catch (error) {
        console.error('Error clearing all timers:', error);
        return false;
      }
    },
    
    /**
     * Handle start timer by name request
     * @param {Object} data - Request data with timer name
     */
    handleStartByNameRequest(data) {
      console.log('Handling start timer by name request:', data);
      if (!data || !data.name) {
        console.error('Invalid timer start by name request - missing timer name');
        return;
      }
      
      const timerId = this.findTimerIdByName(data.name);
      if (timerId) {
        console.log(`Found timer with name "${data.name}", ID: ${timerId}, starting it`);
        const success = this.startTimer(timerId);
        this.eventBus.publish('timer:start:response', { id: timerId, success });
      } else {
        console.log(`No timer found with name "${data.name}"`);
      }
    },
    
    /**
     * Handle pause timer by name request
     * @param {Object} data - Request data with timer name
     */
    handlePauseByNameRequest(data) {
      console.log('Handling pause timer by name request:', data);
      if (!data || !data.name) {
        console.error('Invalid timer pause by name request - missing timer name');
        return;
      }
      
      const timerId = this.findTimerIdByName(data.name);
      if (timerId) {
        console.log(`Found timer with name "${data.name}", ID: ${timerId}, pausing it`);
        const success = this.pauseTimer(timerId);
        this.eventBus.publish('timer:pause:response', { id: timerId, success });
      } else {
        console.log(`No timer found with name "${data.name}"`);
      }
    },
    
    /**
     * Handle reset timer by name request
     * @param {Object} data - Request data with timer name
     */
    handleResetByNameRequest(data) {
      console.log('Handling reset timer by name request:', data);
      if (!data || !data.name) {
        console.error('Invalid timer reset by name request - missing timer name');
        return;
      }
      
      const timerId = this.findTimerIdByName(data.name);
      if (timerId) {
        console.log(`Found timer with name "${data.name}", ID: ${timerId}, resetting it`);
        const success = this.resetTimer(timerId);
        this.eventBus.publish('timer:reset:response', { id: timerId, success });
      } else {
        console.log(`No timer found with name "${data.name}"`);
      }
    },
    
    /**
     * Handle remove timer by name request
     * @param {Object} data - Request data with timer name
     */
    handleRemoveByNameRequest(data) {
      console.log('Handling remove timer by name request:', data);
      if (!data || !data.name) {
        console.error('Invalid timer remove by name request - missing timer name');
        return;
      }
      
      const timerId = this.findTimerIdByName(data.name);
      if (timerId) {
        console.log(`Found timer with name "${data.name}", ID: ${timerId}, removing it`);
        const success = this.removeTimer(timerId);
        this.eventBus.publish('timer:remove:response', { id: timerId, success });
      } else {
        console.log(`No timer found with name "${data.name}"`);
      }
    },
    
    /**
     * Find a timer ID by name
     * @param {string} name - Name of the timer to find
     * @returns {string|null} - Timer ID if found, null otherwise
     */
    findTimerIdByName(name) {
      console.log(`Searching for timer with name: "${name}"`);
      // Normalize name for case-insensitive comparison
      const normalizedName = name.toLowerCase().trim();
      
      // Log all available timers for debugging
      console.log('Available timers:', Object.entries(this.timers).map(([id, timer]) => ({
        id,
        name: timer.name,
        status: timer.status
      })));
      
      // First try exact match
      for (const [id, timer] of Object.entries(this.timers)) {
        if (timer.name.toLowerCase() === normalizedName) {
          console.log(`Found exact match for timer: ${timer.name}`);
          return id;
        }
      }
      
      // Then try with "timer" suffix if not already present
      const nameWithSuffix = normalizedName.endsWith(' timer') ? normalizedName : normalizedName + ' timer';
      for (const [id, timer] of Object.entries(this.timers)) {
        if (timer.name.toLowerCase() === nameWithSuffix) {
          console.log(`Found match with "timer" suffix: ${timer.name}`);
          return id;
        }
      }
      
      // Try word-by-word matching (e.g., searching for "heat" should match "Heat olive oil timer")
      const words = normalizedName.split(/\s+/);
      for (const word of words) {
        if (word.length < 3) continue; // Skip very short words
        
        console.log(`Trying to match with keyword: "${word}"`);
        for (const [id, timer] of Object.entries(this.timers)) {
          const timerNameLower = timer.name.toLowerCase();
          
          // Check if the timer name contains this specific word
          if (timerNameLower.includes(word)) {
            console.log(`Found match with keyword "${word}" for timer: ${timer.name}`);
            return id;
          }
        }
      }
      
      // If no exact match, try partial/flexible matching (least strict)
      for (const [id, timer] of Object.entries(this.timers)) {
        const timerNameLower = timer.name.toLowerCase();
        
        // Check if timer name contains the requested name or vice versa
        if (timerNameLower.includes(normalizedName) || normalizedName.includes(timerNameLower)) {
          console.log(`Found partial match for timer: ${timer.name}`);
          return id;
        }
      }
      
      console.log(`No timer found with name similar to "${name}"`);
      return null;
    }
  };
}

export default createTimerCore; 