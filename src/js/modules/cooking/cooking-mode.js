/**
 * Cooking Mode Module
 * Handles the interactive cooking experience
 */

import { loadRecipeData } from '../recipe/recipe-data.js';
import { VoiceControl } from '../voice/voice-control.js';
import { formatTime } from '../utils/common.js';
import eventBus from '../../core/events/event-bus.js';
import timerModule from '../timer/index.js';
import * as timerTests from '../timer/test-timer.js';
import '../../../styles/main.css';

/**
 * CookingMode class - implements cooking mode functionality
 */
class CookingMode {
    constructor() {
        // Setup properties
        this.eventBus = eventBus;
        this.recipe = null;
        this.steps = [];
        this.currentStep = 0;
        this.currentPhase = 'preparation';
        this.elements = {};
        this.voiceControl = null;
        this.initialized = false;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.loadRecipe = this.loadRecipe.bind(this);
        this.updateStep = this.updateStep.bind(this);
        this.nextStep = this.nextStep.bind(this);
        this.previousStep = this.previousStep.bind(this);
        this.exitCookingMode = this.exitCookingMode.bind(this);
    }

    /**
     * Initialize the cooking mode module
     * @param {Object} options - Initialization options
     * @returns {Promise<boolean>} - Success status
     */
    async init(options = {}) {
        try {
            // Prevent double initialization
            if (this.initialized) {
                console.log('Cooking mode already initialized, skipping');
                return true;
            }
            
            console.log('Starting cooking mode initialization');
            
            // Get recipe ID
            this.recipeId = new URLSearchParams(window.location.search).get('id');
            
            // Clean up any existing state
            this.cleanupExistingState();
            
            // Initialize elements and events
            this.initializeElements();
            this.bindEvents();
            
            // Try to initialize voice control
            await this.initializeVoiceControl();
            
            // Initialize timer module if not already initialized
            if (timerModule && typeof timerModule.initialize === 'function') {
                try {
                    console.log('Initializing timer module from cooking mode');
                    
                    // Clear any existing timers first
                    try {
                        // Clear directly from localStorage to ensure clean state
                        localStorage.removeItem('recipe-viewer-timers');
                        console.log('Cleared timer storage before initialization');
                    } catch (e) {
                        console.error('Error clearing timer storage:', e);
                    }
                    
                    // Initialize with auto-advance setting from recipe (if available)
                    await timerModule.initialize({
                        enableUi: true,
                        keepExistingTimers: false, // Explicitly don't keep existing timers
                        autoAdvanceOnComplete: !!this.recipe?.settings?.autoAdvanceOnTimer,
                        onTimerComplete: (timerId, timer) => {
                            // Auto-advance step if setting enabled and timer belongs to current step
                            if (this.recipe?.settings?.autoAdvanceOnTimer && 
                                timer?.metadata?.stepId === this.currentStep) {
                                this.nextStep();
                            }
                        }
                    });
                    
                    console.log('Timer module initialized successfully');
                } catch (timerInitError) {
                    console.error('Error initializing timer module:', timerInitError);
                }
            } else {
                console.error('Timer module not available or missing initialize method');
            }
            
            // Initialize variables
            this.currentStep = 0;
            this.currentPhase = 'preparation';
            this.steps = [];
            
            // Load the recipe
            await this.loadRecipe();
            
            // Set current step
            this.updateStep();
            
            this.initialized = true; // Mark as initialized
            console.log('Cooking mode initialized successfully');
            
            // Run timer tests only after successful initialization if in test mode
            if (window.location.search.includes('test-timers=true')) {
                this._runTimerTests();
            }
            
            // Add FontAwesome if needed
            if (!document.querySelector('link[href*="font-awesome"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css';
                document.head.appendChild(link);
                console.log('Added FontAwesome for timer icons');
            }
            
            return true;
        } catch (error) {
            this.showError('Error initializing cooking mode: ' + error.message);
            console.error('Error initializing cooking mode:', error);
            return false;
        }
    }

    isInitialized() {
        return this.initialized;
    }

    /**
     * Clean up existing state before initializing
     */
    cleanupExistingState() {
        console.log('Cleaning up existing state');
        
        // Clear all timers if timer module exists
        if (timerModule) {
            try {
                console.log('Attempting to clear all timers from cooking mode');
                
                // Try multiple cleanup approaches to ensure timers are cleared
                if (typeof timerModule.clearAllTimers === 'function') {
                    timerModule.clearAllTimers();
                }
                
                if (typeof timerModule.clearProcessedSteps === 'function') {
                    timerModule.clearProcessedSteps();
                }
                
                // Use event bus directly as a fallback
                if (this.eventBus) {
                    this.eventBus.publish('timer:request:clear', {});
                    this.eventBus.publish('timers:cleared', null);
                }
                
                // Force additional cleanup to ensure no timers persist
                setTimeout(() => {
                    try {
                        if (typeof timerModule.clearAllTimers === 'function') {
                            timerModule.clearAllTimers();
                        }
                        
                        // Clear localStorage directly as a last resort
                        localStorage.removeItem('recipe-viewer-timers');
                        console.log('Cleared timer storage directly');
                    } catch (e) {
                        console.error('Error in delayed timer cleanup:', e);
                    }
                }, 100);
            } catch (error) {
                console.error('Error clearing timers:', error);
                
                // Emergency cleanup - try to clear localStorage directly
                try {
                    localStorage.removeItem('recipe-viewer-timers');
                    console.log('Emergency timer storage cleanup completed');
                } catch (e) {
                    console.error('Failed emergency timer cleanup:', e);
                }
            }
        }
        
        // Remove any event listeners we've added
        this.unbindEvents();
        
        // Reset any state variables
        this.currentStepIndex = 0;
        this.currentPhase = null;
        this.currentPhaseStepNumber = 0;
        this.lastUsedStepId = null;
        
        this.recipeData = null;
        this.recipeSteps = null;
        this.recipePrepSteps = null;
        this.recipeCookSteps = null;
    }

    initializeElements() {
        this.elements = {
            title: document.getElementById('recipe-title'),
            stepTitle: document.getElementById('step-title'),
            stepNumber: document.getElementById('step-number'),
            currentStep: document.getElementById('current-step'),
            stepDetails: document.getElementById('step-details'),
            prevButton: document.getElementById('prev-step'),
            nextButton: document.getElementById('next-step'),
            readButton: document.getElementById('read-step'),
            exitButton: document.getElementById('exit-cooking'),
            timerContainer: document.getElementById('timer-container'),
            progressBar: document.getElementById('progress-indicator'),
            phaseIndicators: document.querySelectorAll('.phase-indicator'),
            voiceToggle: document.getElementById('toggle-voice'),
            voiceStatus: document.getElementById('voice-status'),
            showCommandsBtn: document.getElementById('show-commands'),
            commandsPanel: document.getElementById('commands-panel')
        };

        // Change the Read Aloud button text to Read Step
        if (this.elements.readButton) {
            this.elements.readButton.textContent = 'Read Step';
        }

        // Create and add the Pause Read button
        if (this.elements.readButton && this.elements.readButton.parentNode) {
            const pauseReadButton = document.createElement('button');
            pauseReadButton.id = 'pause-read';
            pauseReadButton.className = 'nav-button secondary-button';
            pauseReadButton.textContent = 'Pause Read';
            // Insert after the read button
            this.elements.readButton.parentNode.insertBefore(
                pauseReadButton, 
                this.elements.readButton.nextSibling
            );
            // Add to elements for easy access
            this.elements.pauseReadButton = pauseReadButton;
        }

        // Check required elements
        const requiredElements = [
            'title', 'stepTitle', 'stepNumber', 'currentStep', 
            'stepDetails', 'prevButton', 'nextButton', 'readButton', 
            'exitButton', 'timerContainer', 'progressBar'
        ];
        
        requiredElements.forEach(key => {
            if (!this.elements[key]) {
                console.error(`Missing required element: ${key}`);
            }
        });
    }

    bindEvents() {
        this.elements.prevButton.addEventListener('click', () => this.previousStep());
        this.elements.nextButton.addEventListener('click', () => this.nextStep());
        this.elements.readButton.addEventListener('click', () => this.readCurrentStep());
        this.elements.exitButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.exitCookingMode();
        });

