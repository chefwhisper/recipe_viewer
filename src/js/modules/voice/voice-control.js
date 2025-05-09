/**
 * Voice Control Module
 * Handles voice recognition and command processing
 */

export class VoiceControl {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.commands = new Map();
        this.isSpeaking = false;
        this.ignoreSpeechEvents = false;
        this.pausedReading = null;
        this.availableCommands = [];
        this.currentStepIndex = 0; // Track current step index
        this.currentRecipeSteps = null; // Store recipe steps for navigation
        this.statusElement = document.getElementById('voice-status');
        
        // Get access to the global event bus if available
        try {
            // Use the global event bus if it exists
            this.eventBus = window.eventBus;
            if (!this.eventBus) {
                console.log('No global event bus found, importing from module');
                import('../../core/events/event-bus.js').then(module => {
                    this.eventBus = module.default;
                    console.log('Event bus imported for voice control');
                });
            }
        } catch (error) {
            console.error('Error accessing event bus:', error);
        }
        
        this.initializeSpeechRecognition();
    }

    initializeSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.error('Speech recognition not supported');
            this.updateStatus('Voice commands not supported in this browser', 'error');
            return;
        }

        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 3; // Get multiple alternative interpretations

        this.recognition.onresult = (event) => {
            const last = event.results.length - 1;
            const command = event.results[last][0].transcript.trim().toLowerCase();
            
            // Log what was recognized for debugging
            console.log(`Recognition result: "${command}" (confidence: ${event.results[last][0].confidence.toFixed(2)})`);
            
            // Check if this is one of our system feedback phrases before showing it in the UI
            const isSystemPhrase = 
                command.includes('voice control activated') || 
                command.includes('voice control deactivated') ||
                command.includes('command not recognized') ||
                command.includes('not recognized') ||
                /^hear(d|ing)?:?\s/i.test(command) ||
                /^(command|voice)?\s?not\s(recognized|recognize)/i.test(command);
            
            // Only show recognized command in status if it's not a system phrase
            if (!isSystemPhrase) {
                // Show what was recognized in the UI
                this.updateStatus(`Heard: "${command}"`, 'active');
                
                // If alternative interpretations are available, log them too
                if (event.results[last].length > 1) {
                    for (let i = 1; i < event.results[last].length; i++) {
                        console.log(`Alternative ${i}: "${event.results[last][i].transcript.trim().toLowerCase()}" (confidence: ${event.results[last][i].confidence.toFixed(2)})`);
                    }
                }
            }
            
            // Special case: Always allow "stop reading" commands even when ignoring other speech events
            const stopReadingRegex = /.*(stop|pause).*read.*/i;
            if (stopReadingRegex.test(command)) {
                console.log('Processing stop/pause reading command even during speech');
                this.stopSpeaking();
                return;
            }
            
            // If we're speaking feedback, ignore other speech recognition results
            if (this.ignoreSpeechEvents) {
                console.log('Ignoring speech recognition result during feedback');
                return;
            }
            
            // Only process command if it's not a system phrase
            if (!isSystemPhrase) {
                this.processCommand(command);
                
                // Reset status after a short delay
                setTimeout(() => {
                    if (this.isListening && !this.isSpeaking) {
                        this.updateStatus('Voice commands ready', 'active');
                    }
                }, 3000);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error !== 'no-speech') {
                // Only stop on real errors, not just "no speech detected"
                this.stop();
                this.updateStatus(`Voice recognition error: ${event.error}`, 'error');
            }
        };

        this.recognition.onend = () => {
            // If we're still supposed to be listening, restart
            if (this.isListening) {
                console.log('Recognition ended, restarting...');
                try {
                    this.recognition.start();
                } catch (e) {
                    console.error('Error restarting recognition:', e);
                    this.isListening = false;
                    this.updateStatus('Voice recognition stopped due to error', 'error');
                }
            }
        };
    }

    // Method to update the voice status message in the UI
    updateStatus(message, statusClass = null) {
        if (!this.statusElement) {
            this.statusElement = document.getElementById('voice-status');
            if (!this.statusElement) return;
        }
        
        // Don't update status if the message contains phrases we're trying to avoid recognizing
        const skipPhrases = ['command not recognized', 'not recognized', 'voice control activated', 'voice control deactivated'];
        const isSystemFeedback = skipPhrases.some(phrase => message.toLowerCase().includes(phrase));
        
        // Only update UI for non-feedback messages or when explicitly told to
        if (!isSystemFeedback || statusClass === 'error') {
            // Update text content
            this.statusElement.textContent = message;
            
            // Update status classes if provided
            if (statusClass) {
                this.statusElement.classList.remove('active', 'inactive', 'error');
                this.statusElement.classList.add(statusClass);
            }
        }
    }

    start() {
        if (!this.recognition) return;
        
        this.isListening = true;
        try {
            this.recognition.start();
            console.log('Voice recognition started');
            
            // Temporarily ignore our own speech to prevent feedback loops
            this.ignoreSpeechEvents = true;
            
            // Update status to indicate voice control is active
            this.updateStatus('Voice control activated', 'active');
            
            // No longer speak feedback when activating
            // Just enable speech processing after a short delay
            setTimeout(() => {
                this.ignoreSpeechEvents = false;
                this.updateStatus('Voice commands ready', 'active');
            }, 500);
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            this.isListening = false;
            this.updateStatus('Error starting voice recognition', 'error');
        }
    }

    stop() {
        if (!this.recognition) return;
        
        this.isListening = false;
        try {
            this.recognition.stop();
            console.log('Voice recognition stopped');
            
            // Update status to indicate voice control is deactivated
            this.updateStatus('Voice control deactivated', 'inactive');
            
            // No longer speak feedback when deactivating
            // Just set ignoreSpeechEvents back to false after a delay
            setTimeout(() => {
                this.ignoreSpeechEvents = false;
            }, 500);
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
            this.updateStatus('Error stopping voice recognition', 'error');
        }
    }

    // Method to check if voice control is currently enabled
    isEnabled() {
        return this.isListening;
    }

    // Add commands with their variations
    addCommands(commandsMap) {
        for (const [phrase, callback] of Object.entries(commandsMap)) {
            // Store original command for help/available commands list
            this.availableCommands.push(phrase);
            
            // Convert the phrase to a regex pattern
            const pattern = this.phraseToPattern(phrase);
            this.commands.set(pattern, callback);
            console.log(`Added voice command: ${phrase}`);
        }
    }

    // Get a list of available commands for display
    getAvailableCommands() {
        return this.availableCommands;
    }

    // Method to process a recognized command
    processCommand(command) {
        console.log('Processing voice command:', command);
        let recognized = false;
        
        // Skip system feedback phrases - Add more comprehensive pattern matching
        if (command.includes('voice control activated') || 
            command.includes('voice control deactivated') ||
            command.includes('command not recognized') ||
            command.includes('not recognized') ||
            /hear(d|ing)?:?\s/i.test(command) ||  // Skip "Heard: X" feedback
            /^(command|voice)?\s?not\s(recognized|recognize)/i.test(command)) {
            console.log('Skipping system feedback phrase:', command);
            return;
        }
        
        // Check for timer-related commands first - forward them to timer command interface
        const timerCommandRegex = /(start|create|set|pause|stop|reset|restart|cancel|clear|remove|close)\s+(?:.+?)(?:\s+timer)?/i;
        if (timerCommandRegex.test(command)) {
            console.log('Detected timer command, forwarding to timer command interface');
            
            // Additional logging to verify event publishing
            console.log(`Event bus available: ${!!this.eventBus}`);
            
            // Forward the command to the timer module via event bus
            if (this.eventBus) {
                console.log(`Publishing timer:command:process event with command: "${command}"`);
                this.eventBus.publish('timer:command:process', { command });
                
                // Also try direct access to timer command interface if available via global timerModule
                if (window.timerModule && window.timerModule.timerCommandInterface) {
                    console.log('Also trying direct access to timerCommandInterface');
                    try {
                        window.timerModule.timerCommandInterface.processCommand(command);
                    } catch (error) {
                        console.error('Error directly accessing timer command interface:', error);
                    }
                }
            } else {
                console.error('Event bus not available for timer command processing');
            }
            
            // Don't provide audio feedback
            return;
        }
        
        // Special handling for help commands which are frequently misrecognized
        if (command.includes('what can i say') || 
            command.includes('what commands') || 
            command.includes('show commands') ||
            command.includes('available commands') ||
            command.includes('what can i do') ||
            (command.includes('help') && command.length < 10)) {
            
            console.log('Help command detected:', command);
            
            // Find and execute the help command callback
            for (const [pattern, callback] of this.commands) {
                if (pattern.toString().includes('what can I say') || 
                    pattern.toString().includes('show commands') ||
                    pattern.toString().includes('available commands') ||
                    pattern.toString().includes('help')) {
                    
                    console.log('Executing help command callback');
                    callback();
                    recognized = true;
                    return;
                }
            }
        }
        
        // Debug: Log all available command patterns
        console.log('Available command patterns:');
        for (const [pattern, _] of this.commands) {
            console.log(`- ${pattern}`);
        }
        
        for (const [pattern, callback] of this.commands) {
            console.log(`Testing command "${command}" against pattern: ${pattern}`);
            if (pattern.test(command)) {
                console.log(`Command matched pattern: ${pattern}`);
                callback();
                recognized = true;
                break;
            }
        }
        
        // If no command matched, provide visual feedback only (no speech)
        if (!recognized) {
            console.log('Command not recognized');
            // Update status message only - don't speak it
            this.updateStatus(`Command not recognized: "${command}"`, 'error');
            
            // Reset status after a delay
            setTimeout(() => {
                if (this.isListening) {
                    this.updateStatus('Voice commands ready', 'active');
                }
            }, 3000);
        }
    }

    phraseToPattern(phrase) {
        // Convert phrase to regex pattern
        // (word) means the word is optional
        const pattern = phrase
            .replace(/\((.*?)\)/g, '(?:$1)?') // Make parenthesized words optional
            .replace(/\s+/g, '\\s+'); // Allow flexible whitespace
            
        // Handle special case for help commands like "what can I say"
        // These need more flexible matching because speech recognition can vary significantly
        const helpCommands = ['what can I say', 'show commands', 'available commands', 'help'];
        if (helpCommands.includes(phrase)) {
            // For help commands, be more lenient with the pattern matching
            // "what can I say" might be recognized as "what can I say to you" or similar variations
            return new RegExp(`.*${pattern}.*`, 'i');
        }
        
        // Use a more flexible pattern that allows the command to be part of a longer phrase
        // This helps with voice recognition variations
        const regex = new RegExp(`.*${pattern}.*`, 'i');
        console.log(`Converting phrase "${phrase}" to pattern: ${regex}`);
        return regex;
    }

    speak(text, onComplete = null) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        this.isSpeaking = true;
        // Update status to indicate system is speaking
        this.updateStatus('Reading in progress (voice commands paused)', 'active');
        
        // Avoid phrases that might create feedback loops
        if (text === "Command not recognized") {
            text = "I didn't understand that command";
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.volume = 0.8;
        utterance.rate = 1.0;
        
        if (onComplete) {
            utterance.onend = () => {
                this.isSpeaking = false;
                onComplete();
                // Restore status after speaking is done
                if (this.isListening) {
                    this.updateStatus('Voice commands ready', 'active');
                }
            };
        } else {
            utterance.onend = () => {
                this.isSpeaking = false;
                // Restore status after speaking is done
                if (this.isListening) {
                    this.updateStatus('Voice commands ready', 'active');
                }
            };
        }
        
        window.speechSynthesis.speak(utterance);
    }

    /**
     * Read text with a specified volume and rate
     * @param {string} text - Text to read
     * @param {number} volume - Volume (0.0 to 1.0)
     * @param {number} rate - Speech rate (0.1 to 10.0, 1.0 is normal)
     * @param {Function} onComplete - Callback when reading is complete
     */
    speakWithOptions(text, volume = 0.8, rate = 1.0, onComplete = null) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        this.isSpeaking = true;
        // Update status to indicate system is speaking
        this.updateStatus('Reading in progress (voice commands paused)', 'active');
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.volume = volume;
        utterance.rate = rate;
        
        if (onComplete) {
            utterance.onend = () => {
                this.isSpeaking = false;
                onComplete();
                // Restore status after speaking is done
                if (this.isListening) {
                    this.updateStatus('Voice commands ready', 'active');
                }
            };
        } else {
            utterance.onend = () => {
                this.isSpeaking = false;
                // Restore status after speaking is done
                if (this.isListening) {
                    this.updateStatus('Voice commands ready', 'active');
                }
            };
        }
        
        window.speechSynthesis.speak(utterance);
        return utterance;
    }

    /**
     * Read text with pauses between sentences
     * @param {string} text - Text to read
     * @param {number} pauseDuration - Pause duration in milliseconds
     */
    speakWithPauses(text, pauseDuration = 800) {
        // Split text into sentences
        const sentences = text.split(/(?<=[.!?])\s+/);
        
        if (sentences.length === 0) return;
        
        this.isSpeaking = true;
        let currentIndex = 0;
        
        const speakNextSentence = () => {
            if (currentIndex >= sentences.length) {
                this.isSpeaking = false;
                return;
            }
            
            const sentence = sentences[currentIndex].trim();
            if (!sentence) {
                currentIndex++;
                speakNextSentence();
                return;
            }
            
            const utterance = new SpeechSynthesisUtterance(sentence);
            utterance.volume = 0.8;
            utterance.rate = 1.0;
            
            utterance.onend = () => {
                if (currentIndex < sentences.length - 1) {
                    currentIndex++;
                    setTimeout(speakNextSentence, pauseDuration);
                } else {
                    this.isSpeaking = false;
                }
            };
            
            window.speechSynthesis.speak(utterance);
        };
        
        speakNextSentence();
    }

    /**
     * Read a recipe step with pauses between main text and bullets
     * @param {Object} step - Recipe step object with description and bullets
     */
    readStep(step) {
        if (!step) return;
        
        // Store current step for potential pause/resume
        this.currentReadingStep = step;
        
        // Stop any ongoing speech first
        this.stopSpeaking();
        
        // First read the main description with a pause after it
        if (step.description) {
            this.isSpeaking = true;
            // Set ignoreSpeechEvents to true while reading to prevent feedback loops
            this.ignoreSpeechEvents = true;
            
            // Update status to indicate reading is in progress
            this.updateStatus('Reading in progress (voice commands paused)', 'active');
            
            const mainStepUtterance = new SpeechSynthesisUtterance(step.description);
            mainStepUtterance.volume = 0.8;
            mainStepUtterance.rate = 1.0;
            mainStepUtterance.onend = () => {
                // Add a pause between main step and bullets
                setTimeout(() => {
                    if (this.isSpeaking) { // Only continue if we haven't been paused
                        this.readBulletPoints(step.bullets || []);
                    }
                }, 1000);
            };
            
            window.speechSynthesis.speak(mainStepUtterance);
        } else {
            // No main description, just read bullet points
            this.readBulletPoints(step.bullets || []);
        }
    }
    
    /**
     * Pause the current reading
     */
    pauseReading() {
        if (this.isSpeaking) {
            console.log('Pausing reading');
            this.isSpeaking = false;
            window.speechSynthesis.pause();
            this.pausedReading = true;
            this.updateStatus('Reading paused (voice commands ready)', 'active');
            return true;
        }
        return false;
    }
    
    /**
     * Resume a paused reading
     */
    resumeReading() {
        if (this.pausedReading) {
            console.log('Resuming reading');
            this.isSpeaking = true;
            window.speechSynthesis.resume();
            this.pausedReading = false;
            this.updateStatus('Reading in progress (voice commands paused)', 'active');
            return true;
        }
        return false;
    }
    
    /**
     * Read bullet points with pauses between them
     * @param {Array} bullets - Array of bullet point strings
     * @param {number} pauseDuration - Pause duration in milliseconds
     */
    readBulletPoints(bullets, pauseDuration = 800) {
        if (!bullets || bullets.length === 0) {
            this.isSpeaking = false;
            // Re-enable speech recognition when finished reading
            this.ignoreSpeechEvents = false;
            if (this.isListening) {
                this.updateStatus('Voice commands ready', 'active');
            }
            return;
        }
        
        this.isSpeaking = true;
        // Ignore speech events while reading bullets
        this.ignoreSpeechEvents = true;
        
        // Update status to show reading is in progress
        this.updateStatus('Reading in progress (voice commands paused)', 'active');
        
        // Read each bullet point with a pause in between
        const readNextBullet = (index) => {
            if (index >= bullets.length) {
                this.isSpeaking = false;
                // Re-enable speech recognition when finished reading
                setTimeout(() => {
                    this.ignoreSpeechEvents = false;
                    if (this.isListening) {
                        this.updateStatus('Voice commands ready', 'active');
                    }
                }, 500);
                return;
            }
            
            if (!this.isSpeaking) {
                // Reading has been paused
                // Re-enable speech recognition
                this.ignoreSpeechEvents = false;
                return;
            }
            
            const bulletUtterance = new SpeechSynthesisUtterance(bullets[index]);
            bulletUtterance.volume = 0.8;
            bulletUtterance.rate = 1.0;
            
            // When this bullet finishes, wait briefly then read the next one
            bulletUtterance.onend = () => {
                if (this.isSpeaking) { // Only continue if we haven't been paused
                    setTimeout(() => {
                        readNextBullet(index + 1);
                    }, pauseDuration);
                }
            };
            
            window.speechSynthesis.speak(bulletUtterance);
        };
        
        // Start reading the first bullet
        readNextBullet(0);
    }
    
    /**
     * Read all steps of a recipe with pauses
     * @param {Array} steps - Array of recipe step objects
     */
    readAllSteps(steps) {
        if (!steps || steps.length === 0) return;
        
        // Store steps for potential pause/resume and navigation
        this.currentReadingAllSteps = steps;
        this.currentRecipeSteps = steps;
        
        // Stop any ongoing speech
        this.stopSpeaking();
        
        this.isSpeaking = true;
        // Set ignoreSpeechEvents to false to allow stop commands
        this.ignoreSpeechEvents = false;
        
        // Update status to indicate reading is in progress
        this.updateStatus('Reading in progress (voice commands paused)', 'active');
        
        const readNextStep = (index) => {
            if (index >= steps.length) {
                this.isSpeaking = false;
                if (this.isListening) {
                    this.updateStatus('Voice commands ready', 'active');
                }
                return;
            }
            
            if (!this.isSpeaking) {
                // Reading has been paused
                return;
            }
            
            const step = steps[index];
            const stepNumber = index + 1;
            
            // Create the step text with number
            let stepText = `Step ${stepNumber}: ${step.description || ''}`;
            
            // Create an utterance for the main step
            const stepUtterance = new SpeechSynthesisUtterance(stepText);
            stepUtterance.volume = 0.8;
            stepUtterance.rate = 1.0;
            
            // When main step description finishes
            stepUtterance.onend = () => {
                if (!this.isSpeaking) {
                    // Reading has been paused
                    return;
                }
                
                // If there are bullet points, read them with pauses
                if (step.bullets && step.bullets.length > 0) {
                    // Read each bullet point
                    let bulletIndex = 0;
                    
                    const readNextBullet = () => {
                        if (bulletIndex >= step.bullets.length) {
                            // All bullets are done, move to next step after a pause
                            setTimeout(() => {
                                if (this.isSpeaking && index < steps.length - 1) {
                                    // Say "Next step" before moving to the next step
                                    const nextStepUtterance = new SpeechSynthesisUtterance("Next step");
                                    nextStepUtterance.onend = () => {
                                        if (this.isSpeaking) {
                                            setTimeout(() => readNextStep(index + 1), 500);
                                        }
                                    };
                                    window.speechSynthesis.speak(nextStepUtterance);
                                } else {
                                    this.isSpeaking = false;
                                    if (this.isListening) {
                                        this.updateStatus('Voice commands ready', 'active');
                                    }
                                }
                            }, 1000);
                            return;
                        }
                        
                        if (!this.isSpeaking) {
                            // Reading has been paused
                            return;
                        }
                        
                        // Read current bullet point
                        const bulletUtterance = new SpeechSynthesisUtterance(step.bullets[bulletIndex]);
                        bulletUtterance.volume = 0.8;
                        bulletUtterance.rate = 1.0;
                        
                        // Move to next bullet after a pause
                        bulletUtterance.onend = () => {
                            if (this.isSpeaking) {
                                setTimeout(() => {
                                    bulletIndex++;
                                    readNextBullet();
                                }, 800);
                            }
                        };
                        
                        window.speechSynthesis.speak(bulletUtterance);
                    };
                    
                    // Start reading bullets after a brief pause
                    if (this.isSpeaking) {
                        setTimeout(readNextBullet, 800);
                    }
                } else {
                    // No bullets, move to next step after a pause
                    setTimeout(() => {
                        if (this.isSpeaking && index < steps.length - 1) {
                            // Say "Next step" before moving to the next step
                            const nextStepUtterance = new SpeechSynthesisUtterance("Next step");
                            nextStepUtterance.onend = () => {
                                if (this.isSpeaking) {
                                    setTimeout(() => readNextStep(index + 1), 500);
                                }
                            };
                            window.speechSynthesis.speak(nextStepUtterance);
                        } else {
                            this.isSpeaking = false;
                            if (this.isListening) {
                                this.updateStatus('Voice commands ready', 'active');
                            }
                        }
                    }, 1500);
                }
            };
            
            // Speak the main step description
            window.speechSynthesis.speak(stepUtterance);
        };
        
        // Start reading from the first step
        readNextStep(0);
    }

    stopSpeaking() {
        if (this.isSpeaking) {
            console.log('Stopping all speech');
            window.speechSynthesis.cancel();
            this.isSpeaking = false;
            this.pausedReading = false;
            
            // Update status to indicate speech has stopped
            if (this.isListening) {
                this.updateStatus('Voice commands ready', 'active');
            }
            
            // Reset any stored reading state
            this.currentReadingStep = null;
            this.currentReadingAllSteps = null;
            
            // Re-enable speech recognition
            setTimeout(() => {
                this.ignoreSpeechEvents = false;
            }, 500);
            
            return true;
        }
        return false;
    }

    // Method to announce a recipe step (used by cooking mode)
    announceStep(step) {
        if (!step) return;
        
        // Only announce the step title/number, not the content
        let announcement = '';
        
        if (step.phase === 'preparation') {
            announcement = 'Preparation step';
        } else if (step.phase === 'cooking') {
            announcement = 'Cooking step';
        }
        
        // Don't read the step description
        
        // Temporarily ignore our own speech
        this.ignoreSpeechEvents = true;
        this.speak(announcement, () => {
            // Re-enable speech processing after feedback completes
            setTimeout(() => {
                this.ignoreSpeechEvents = false;
            }, 500);
        });
    }

    // Method for cleanup when the component is unmounted
    cleanup() {
        if (this.recognition) {
            try {
                this.stop();
                this.stopSpeaking();
                this.commands.clear();
                this.availableCommands = [];
                console.log('Voice control cleaned up');
            } catch (error) {
                console.error('Error cleaning up voice control:', error);
            }
        }
    }

    // No-op version that doesn't play any sound
    playCommandRecognizedSound() {
        // Intentionally empty to prevent sounds
        console.log('Command recognized (sound disabled)');
    }

    // No-op version that doesn't play any sound
    playFallbackBeep() {
        // Intentionally empty to prevent sounds
        console.log('Fallback beep disabled');
    }

    /**
     * Navigate to the next step without reading it
     * @returns {boolean} True if navigation was successful, false otherwise
     */
    navigateToNextStep() {
        if (!this.currentRecipeSteps || this.currentRecipeSteps.length === 0) {
            console.log('No recipe steps available for navigation');
            return false;
        }
        
        // Stop any ongoing speech first
        this.stopSpeaking();
        
        // Check if we're already at the last step
        if (this.currentStepIndex >= this.currentRecipeSteps.length - 1) {
            // We're at the last step, provide feedback
            this.ignoreSpeechEvents = true;
            this.speak("You are at the last step", () => {
                setTimeout(() => {
                    this.ignoreSpeechEvents = false;
                }, 500);
            });
            return false;
        }
        
        // Increment the step index
        this.currentStepIndex++;
        
        // Announce navigation without reading the step content
        this.ignoreSpeechEvents = true;
        this.speak(`Moved to step ${this.currentStepIndex + 1}`, () => {
            setTimeout(() => {
                this.ignoreSpeechEvents = false;
            }, 500);
        });
        
        // Return true to indicate successful navigation
        return true;
    }
    
    /**
     * Navigate to the previous step without reading it
     * @returns {boolean} True if navigation was successful, false otherwise
     */
    navigateToPreviousStep() {
        if (!this.currentRecipeSteps || this.currentRecipeSteps.length === 0) {
            console.log('No recipe steps available for navigation');
            return false;
        }
        
        // Stop any ongoing speech first
        this.stopSpeaking();
        
        // Check if we're already at the first step
        if (this.currentStepIndex <= 0) {
            // We're at the first step, provide feedback
            this.ignoreSpeechEvents = true;
            this.speak("You are at the first step", () => {
                setTimeout(() => {
                    this.ignoreSpeechEvents = false;
                }, 500);
            });
            return false;
        }
        
        // Decrement the step index
        this.currentStepIndex--;
        
        // Announce navigation without reading the step content
        this.ignoreSpeechEvents = true;
        this.speak(`Moved to step ${this.currentStepIndex + 1}`, () => {
            setTimeout(() => {
                this.ignoreSpeechEvents = false;
            }, 500);
        });
        
        // Return true to indicate successful navigation
        return true;
    }
    
    /**
     * Read the current step without any announcement prefixes
     * @param {Object} step - The step object to read
     * @returns {boolean} True if reading started, false otherwise
     */
    readCurrentStep(step) {
        if (!step) {
            console.log('No step provided to read');
            return false;
        }
        
        // Store the current step for potential pause/resume
        this.currentReadingStep = step;
        
        // Stop any ongoing speech first
        this.stopSpeaking();
        
        // Set up for reading without announcements
        this.isSpeaking = true;
        this.ignoreSpeechEvents = true;
        
        // Update status to indicate reading is in progress
        this.updateStatus('Reading in progress (voice commands paused)', 'active');
        
        // Read the main description first
        if (step.description) {
            const descriptionUtterance = new SpeechSynthesisUtterance(step.description);
            descriptionUtterance.volume = 0.8;
            descriptionUtterance.rate = 1.0;
            
            // When main description finishes, read bullet points if any
            descriptionUtterance.onend = () => {
                if (this.isSpeaking && step.bullets && step.bullets.length > 0) {
                    setTimeout(() => {
                        this.readBulletPoints(step.bullets);
                    }, 800);
                } else {
                    // No bullet points, we're done
                    this.isSpeaking = false;
                    setTimeout(() => {
                        this.ignoreSpeechEvents = false;
                        if (this.isListening) {
                            this.updateStatus('Voice commands ready', 'active');
                        }
                    }, 500);
                }
            };
            
            window.speechSynthesis.speak(descriptionUtterance);
        } else if (step.bullets && step.bullets.length > 0) {
            // No main description, just read bullet points
            this.readBulletPoints(step.bullets);
        } else {
            // No content to read
            this.isSpeaking = false;
            this.ignoreSpeechEvents = false;
            if (this.isListening) {
                this.updateStatus('Voice commands ready', 'active');
            }
            return false;
        }
        
        return true;
    }
}