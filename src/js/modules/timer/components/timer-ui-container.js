/**
 * Timer UI Container Component
 * Manages the container and layout for timers
 */

/**
 * Create timer container module
 * @returns {Object} Timer container interface
 */
export function createTimerContainer() {
  return {
    containerSelector: '#timer-container, .multi-timer-container',
    container: null,
    containerInitialized: false,

    /**
     * Initialize the container
     */
    init() {
      // If already initialized, return success
      if (this.containerInitialized && this.container && document.body.contains(this.container)) {
        console.log('Timer container already initialized');
        return true;
      }
      
      // Try to initialize (with fallback attempt if failed)
      const initialized = this.setupContainer();
      if (!initialized) {
        console.warn('Initial timer container setup failed, trying again...');
        // Try again after a short delay to ensure DOM is ready
        setTimeout(() => this.setupContainer(), 500);
      }
      
      // Listen for DOM changes that might affect the container
      this.setupMutationObserver();
      
      // Handle window resize events for responsive layout
      window.addEventListener('resize', () => this.handleWindowResize());
      
      return initialized;
    },

    /**
     * Set up the timer container
     * @returns {boolean} Success status
     */
    setupContainer() {
      try {
        // First try to find existing container
        this.container = document.querySelector(this.containerSelector);
        
        // If no container exists, create one
        if (!this.container) {
          console.log('Creating timer container element');
          
          // Create the container
          this.container = document.createElement('div');
          this.container.id = 'timer-container';
          this.container.className = 'multi-timer-container';
          
          // Find where to insert the timer container
          this.addContainerToDOM();
        } else {
          console.log('Found existing timer container:', this.container);
        }
        
        // Verify container actually exists in the DOM
        if (!document.body.contains(this.container)) {
          console.error('Container exists in memory but not in DOM, reattaching');
          this.addContainerToDOM();
        }
        
        // Make sure container is visible
        this.container.style.display = 'block';
        
        // Mark as initialized
        this.containerInitialized = true;
        
        // Return success - container is now guaranteed to exist
        return true;
      } catch (error) {
        console.error('Error setting up timer container:', error);
        
        // Last resort fallback - create and attach to body
        try {
          this.container = document.createElement('div');
          this.container.id = 'timer-container';
          this.container.className = 'multi-timer-container';
          
          document.body.appendChild(this.container);
          console.log('Created fallback container after error');
          
          this.containerInitialized = true;
          return true;
        } catch (fallbackError) {
          console.error('Critical failure creating container:', fallbackError);
          this.containerInitialized = false;
          return false;
        }
      }
    },
    
    /**
     * Add the container to the DOM in the most appropriate location
     */
    addContainerToDOM() {
      try {
        // First try to find the cooking mode step container (preferred location)
        const stepContainer = document.querySelector('.step-container');
        const stepNavigation = document.querySelector('.step-navigation');
        
        if (stepContainer && stepNavigation) {
          // Insert before the navigation buttons
          stepContainer.insertBefore(this.container, stepNavigation);
          console.log('Added timer container before step navigation');
          return true;
        }
        
        // Fallback locations in order of preference
        const mainContent = document.querySelector('.step-content') || 
                          document.querySelector('.recipe-steps') || 
                          document.querySelector('.steps-container') ||
                          document.querySelector('main') ||
                          document.body;
        
        if (mainContent) {
          // Try to find a good position within the content
          const existingTimers = mainContent.querySelector('.multi-timer-container');
          if (existingTimers) {
            console.log('Found existing timer container, replacing it');
            existingTimers.replaceWith(this.container);
          } else {
            mainContent.appendChild(this.container);
            console.log('Added timer container to main content');
          }
        } else {
          // Last resort - add to body
          document.body.appendChild(this.container);
          console.log('Added timer container directly to body');
        }
        
        return true;
      } catch (error) {
        console.error('Error adding container to DOM:', error);
        
        // Ultimate fallback - append to body
        try {
          document.body.appendChild(this.container);
          return true;
        } catch (finalError) {
          console.error('Critical failure adding container to DOM:', finalError);
          return false;
        }
      }
    },
    
    /**
     * Setup mutation observer to detect if container is removed
     */
    setupMutationObserver() {
      try {
        // Create an observer to watch for DOM changes that might affect our container
        const observer = new MutationObserver((mutations) => {
          // Check if our container is still in the DOM
          if (this.container && !document.body.contains(this.container)) {
            console.warn('Timer container was removed from DOM, reattaching');
            this.addContainerToDOM();
          }
        });
        
        // Observe the document body for changes to child nodes
        observer.observe(document.body, { childList: true, subtree: true });
        
        console.log('Set up mutation observer for timer container');
      } catch (error) {
        console.error('Error setting up mutation observer:', error);
      }
    },

    /**
     * Get the container element
     * @returns {HTMLElement} Container element
     */
    getContainer() {
      // If container doesn't exist or isn't in the DOM, try to set it up
      if (!this.container || !document.body.contains(this.container)) {
        this.setupContainer();
      }
      return this.container;
    },

    /**
     * Clear all timer elements from the container
     */
    clearContainer() {
      if (this.container) {
        // Clear the container completely
        this.container.innerHTML = '';
      }
    },

    /**
     * Handle window resize for responsive layout
     */
    handleWindowResize() {
      if (!this.container) return;

      const timerElements = this.container.querySelectorAll('.timer');
      timerElements.forEach(timer => {
        const controlsContainer = timer.querySelector('.timer-controls');
        if (controlsContainer) {
          if (window.innerWidth < 600) {
            // Stack controls for small screens
            controlsContainer.style.flexDirection = 'column';
            controlsContainer.style.gap = '10px';
          } else {
            // Side-by-side for larger screens
            controlsContainer.style.flexDirection = 'row';
            controlsContainer.style.gap = '0';
          }
        }
      });
    }
  };
}

export default createTimerContainer;