        // Add event listener for the Pause Read button
        if (this.elements.pauseReadButton) {
            this.elements.pauseReadButton.addEventListener('click', () => {
                if (this.voiceControl) {
                    this.voiceControl.stopSpeaking();
                }
            });
        }

        // Add event listener for voice toggle button
        if (this.elements.voiceToggle) {
            this.elements.voiceToggle.addEventListener('click', () => {
                if (this.voiceControl) {
                    if (this.voiceControl.isEnabled()) {
                        this.voiceControl.stop();
                        this.updateVoiceControlUI(false);
                    } else {
                        this.voiceControl.start();
                        this.updateVoiceControlUI(true);
                    }
                }
            });
        }

        // Phase indicator clicks
        this.elements.phaseIndicators.forEach(indicator => {
            indicator.addEventListener('click', () => {
                const phase = indicator.dataset.phase;
                this.jumpToPhase(phase);
            });
        });
        
        // Show Voice Commands button
        if (this.elements.showCommandsBtn) {
            this.elements.showCommandsBtn.addEventListener('click', () => {
                this.showAvailableCommands();
            });
        }
    }

    unbindEvents() {
        // Implement event cleanup as needed
        if (this.elements.prevButton) {
            this.elements.prevButton.removeEventListener('click', this.previousStep);
        }
        if (this.elements.nextButton) {
            this.elements.nextButton.removeEventListener('click', this.nextStep);
        }
        if (this.elements.readButton) {
            this.elements.readButton.removeEventListener('click', this.readCurrentStep);
        }
        if (this.elements.exitButton) {
            this.elements.exitButton.removeEventListener('click', this.exitCookingMode);
        }
        if (this.elements.pauseReadButton) {
            this.elements.pauseReadButton.removeEventListener('click', () => {});
        }
        if (this.elements.voiceToggle) {
            this.elements.voiceToggle.removeEventListener('click', () => {});
        }
    }

    async initializeVoiceControl() {
        try {
            this.voiceControl = new VoiceControl();
            
            // Set up voice commands
            this.setupVoiceCommands();
            
            // Initialize UI elements with default state (disabled)
            this.updateVoiceControlUI(false);
            
            console.log('Voice control initialized successfully');
        } catch (error) {
            console.error('Failed to initialize voice control:', error);
            this.voiceControl = null;
            
            if (this.elements.voiceStatus) {
                this.elements.voiceStatus.textContent = 'Voice commands are not available on this browser';
                this.elements.voiceStatus.classList.add('error');
            }
            
            if (this.elements.voiceToggle) {
                this.elements.voiceToggle.disabled = true;
                this.elements.voiceToggle.textContent = 'Voice Commands Not Available';
            }
            
            if (this.elements.showCommandsBtn) {
                this.elements.showCommandsBtn.disabled = true;
            }
        }
    }

    async loadRecipe() {
        try {
            // Log the current URL for debugging
            console.log('Current URL:', window.location.href);
            console.log('URL Path:', window.location.pathname);
            console.log('URL Search:', window.location.search);
            
            // Check for recipe ID in multiple formats:
            // 1. From URL parameter (this.recipeId is set in constructor)
            // 2. From URL path pattern /cooking/:id
            if (!this.recipeId) {
                const pathMatch = window.location.pathname.match(/\/cooking\/([^\/]+)/);
                if (pathMatch && pathMatch[1]) {
                    this.recipeId = pathMatch[1];
                    console.log('Found recipe ID in URL path:', this.recipeId);
                }
            } else {
                console.log('Recipe ID from URL parameter:', this.recipeId);
            }

            // Show an error if no recipe ID was found
            if (!this.recipeId) {
                console.error('No recipe ID found in URL. Please select a recipe first.');
                this.showError('No recipe ID found. Please select a recipe first.');
                return;
            }

            console.log('Loading recipe with ID:', this.recipeId);
            const recipe = await loadRecipeData(this.recipeId);
            console.log('Recipe loaded successfully:', recipe.title);
            
            this.recipe = recipe;
            
            const prepSteps = (recipe.preparationSteps || []).map(step => ({
                ...step,
                phase: 'preparation',
                description: step.mainStep || '',
                bullets: step.bullets || []
            }));
            
            const cookingSteps = (recipe.cookingSteps || []).map(step => ({
                ...step,
                phase: 'cooking',
                description: step.mainStep || '',
                bullets: step.bullets || []
            }));
            
            this.steps = [...prepSteps, ...cookingSteps];
            console.log(`Recipe has ${this.steps.length} total steps (${prepSteps.length} prep, ${cookingSteps.length} cooking)`);
            
            // Initialize with preparation phase
            this.currentStep = 0;
            this.currentPhase = 'preparation';
            
            // Update the UI for the first step
            this.updateStep();
            
            // Update phase indicators
            this.updatePhaseIndicator();
        } catch (error) {
            console.error('Error loading recipe:', error);
            this.showError(`Error loading recipe: ${error.message}`);
        }
    }

    updateStep() {
        // Get the current step
        const step = this.steps[this.currentStep];
        if (!step) {
            console.error('No step found at index:', this.currentStep);
            return;
        }

        // Update the current phase if needed
        if (this.currentPhase !== step.phase) {
            this.currentPhase = step.phase;
        }
        
        // Always update phase indicators
        this.updatePhaseIndicator();

        // Store the current step ID in the document body for timer indicators
        document.body.dataset.currentStepId = this.currentStep.toString();
        document.body.dataset.currentPhase = this.currentPhase;
        
        // Get phase-specific step number (Step 1, Step 2, etc. within current phase)
        const phaseStepNumber = this.getCurrentPhaseStepNumber();
        const phaseDisplayName = this.currentPhase === 'preparation' ? 'Preparation' : 'Cooking';
        
        // Store phase-specific step number in the document body for timer indicators
        document.body.dataset.currentPhaseStepNumber = phaseStepNumber.toString();
        
        // Update step content
        this.elements.stepTitle.textContent = `${phaseDisplayName} Step ${phaseStepNumber}`;
        this.elements.stepNumber.textContent = `Step ${phaseStepNumber} of ${this.getTotalPhaseSteps()}`;
        this.elements.currentStep.textContent = step.description;

        // Update step details (bullets)
        if (step.bullets && step.bullets.length > 0) {
            this.elements.stepDetails.innerHTML = step.bullets
                .map(detail => `<li>${detail}</li>`)
                .join('');
        } else {
            this.elements.stepDetails.innerHTML = '';
        }

        // Update navigation buttons
        this.elements.prevButton.disabled = this.currentStep === 0;
        
        // Handle last step differently
        if (this.currentStep === this.steps.length - 1) {
            this.elements.nextButton.textContent = 'Bon Appétit!';
            this.elements.nextButton.disabled = true;
            this.elements.nextButton.classList.add('bon-appetit');
        } else {
            this.elements.nextButton.textContent = 'Next Step';
            this.elements.nextButton.disabled = false;
            this.elements.nextButton.classList.remove('bon-appetit');
        }

        // Update progress bar
        const progress = ((this.currentStep + 1) / this.steps.length) * 100;
        this.elements.progressBar.style.width = `${progress}%`;

        // Notify timer module about step change to trigger highlighting
        try {
            if (typeof timerModule.highlightStep === 'function') {
                timerModule.highlightStep(this.currentStep);
            } else {
                console.error("timerModule.highlightStep is not a function", timerModule);
            }
        } catch (error) {
            console.error("Error highlighting step:", error);
        }

        // Check current step for timers and request their creation
        this.checkStepForTimers(step);
    }

    /**
     * Check a step for possible timers and request their creation
     */
    checkStepForTimers(step) {
        if (!step) return;
        
        console.log('Checking step for timers', step);
        
        // Use the timer module to create timers for this step
        if (timerModule && typeof timerModule.createTimersForStep === 'function') {
            const context = {
                stepIndex: this.currentStep,
                phase: this.currentPhase,
                phaseStepNumber: this.getCurrentPhaseStepNumber()
            };
            
            // Let the timer module handle creating and tracking timers
            timerModule.createTimersForStep(step, context)
                .then(timerIds => {
                    console.log(`Timer module created ${timerIds.filter(id => id !== null).length} timers for step ${this.currentStep}`);
                })
                .catch(error => {
                    console.error('Error creating timers for step:', error);
                });
        } else {
            console.error('Timer module createTimersForStep not available');
        }
    }

    jumpToPhase(phase) {
        // Find the first step of the target phase
        const targetStepIndex = this.steps.findIndex(step => step.phase === phase);
        if (targetStepIndex !== -1) {
            this.currentStep = targetStepIndex;
            this.currentPhase = phase;
            this.updateStep();
        }
    }

    /**
     * Navigate to the next step in the recipe
     */
    nextStep() {
        try {
            // Get steps for the current phase
            const phaseSteps = this.getPhaseSteps();
            
            if (!phaseSteps || phaseSteps.length === 0) {
                console.error(`No steps found for ${this.currentPhase} phase.`);
                return;
            }
            
            // Find the current phase step number (position within current phase)
            const currentPhaseStepNumber = this.getCurrentPhaseStepNumber();
            console.log(`Current phase step number: ${currentPhaseStepNumber}`);
            
            // If we're not at the last step of the current phase
            if (currentPhaseStepNumber < phaseSteps.length) {
                console.log(`Moving to next step in ${this.currentPhase} phase: ${currentPhaseStepNumber}`);
                this.loadPhaseStep(currentPhaseStepNumber);
                return;
            }
            
            // If we're at the end of preparation phase, move to cooking phase
            if (this.currentPhase === 'preparation') {
                const cookingSteps = this.getPhaseSteps('cooking');
                if (cookingSteps && cookingSteps.length > 0) {
                    console.log('Moving from preparation to cooking phase');
                    this.currentPhase = 'cooking';
                    this.loadPhaseStep(0);
                    this.updatePhaseIndicator();
                    return;
                }
            }
            
            // If at the end of all steps, show recipe summary
            console.log('End of all steps reached, showing recipe summary');
            this.showRecipeSummary();
        } catch (error) {
            console.error('Error navigating to next step:', error);
        }
    }

    /**
     * Navigate to the previous step in the recipe
     */
    previousStep() {
        try {
            // Find all steps in the current phase
            const phaseSteps = this.getPhaseSteps();
            
            if (!phaseSteps || phaseSteps.length === 0) {
                console.error(`No steps found for ${this.currentPhase} phase.`);
                return;
            }
            
            // Find the current step position within this phase
            const currentStepObj = this.steps[this.currentStep];
            const currentPhaseStepPosition = phaseSteps.findIndex(step => step === currentStepObj);
            
            console.log(`Current position in ${this.currentPhase} phase: ${currentPhaseStepPosition}`);
            
            // If not at the first step of current phase, go to previous step in this phase
            if (currentPhaseStepPosition > 0) {
                console.log(`Moving to previous step in ${this.currentPhase} phase: ${currentPhaseStepPosition - 1}`);
                this.loadPhaseStep(currentPhaseStepPosition - 1);
                return;
            }
            
            // If at the first step of cooking phase, move back to preparation phase
            if (this.currentPhase === 'cooking') {
                const prepSteps = this.getPhaseSteps('preparation');
                if (prepSteps && prepSteps.length > 0) {
                    console.log('Moving from cooking back to preparation phase');
                    this.currentPhase = 'preparation';
                    // Go to the last step of the preparation phase
                    this.loadPhaseStep(prepSteps.length - 1);
                    this.updatePhaseIndicator();
                    return;
                }
            }
            
            // If at the first step of preparation phase, do nothing
            console.log('Already at first step, cannot go back further');
        } catch (error) {
            console.error('Error navigating to previous step:', error);
        }
    }

    updatePhaseIndicator() {
        console.log('Updating phase indicator to:', this.currentPhase);
        this.elements.phaseIndicators.forEach(indicator => {
            const phase = indicator.dataset.phase;
            const isActive = phase === this.currentPhase;
            indicator.classList.toggle('active', isActive);
            console.log(`Phase ${phase} active:`, isActive);
        });
    }

    /**
     * Get the current phase step number (1-based)
     * @returns {number} - The step number within the current phase
     */
    getCurrentPhaseStepNumber() {
        // Find all steps in the current phase
        const phaseSteps = this.getPhaseSteps();
        
        // Find the position of the current step within the phase steps
        const currentStepInPhase = phaseSteps.findIndex(step => {
            const currentStepObj = this.steps[this.currentStep];
            return step === currentStepObj;
        });
        
        // Return 1-based index for display, or next step (for navigation)
        return currentStepInPhase + 1;
    }

    getTotalPhaseSteps() {
        return this.steps.filter(step => step.phase === this.currentPhase).length;
    }

    readCurrentStep() {
        const step = this.steps[this.currentStep];
        if (step && this.voiceControl) {
            // Use the voice control module to read the step content without prefixes
            this.voiceControl.readCurrentStep(step);
        }
    }

    readAllSteps() {
        if (this.voiceControl) {
            // Use the voice control module to read all steps
            this.voiceControl.readAllSteps(this.steps);
        }
    }

    handleVoiceCommand(command) {
        switch (command.toLowerCase()) {
            case 'next step':
                this.nextStep();
                break;
            case 'previous step':
                this.previousStep();
                break;
            case 'read step':
                this.readCurrentStep();
                break;
            case 'start timer':
                // Just publish the event to start all timers
                this.eventBus.publish('timer:request:start:all', null);
                break;
            case 'read all':
                this.readAllSteps();
                break;
        }
    }

    setupVoiceCommands() {
        const commands = {
            // Navigation commands
            'next (step)': () => this.nextStep(),
            'go (to the) next (step)': () => this.nextStep(),
            'go forward': () => this.nextStep(),
            'forward': () => this.nextStep(),
            'continue': () => this.nextStep(),
            
            'previous (step)': () => this.previousStep(),
            'go (to the) previous (step)': () => this.previousStep(),
            'go back': () => this.previousStep(),
            'back': () => this.previousStep(),
            
            // Reading commands
            'read (this) step': () => this.readCurrentStep(),
            'read (the) instructions': () => this.readCurrentStep(),
            'read (it) (to me)': () => this.readCurrentStep(),
            'read (the current) step': () => this.readCurrentStep(),
            'read': () => this.readCurrentStep(),
            'read step': () => this.readCurrentStep(),
            'read the step': () => this.readCurrentStep(),
            
            'pause (the) reading': () => {
                if (this.voiceControl) {
                    this.voiceControl.pauseReading();
                }
            },
            'stop reading': () => {
                if (this.voiceControl) {
                    if (this.voiceControl.stopSpeaking()) {
                        // Visual feedback that reading was stopped
                        const readBtn = this.elements.readButton;
                        if (readBtn) {
                            // Flash the button to provide visual feedback
                            readBtn.classList.add('flash-feedback');
                            setTimeout(() => {
                                readBtn.classList.remove('flash-feedback');
                            }, 300);
                        }
                    }
                }
            },
            
            'resume (the) reading': () => {
                if (this.voiceControl) {
                    this.voiceControl.resumeReading();
                }
            },
            'continue reading': () => {
                if (this.voiceControl) {
                    this.voiceControl.resumeReading();
                }
            },
            
            // Phase navigation
            'go to preparation (phase)': () => this.jumpToPhase('preparation'),
            'switch to preparation (phase)': () => this.jumpToPhase('preparation'),
            'preparation (phase)': () => this.jumpToPhase('preparation'),
            
            'go to cooking (phase)': () => this.jumpToPhase('cooking'),
            'switch to cooking (phase)': () => this.jumpToPhase('cooking'),
            'cooking (phase)': () => this.jumpToPhase('cooking'),
            
            // Timer commands
            'start timer': () => {
                // Use timer module's voice command interface
                this.eventBus.publish('timer:request:start:all', null);
            },
            'start timers': () => {
                this.eventBus.publish('timer:request:start:all', null);
            },
            
            // Voice control commands
            'disable voice (commands)': () => {
                if (this.voiceControl) {
                    this.voiceControl.stop();
                    this.updateVoiceControlUI(false);
                }
            },
            'turn off voice (commands)': () => {
                if (this.voiceControl) {
                    this.voiceControl.stop();
                    this.updateVoiceControlUI(false);
                }
            },
            
            'enable voice (commands)': () => {
                if (this.voiceControl) {
                    this.voiceControl.start();
                    this.updateVoiceControlUI(true);
                }
            },
            'turn on voice (commands)': () => {
                if (this.voiceControl) {
                    this.voiceControl.start();
                    this.updateVoiceControlUI(true);
                }
            },
            
            // Recipe commands
            'start recipe': () => {
                this.currentStep = 0;
                this.currentPhase = 'preparation';
                this.updateStep();
            },
            'exit (the) recipe': () => this.exitCookingMode(),
            'close (the) recipe': () => this.exitCookingMode(),
            'complete (the) recipe': () => this.exitCookingMode(),
            
            // Help commands
            'what can I say': () => this.showAvailableCommands(),
            'show commands': () => this.showAvailableCommands(),
            'available commands': () => this.showAvailableCommands(),
            'help': () => this.showAvailableCommands(),
            
            // Reading all steps
            'read all (steps)': () => this.readAllSteps()
        };

        if (this.voiceControl) {
            this.voiceControl.addCommands(commands);
        }
    }
    
    /**
     * Update the voice control UI elements
     * @param {boolean} isEnabled - Whether voice control is enabled
     */
    updateVoiceControlUI(isEnabled) {
        if (!this.elements.voiceToggle || !this.elements.voiceStatus) return;
        
        if (isEnabled) {
            this.elements.voiceToggle.textContent = 'Disable Voice Commands';
            
            // Set initial status message
            if (this.voiceControl && this.voiceControl.isSpeaking) {
                this.elements.voiceStatus.textContent = 'Reading in progress (voice commands paused)';
            } else {
                this.elements.voiceStatus.textContent = 'Voice commands ready';
            }
            
            this.elements.voiceStatus.classList.remove('inactive');
            this.elements.voiceStatus.classList.add('active');
        } else {
            this.elements.voiceToggle.textContent = 'Enable Voice Commands';
            this.elements.voiceStatus.textContent = 'Voice commands are disabled';
            this.elements.voiceStatus.classList.remove('active');
            this.elements.voiceStatus.classList.add('inactive');
        }
    }
    
    /**
     * Show available voice commands to the user
     */
    showAvailableCommands() {
        if (!this.voiceControl || !this.elements.commandsPanel) return;
        
        // Group commands by category - expand the timer commands
        const categories = {
            'Navigation': [
                'next step', 'previous step',
                'go to preparation phase', 'go to cooking phase'
            ],
            'Reading': [
                'read step', 'read instructions',
                'stop reading', 'pause reading', 'resume reading'
            ],
            'Timers': [
                'start timer', 'pause timer', 'reset timer',
                'create a timer for 5 minutes',
                'start pasta timer for 10 minutes',
                'start the sauce timer',
                'pause the pasta timer',
                'reset the sauce timer'
            ],
            'Voice Control': [
                'enable voice commands',
                'disable voice commands',
                'show commands', 'help'
            ]
        };
        
        // Create commands panel content
        let html = '<div class="commands-panel-inner">';
        html += '<h3>Voice Commands</h3>';
        html += '<button class="close-commands-btn">×</button>';
        
        // Create a grid layout for command categories
        html += '<div class="commands-grid">';
        
        // Add each category
        for (const [category, cmdList] of Object.entries(categories)) {
            html += `<div class="command-category">
                <h4>${category}</h4>
                <ul>
                    ${cmdList.map(cmd => `<li>"${cmd}"</li>`).join('')}
                </ul>
            </div>`;
        }
        
        html += '</div>'; // Close grid
        html += '</div>'; // Close panel inner
        
        // Update panel and show it
        this.elements.commandsPanel.innerHTML = html;
        this.elements.commandsPanel.classList.add('active');
        
        // Attach close button event
        const closeBtn = this.elements.commandsPanel.querySelector('.close-commands-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.elements.commandsPanel.classList.remove('active');
            });
        }
        
        // Read commands aloud if needed
        if (this.voiceControl && this.voiceControl.isEnabled()) {
            this.voiceControl.speak('Here are some commands you can use.');
        }
    }

    exitCookingMode() {
        try {
            // Clean up voice control if it exists
            if (this.voiceControl) {
                this.voiceControl.cleanup();
            }

            // Clean up all timers
            if (timerModule) {
                if (timerModule.clearAllTimers) {
                    timerModule.clearAllTimers();
                }
                if (timerModule.clearProcessedSteps) {
                    timerModule.clearProcessedSteps();
                }
            }

            // Clear all event listeners
            this.unbindEvents();

            // Redirect to recipe summary if we have a recipe ID, otherwise to index
            if (this.recipeId) {
                window.location.href = `/recipe/${this.recipeId}`;
            } else {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Error exiting cooking mode:', error);
            // Fallback to index page if there's an error
            window.location.href = '/';
        }
    }

    /**
     * Show an error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        // Create or find error element
        let errorElement = document.getElementById('error-message');
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'error-message';
            errorElement.className = 'error-message';
            errorElement.style.cssText = 'color: red; padding: 20px; background-color: #ffeeee; border: 1px solid #ffcccc; margin: 20px; font-weight: bold;';
            
            const container = document.querySelector('main') || document.body;
            container.prepend(errorElement);
        }
        
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    // Add test method to verify timer fixes
    _runTimerTests() {
        console.log('Running timer tests...');
        try {
            // Import and run the timer tests
            import('../timer/test-timer.js')
                .then(testModule => {
                    testModule.runTimerTests();
                    console.log('Timer tests started successfully');
                })
                .catch(error => {
                    console.error('Error loading timer tests:', error);
                });
        } catch (error) {
            console.error('Error running timer tests:', error);
        }
    }

    /**
     * Get steps for a specific phase
     * @param {string} phase - The phase to get steps for (defaults to current phase)
     * @returns {Array} - Array of steps for the phase
     */
    getPhaseSteps(phase) {
        const targetPhase = phase || this.currentPhase;
        return this.steps.filter(step => step.phase === targetPhase);
    }

    /**
     * Load a step from the current phase
     * @param {number} stepNumber - Step number in current phase (0-based)
     */
    loadPhaseStep(stepNumber) {
        try {
            console.log(`Loading phase step: ${stepNumber} for phase: ${this.currentPhase}`);
            const phaseSteps = this.getPhaseSteps();

            if (!phaseSteps || phaseSteps.length === 0) {
                console.error(`No steps found for ${this.currentPhase} phase.`);
                return;
            }

            console.log(`Phase ${this.currentPhase} has ${phaseSteps.length} steps`);
            
            // Ensure step number is within bounds (0-based index)
            const boundedStepNumber = Math.max(0, Math.min(stepNumber, phaseSteps.length - 1));
            if (boundedStepNumber !== stepNumber) {
                console.log(`Adjusted step number from ${stepNumber} to ${boundedStepNumber} to stay within bounds`);
            }
            
            // Get the step object for this phase step
            const currentStep = phaseSteps[boundedStepNumber];
            
            if (!currentStep) {
                console.error(`Step ${boundedStepNumber} not found in ${this.currentPhase} phase.`);
                return;
            }

            // Find the index of this step in the overall steps array
            const stepIndex = this.steps.findIndex(s => s === currentStep);
            if (stepIndex !== -1) {
                console.log(`Found step at index ${stepIndex} in overall steps array`);
                this.currentStep = stepIndex;
            } else {
                console.error('Step not found in overall steps array');
                return;
            }
            
            // Update DOM with current step information
            this.updateStepDisplay(currentStep);
            
            // Update progress indicators
            this.updateProgressIndicators();
            
            // Store the last used step ID to prevent duplicate timer creation
            this.lastUsedStepId = currentStep.id;
            
            // Play a subtle notification sound to indicate navigation
            // instead of announcing the step verbally
            if (this.voiceControl && this.voiceControl.isEnabled()) {
                this.voiceControl.playCommandRecognizedSound();
            }
        } catch (error) {
            console.error('Error loading phase step:', error);
        }
    }

    /**
     * Update progress indicators
     */
    updateProgressIndicators() {
        try {
            if (this.elements.progressBar) {
                const progress = this.calculateProgress();
                this.elements.progressBar.style.width = `${progress}%`;
            }
        } catch (error) {
            console.error('Error updating progress indicators:', error);
        }
    }

    /**
     * Calculate progress percentage
     * @returns {number} - Progress percentage (0-100)
     */
    calculateProgress() {
        const totalSteps = this.steps ? this.steps.length : 0;
        if (totalSteps === 0) return 0;
        return ((this.currentStep + 1) / totalSteps) * 100;
    }

    /**
     * Update the step display for a given step
     * This is called by loadPhaseStep
     * @param {Object} step - The step to display
     */
    updateStepDisplay(step) {
        if (!step) {
            console.error('No step provided to updateStepDisplay');
            return;
        }

        // Find the index of this step in the steps array
        const stepIndex = this.steps.findIndex(s => 
            s.id === step.id || 
            (s.description === step.description && s.phase === step.phase)
        );

        if (stepIndex !== -1) {
            // Update the current step index
            this.currentStep = stepIndex;
            
            // Get phase-specific step number (Step 1, Step 2, etc. within current phase)
            const phaseStepNumber = this.getCurrentPhaseStepNumber();
            const phaseDisplayName = this.currentPhase === 'preparation' ? 'Preparation' : 'Cooking';
            
            // Update step content without calling full updateStep to avoid duplicate timers
            this.elements.stepTitle.textContent = `${phaseDisplayName} Step ${phaseStepNumber}`;
            this.elements.stepNumber.textContent = `Step ${phaseStepNumber} of ${this.getTotalPhaseSteps()}`;
            this.elements.currentStep.textContent = step.description;

            // Update step details (bullets)
            if (step.bullets && step.bullets.length > 0) {
                this.elements.stepDetails.innerHTML = step.bullets
                    .map(detail => `<li>${detail}</li>`)
                    .join('');
            } else {
                this.elements.stepDetails.innerHTML = '';
            }
            
            // Update phase indicators
            this.updatePhaseIndicator();
            
            // Update navigation buttons
            this.elements.prevButton.disabled = this.currentStep === 0;
            
            // Handle last step differently
            if (this.currentStep === this.steps.length - 1) {
                this.elements.nextButton.textContent = 'Bon Appétit!';
                this.elements.nextButton.disabled = true;
                this.elements.nextButton.classList.add('bon-appetit');
            } else {
                this.elements.nextButton.textContent = 'Next Step';
                this.elements.nextButton.disabled = false;
                this.elements.nextButton.classList.remove('bon-appetit');
            }
            
            // Highlight timers
            if (typeof timerModule.highlightStep === 'function') {
                timerModule.highlightStep(this.currentStep);
            }
            
            // IMPORTANT: Check for timers in this step to ensure they're created
            // This ensures timers are created regardless of how we navigate to the step
            this.checkStepForTimers(step);
        } else {
            console.error('Step not found in steps array:', step);
        }
    }

    /**
     * Show recipe summary when cooking is complete
     */
    showRecipeSummary() {
        try {
            console.log('Showing recipe summary');
            
            // Display a completion message
            if (this.elements.currentStep) {
                this.elements.currentStep.textContent = 'Congratulations! You have completed all steps.';
            }
            
            if (this.elements.stepDetails) {
                this.elements.stepDetails.innerHTML = '<li>Your recipe is ready to enjoy!</li><li>Click "Exit Cooking Mode" to return to the recipe.</li>';
            }
            
            if (this.elements.stepTitle) {
                this.elements.stepTitle.textContent = 'Recipe Complete';
            }
            
            if (this.elements.stepNumber) {
                this.elements.stepNumber.textContent = '';
            }
            
            // Update navigation buttons
            if (this.elements.nextButton) {
                this.elements.nextButton.textContent = 'Bon Appétit!';
                this.elements.nextButton.disabled = true;
                this.elements.nextButton.classList.add('bon-appetit');
            }
            
            // Add a congratulations message at the top
            const congratsElement = document.createElement('div');
            congratsElement.className = 'congratulations-message';
            congratsElement.innerHTML = `
                <h2>Bon Appétit!</h2>
                <p>You've completed "${this.recipe?.title}"</p>
            `;
            congratsElement.style.cssText = 'text-align: center; margin: 20px 0; padding: 15px; background-color: #f8f5e6; border-radius: 8px; border: 1px solid #e6dfc3;';
            
            // Insert before the step container
            const stepContainer = document.querySelector('.step-container');
            if (stepContainer && stepContainer.parentNode) {
                stepContainer.parentNode.insertBefore(congratsElement, stepContainer);
            }
            
            // You could also display a summary of the recipe here
        } catch (error) {
            console.error('Error showing recipe summary:', error);
        }
    }
}

