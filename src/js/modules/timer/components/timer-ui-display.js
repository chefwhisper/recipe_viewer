/**
 * Timer UI Display Component
 * Handles timer display and rendering
 */

import { formatTime } from '../../utils/common.js';

/**
 * Create timer display module
 * @returns {Object} Timer display interface
 */
export function createTimerDisplay() {
  return {
    /**
     * Create timer display element
     * @param {Object} timer - Timer object
     * @returns {HTMLElement} Display container
     */
    createDisplay(timer) {
      if (!timer || !timer.id) {
        throw new Error('Invalid timer object provided to createDisplay');
      }

      const display = document.createElement('div');
      display.className = 'timer-display';
      display.dataset.timerId = timer.id;

      // Create progress container
      const progressContainer = document.createElement('div');
      progressContainer.className = 'progress-container';

      // Create progress bar
      const progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      progressBar.dataset.timerId = timer.id;
      progressBar.style.width = `${this.calculateProgressPercentage(timer)}%`;

      // Assemble display with just the progress bar
      progressContainer.appendChild(progressBar);
      display.appendChild(progressContainer);

      return display;
    },

    /**
     * Create step indicator
     * @param {Object} timer - Timer object
     * @returns {HTMLElement|null} Step indicator element or null if no step info
     */
    createStepIndicator(timer) {
      // Get step metadata
      const stepIndex = timer.metadata?.stepIndex !== undefined ? 
                        timer.metadata.stepIndex : 
                        (timer.metadata?.stepId !== undefined ? timer.metadata.stepId : null);
      
      if (stepIndex === null) return null;
      
      // Create step indicator
      const stepIndicator = document.createElement('div');
      stepIndicator.className = 'timer-step-indicator';
      stepIndicator.dataset.timerId = timer.id;
      stepIndicator.dataset.stepId = stepIndex.toString();
      
      // Check if this is the current step
      const currentStepId = document.body.dataset.currentStepId;
      const isCurrentStep = currentStepId && stepIndex.toString() === currentStepId;
      
      // Use phase-specific step number if available
      const phaseStepNumber = timer.metadata?.phaseStepNumber;
      const displayStepNumber = phaseStepNumber || (stepIndex !== null ? stepIndex + 1 : null);
      
      // Only add the current class and dot if this is the current step
      if (isCurrentStep) {
        stepIndicator.classList.add('current');
        stepIndicator.innerHTML = displayStepNumber !== null ? 
          `Step ${displayStepNumber} <span class="current-dot">•</span>` : 
          `Current <span class="current-dot">•</span>`;
      } else {
        // For non-current steps, never add the dot
        stepIndicator.textContent = displayStepNumber !== null ? 
          `Step ${displayStepNumber}` : 
          (timer.metadata?.stepTitle || "Timer");
      }
      
      // Add appropriate step classes
      const timerElement = document.querySelector(`.timer[data-timer-id="${timer.id}"]`);
      if (timerElement && currentStepId && stepIndex !== null) {
        if (parseInt(stepIndex) < parseInt(currentStepId)) {
          timerElement.classList.add('timer-previous-step');
          timerElement.classList.remove('timer-future-step', 'timer-current-step');
        } else if (parseInt(stepIndex) > parseInt(currentStepId)) {
          timerElement.classList.add('timer-future-step');
          timerElement.classList.remove('timer-previous-step', 'timer-current-step');
        } else {
          timerElement.classList.add('timer-current-step');
          timerElement.classList.remove('timer-previous-step', 'timer-future-step');
        }
      }

      return stepIndicator;
    },

    /**
     * Update timer display
     * @param {Object} timer - Timer object
     * @param {Object} elements - Timer elements references
     */
    updateDisplay(timer, elements) {
      if (!timer || !elements?.el) {
        console.warn('Invalid timer or elements provided to updateDisplay');
        return;
      }

      try {
        // Update time display - only inline display now
        if (elements.inlineDisplay) {
          // Use formatted time if available or fall back to formatTime
          const formattedTime = timer.getFormattedTime ? 
            timer.getFormattedTime() : 
            formatTime(timer.remainingTime);
            
          elements.inlineDisplay.textContent = formattedTime;
        }

        // Update progress bar
        if (elements.progress) {
          const percentage = this.calculateProgressPercentage(timer);
          elements.progress.style.width = `${percentage}%`;
        }

        // Update state classes
        elements.el.classList.remove('running', 'paused', 'complete');
        if (timer.isComplete || timer.status === 'completed') {
          elements.el.classList.add('complete');
        } else if (timer.isRunning || timer.status === 'running') {
          elements.el.classList.add('running');
        } else if (timer.isPaused || timer.status === 'paused') {
          elements.el.classList.add('paused');
        }

        // Update step indicator
        this.updateStepIndicator(timer, elements.el);
      } catch (error) {
        console.error('Error updating timer display:', error);
      }
    },

    /**
     * Update step indicator
     * @param {Object} timer - Timer object
     * @param {HTMLElement} timerElement - Timer element
     */
    updateStepIndicator(timer, timerElement) {
      if (!timerElement) return;

      // Get step index (support both stepIndex and stepId for backward compatibility)
      const stepIndex = timer.metadata?.stepIndex !== undefined ? 
                        timer.metadata.stepIndex : 
                        (timer.metadata?.stepId !== undefined ? timer.metadata.stepId : null);

      if (stepIndex === null) return;

      let stepIndicator = timerElement.querySelector('.timer-step-indicator');
      
      // Create step indicator if it doesn't exist
      if (!stepIndicator) {
        stepIndicator = this.createStepIndicator(timer);
        if (stepIndicator) {
          const display = timerElement.querySelector('.timer-display');
          if (display) {
            display.appendChild(stepIndicator);
          }
        }
        return;
      }
      
      // Update step indicator
      const currentStepId = document.body.dataset.currentStepId;
      const isCurrentStep = currentStepId && stepIndex.toString() === currentStepId;
      
      // Add or remove the current class based on if this is the current step
      stepIndicator.classList.toggle('current', isCurrentStep);
      
      // Update the phaseStepNumber for display
      const phaseStepNumber = timer.metadata?.phaseStepNumber;
      const displayStepNumber = phaseStepNumber || (stepIndex + 1);
      
      // Only add the dot for current step
      if (isCurrentStep) {
        stepIndicator.innerHTML = `Step ${displayStepNumber} <span class="current-dot">•</span>`;
        timerElement.classList.remove('timer-previous-step', 'timer-future-step');
        timerElement.classList.add('timer-current-step');
      } else {
        // No dot for non-current steps, ever
        stepIndicator.textContent = `Step ${displayStepNumber}`;
        
        // Mark as previous or future step appropriately
        timerElement.classList.remove('timer-current-step');
        if (currentStepId && parseInt(stepIndex) < parseInt(currentStepId)) {
          timerElement.classList.add('timer-previous-step');
          timerElement.classList.remove('timer-future-step');
        } else if (currentStepId && parseInt(stepIndex) > parseInt(currentStepId)) {
          timerElement.classList.add('timer-future-step');
          timerElement.classList.remove('timer-previous-step');
        } else {
          timerElement.classList.remove('timer-previous-step', 'timer-future-step');
        }
      }
    },

    /**
     * Calculate progress percentage
     * @param {Object} timer - Timer object
     * @returns {number} Progress percentage (0-100)
     */
    calculateProgressPercentage(timer) {
      if (!timer?.duration) return 0;
      
      const percentage = 100 - ((timer.remainingTime / timer.duration) * 100);
      return Math.max(0, Math.min(100, percentage));
    }
  };
}

export default createTimerDisplay;