// Create a singleton instance
const cookingModeInstance = new CookingMode();

// Create and export the module interface
const cookingMode = {
    // Expose the initialize method for proper module initialization
    initialize: (options = {}) => cookingModeInstance.init(options),
    
    // Expose other methods that might be needed outside
    exitCookingMode: () => cookingModeInstance.exitCookingMode(),
    
    // Status check method
    isInitialized: () => cookingModeInstance.isInitialized(),
    
    // Internal reference to the instance for debugging
    _instance: cookingModeInstance
};

// Export the module
export default cookingMode;

// Handle hot module replacement
if (module.hot) {
    module.hot.accept();
    
    module.hot.dispose(() => {
        console.log('Hot module replacement: cleaning up cooking mode');
        if (cookingModeInstance && typeof cookingModeInstance.cleanupExistingState === 'function') {
            cookingModeInstance.cleanupExistingState();
        }
    });
}

// If this is loaded directly as an entry point (not as an import), initialize automatically
// This will run when the module is loaded as a webpack entry point
// Use a global variable to track initialization
window.__cookingModeInitialized = window.__cookingModeInitialized || false;
if (typeof window !== 'undefined' && !window.__cookingModeInitialized) {
    window.__cookingModeInitialized = true;
    // Initialize on DOMContentLoaded, but only once
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Auto-initializing cooking mode as entry point');
        cookingMode.initialize();
    });
}