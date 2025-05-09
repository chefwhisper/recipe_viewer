/**
 * Timer Command Interface
 * Provides the interface for voice and text commands to control timers
 */

import { cleanTranscript } from '../utils/common.js';
import { extractDuration, createTimerLabel } from './utils/timer-utils.js';

/**
 * Create a timer command interface
 * @param {Object} eventBus - Event bus for communication
 * @returns {Object} - Timer command interface
 */
export function createTimerCommandInterface(eventBus) {
  return {
    eventBus: eventBus,
    commandPatterns: null,
    
    /**
     * Initialize the command interface
     */
    init() {
      // Define command patterns
      this.commandPatterns = this.createCommandPatterns();
      console.log('Timer command interface initialized');
    },
    
    /**
     * Create command patterns for parsing
     * @returns {Array} - Array of command patterns
     */
    createCommandPatterns() {
      return [
        // Create timer command
        {
          patterns: [
            /create\s+(?:a\s+)?timer\s+for\s+(\d+)\s+(?:minute|minutes|min|mins|m|second|seconds|sec|secs|s)/i,
            /set\s+(?:a\s+)?timer\s+for\s+(\d+)\s+(?:minute|minutes|min|mins|m|second|seconds|sec|secs|s)/i,
            /start\s+(?:a\s+)?timer\s+for\s+(\d+)\s+(?:minute|minutes|min|mins|m|second|seconds|sec|secs|s)/i
          ],
          action: (matches) => {
            const amount = parseInt(matches[1], 10);
            const unit = matches[2] ? matches[2].toLowerCase() : 'minute';
            
            // Convert to seconds
            let seconds = amount;
            if (unit.startsWith('m')) {
              seconds = amount * 60;
            }
            
            this.eventBus.publish('timer:request:create', {
              name: `${amount} ${unit} timer`,
              duration: seconds,
              autoStart: true
            });
          }
        },
        
        // Create named timer command
        {
          patterns: [
            /create\s+(?:a\s+)?(\w+)\s+timer\s+for\s+(\d+)\s+(?:minute|minutes|min|mins|m|second|seconds|sec|secs|s)/i,
            /set\s+(?:a\s+)?(\w+)\s+timer\s+for\s+(\d+)\s+(?:minute|minutes|min|mins|m|second|seconds|sec|secs|s)/i,
            /start\s+(?:a\s+)?(\w+)\s+timer\s+for\s+(\d+)\s+(?:minute|minutes|min|mins|m|second|seconds|sec|secs|s)/i
          ],
          action: (matches) => {
            const name = matches[1];
            const amount = parseInt(matches[2], 10);
            const unit = matches[3] ? matches[3].toLowerCase() : 'minute';
            
            // Convert to seconds
            let seconds = amount;
            if (unit.startsWith('m')) {
              seconds = amount * 60;
            }
            
            this.eventBus.publish('timer:request:create', {
              name: `${name} timer`,
              duration: seconds,
              autoStart: true
            });
          }
        },
        
        // Natural language timer command - new addition using timer-utils
        {
          patterns: [
            /set\s+(?:a\s+)?timer\s+(?:for|to)\s+(.+)/i,
            /create\s+(?:a\s+)?timer\s+(?:for|to)\s+(.+)/i,
            /start\s+(?:a\s+)?timer\s+(?:for|to)\s+(.+)/i,
            /timer\s+(?:for|to)\s+(.+)/i
          ],
          action: (matches) => {
            const text = matches[1];
            const duration = extractDuration(text);
            
            if (duration > 0) {
              const label = createTimerLabel(text);
              this.eventBus.publish('timer:request:create', {
                name: label,
                duration: duration,
                autoStart: true,
                metadata: {
                  stepText: text,
                  matchIndex: text.indexOf(matches[0])
                }
              });
              return true;
            }
            return false;
          }
        },
        
        // Basic timer controls
        {
          patterns: [
            /start\s+timer/i,
            /resume\s+timer/i
          ],
          action: () => {
            this.eventBus.publish('timer:request:start:all', null);
          }
        },
        {
          patterns: [
            /pause\s+timer/i,
            /stop\s+timer/i
          ],
          action: () => {
            this.eventBus.publish('timer:request:pause:all', null);
          }
        },
        {
          patterns: [
            /reset\s+timer/i,
            /restart\s+timer/i
          ],
          action: () => {
            this.eventBus.publish('timer:request:reset:all', null);
          }
        },
        {
          patterns: [
            /cancel\s+timer/i,
            /clear\s+timer/i,
            /remove\s+timer/i,
            /close\s+timer/i
          ],
          action: () => {
            this.eventBus.publish('timer:request:clear:all', null);
          }
        },
        
        // Named timer controls - Updated with multi-word support
        {
          patterns: [
            /start\s+(?:the\s+)?(\w+)(?:\s+timer)?/i,                 // Single word: "start potato"
            /resume\s+(?:the\s+)?(\w+)(?:\s+timer)?/i,                // Single word: "resume potato"
            /start\s+(?:the\s+)?(\w+\s+\w+)(?:\s+timer)?/i,           // Two words: "start simmer potato"
            /resume\s+(?:the\s+)?(\w+\s+\w+)(?:\s+timer)?/i,          // Two words: "resume simmer potato"
            /start\s+(?:the\s+)?(\w+\s+\w+\s+\w+)(?:\s+timer)?/i,     // Three words: "start heat olive oil"
            /resume\s+(?:the\s+)?(\w+\s+\w+\s+\w+)(?:\s+timer)?/i,    // Three words: "resume heat olive oil"
            /start\s+(?:the\s+)?(.+?)\s+timer/i,                      // Any phrase ending with timer
            /resume\s+(?:the\s+)?(.+?)\s+timer/i                       // Any phrase ending with timer
          ],
          action: (matches) => {
            const name = matches[1];
            console.log(`Attempting to start timer with name: "${name}"`);
            
            // Try exact match first
            this.eventBus.publish('timer:request:start:byName', { name });
            
            // Then try with "timer" appended
            if (!name.toLowerCase().endsWith('timer')) {
              const nameWithTimer = `${name} timer`;
              console.log(`Also trying with 'timer' appended: "${nameWithTimer}"`);
              this.eventBus.publish('timer:request:start:byName', { name: nameWithTimer });
            }
            
            // Log all available timers for debugging
            this._logAvailableTimers();
          }
        },
        {
          patterns: [
            /pause\s+(?:the\s+)?(\w+)(?:\s+timer)?/i,
            /stop\s+(?:the\s+)?(\w+)(?:\s+timer)?/i,
            /pause\s+(?:the\s+)?(\w+\s+\w+)(?:\s+timer)?/i,
            /stop\s+(?:the\s+)?(\w+\s+\w+)(?:\s+timer)?/i,
            /pause\s+(?:the\s+)?(\w+\s+\w+\s+\w+)(?:\s+timer)?/i,
            /stop\s+(?:the\s+)?(\w+\s+\w+\s+\w+)(?:\s+timer)?/i,
            /pause\s+(?:the\s+)?(.+?)\s+timer/i,
            /stop\s+(?:the\s+)?(.+?)\s+timer/i
          ],
          action: (matches) => {
            const name = matches[1];
            console.log(`Attempting to pause/stop timer with name: "${name}"`);
            this.eventBus.publish('timer:request:pause:byName', { name });
            
            // Try with "timer" appended
            if (!name.toLowerCase().endsWith('timer')) {
              this.eventBus.publish('timer:request:pause:byName', { name: `${name} timer` });
            }
          }
        },
        {
          patterns: [
            /reset\s+(?:the\s+)?(\w+)(?:\s+timer)?/i,                 // Single word: "reset potato"
            /restart\s+(?:the\s+)?(\w+)(?:\s+timer)?/i,               // Single word: "restart potato"
            /reset\s+(?:the\s+)?(\w+\s+\w+)(?:\s+timer)?/i,           // Two words: "reset simmer potato"
            /restart\s+(?:the\s+)?(\w+\s+\w+)(?:\s+timer)?/i,         // Two words: "restart simmer potato"
            /reset\s+(?:the\s+)?(\w+\s+\w+\s+\w+)(?:\s+timer)?/i,     // Three words: "reset heat olive oil"
            /restart\s+(?:the\s+)?(\w+\s+\w+\s+\w+)(?:\s+timer)?/i,   // Three words: "restart heat olive oil"
            /reset\s+(?:the\s+)?(.+?)\s+timer/i,                      // Any phrase ending with timer
            /restart\s+(?:the\s+)?(.+?)\s+timer/i                     // Any phrase ending with timer
          ],
          action: (matches) => {
            const name = matches[1];
            console.log(`Attempting to reset/restart timer with name: "${name}"`);
            
            // Try exact match first
            this.eventBus.publish('timer:request:reset:byName', { name });
            
            // Then try with "timer" appended
            if (!name.toLowerCase().endsWith('timer')) {
              const nameWithTimer = `${name} timer`;
              console.log(`Also trying with 'timer' appended: "${nameWithTimer}"`);
              this.eventBus.publish('timer:request:reset:byName', { name: nameWithTimer });
            }
            
            // Log all available timers for debugging
            this._logAvailableTimers();
          }
        },
        {
          patterns: [
            /cancel\s+(?:the\s+)?(\w+)(?:\s+timer)?/i,               // Single word: "cancel potato"
            /clear\s+(?:the\s+)?(\w+)(?:\s+timer)?/i,                // Single word: "clear potato"
            /remove\s+(?:the\s+)?(\w+)(?:\s+timer)?/i,               // Single word: "remove potato"
            /close\s+(?:the\s+)?(\w+)(?:\s+timer)?/i,                // Single word: "close potato"
            /cancel\s+(?:the\s+)?(\w+\s+\w+)(?:\s+timer)?/i,         // Two words: "cancel boil pasta"
            /clear\s+(?:the\s+)?(\w+\s+\w+)(?:\s+timer)?/i,          // Two words: "clear boil pasta"
            /remove\s+(?:the\s+)?(\w+\s+\w+)(?:\s+timer)?/i,         // Two words: "remove boil pasta"
            /close\s+(?:the\s+)?(\w+\s+\w+)(?:\s+timer)?/i,          // Two words: "close boil pasta"
            /cancel\s+(?:the\s+)?(\w+\s+\w+\s+\w+)(?:\s+timer)?/i,   // Three words: "cancel heat olive oil"
            /clear\s+(?:the\s+)?(\w+\s+\w+\s+\w+)(?:\s+timer)?/i,    // Three words: "clear heat olive oil"
            /remove\s+(?:the\s+)?(\w+\s+\w+\s+\w+)(?:\s+timer)?/i,   // Three words: "remove heat olive oil"
            /close\s+(?:the\s+)?(\w+\s+\w+\s+\w+)(?:\s+timer)?/i,    // Three words: "close heat olive oil"
            /cancel\s+(?:the\s+)?(.+?)\s+timer/i,                    // Any phrase ending with timer
            /clear\s+(?:the\s+)?(.+?)\s+timer/i,                     // Any phrase ending with timer
            /remove\s+(?:the\s+)?(.+?)\s+timer/i,                    // Any phrase ending with timer
            /close\s+(?:the\s+)?(.+?)\s+timer/i                      // Any phrase ending with timer
          ],
          action: (matches) => {
            const name = matches[1];
            console.log(`Attempting to cancel/clear/remove/close timer with name: "${name}"`);
            
            // Try exact match first
            this.eventBus.publish('timer:request:remove:byName', { name });
            
            // Then try with "timer" appended
            if (!name.toLowerCase().endsWith('timer')) {
              const nameWithTimer = `${name} timer`;
              console.log(`Also trying with 'timer' appended: "${nameWithTimer}"`);
              this.eventBus.publish('timer:request:remove:byName', { name: nameWithTimer });
            }
            
            // Log all available timers for debugging
            this._logAvailableTimers();
          }
        }
      ];
    },
    
    /**
     * Log all available timers for debugging purposes
     * @private
     */
    _logAvailableTimers() {
      console.log('Checking available timers for voice command matching...');
      try {
        // Try to get timers from the global timer module first (direct access)
        if (window.timerModule && typeof window.timerModule.getAllTimers === 'function') {
          const timers = window.timerModule.getAllTimers();
          console.log('Available timers:', timers.map(timer => ({
            id: timer.id,
            name: timer.name,
            status: timer.status,
            isRunning: timer.isRunning
          })));
          return;
        }
        
        // Try to access the timer module through an event
        this.eventBus.publish('timer:request:list:all', {
          callback: (timers) => {
            if (Array.isArray(timers) && timers.length > 0) {
              console.log('Available timers via event:', timers);
            } else {
              console.log('No active timers available or timer list is empty');
            }
          }
        });
      } catch (error) {
        console.error('Error accessing timers:', error);
      }
    },
    
    /**
     * Process a voice command
     * @param {string} command - Voice command text
     * @returns {boolean} - Whether the command was recognized
     */
    processCommand(command) {
      if (!command) return false;
      
      // Clean the command text
      const cleanCommand = cleanTranscript(command);
      console.log(`Timer command interface processing command: "${cleanCommand}"`);
      
      // Check for specific close/cancel/remove commands for debugging
      if (cleanCommand.match(/(close|cancel|clear|remove)\s+/i)) {
        console.log(`Detected close/cancel/remove command: "${cleanCommand}"`);
      }
      
      // Special case handling for timer operations by name
      
      // 1. Starting a timer
      const startTimerMatch = cleanCommand.match(/start\s+(?:the\s+)?(.+?)(?:\s+timer)?/i);
      if (startTimerMatch) {
        const timerName = startTimerMatch[1];
        console.log(`Direct match for starting timer: "${timerName}"`);
        
        // Try to start the timer with various name formats
        console.log(`Publishing event timer:request:start:byName with name: "${timerName}"`);
        this.eventBus.publish('timer:request:start:byName', { name: timerName });
        
        // Try with just the first word (common case for misinterpreted words)
        const firstWord = timerName.split(' ')[0];
        if (firstWord && firstWord !== timerName) {
          console.log(`Also trying with just first word: "${firstWord}"`);
          this.eventBus.publish('timer:request:start:byName', { name: firstWord });
        }
        
        // Also try with "timer" appended if it's not already there
        if (!timerName.toLowerCase().endsWith('timer')) {
          const nameWithTimer = `${timerName} timer`;
          console.log(`Also trying with 'timer' appended: "${nameWithTimer}"`);
          this.eventBus.publish('timer:request:start:byName', { name: nameWithTimer });
        }
        
        // Log all available timers for debugging
        this._logAvailableTimers();
        
        return true;
      }
      
      // 2. Pausing a timer
      const pauseTimerMatch = cleanCommand.match(/(pause|stop)\s+(?:the\s+)?(.+?)(?:\s+timer)?/i);
      if (pauseTimerMatch) {
        const timerName = pauseTimerMatch[2];
        console.log(`Direct match for pausing timer: "${timerName}"`);
        
        // Try to pause the timer with various name formats
        console.log(`Publishing event timer:request:pause:byName with name: "${timerName}"`);
        this.eventBus.publish('timer:request:pause:byName', { name: timerName });
        
        // Try with just the first word
        const firstWord = timerName.split(' ')[0];
        if (firstWord && firstWord !== timerName) {
          console.log(`Also trying with just first word: "${firstWord}"`);
          this.eventBus.publish('timer:request:pause:byName', { name: firstWord });
        }
        
        // Also try with "timer" appended
        if (!timerName.toLowerCase().endsWith('timer')) {
          const nameWithTimer = `${timerName} timer`;
          console.log(`Also trying with 'timer' appended: "${nameWithTimer}"`);
          this.eventBus.publish('timer:request:pause:byName', { name: nameWithTimer });
        }
        
        // Log all available timers for debugging
        this._logAvailableTimers();
        
        return true;
      }
      
      // 3. Resetting a timer
      const resetTimerMatch = cleanCommand.match(/(reset|restart)\s+(?:the\s+)?(.+?)(?:\s+timer)?/i);
      if (resetTimerMatch) {
        const timerName = resetTimerMatch[2];
        console.log(`Direct match for resetting timer: "${timerName}"`);
        
        // Try to reset the timer with various name formats
        console.log(`Publishing event timer:request:reset:byName with name: "${timerName}"`);
        this.eventBus.publish('timer:request:reset:byName', { name: timerName });
        
        // Try with just the first word
        const firstWord = timerName.split(' ')[0];
        if (firstWord && firstWord !== timerName) {
          console.log(`Also trying with just first word: "${firstWord}"`);
          this.eventBus.publish('timer:request:reset:byName', { name: firstWord });
        }
        
        // Also try with "timer" appended
        if (!timerName.toLowerCase().endsWith('timer')) {
          const nameWithTimer = `${timerName} timer`;
          console.log(`Also trying with 'timer' appended: "${nameWithTimer}"`);
          this.eventBus.publish('timer:request:reset:byName', { name: nameWithTimer });
        }
        
        // Log all available timers for debugging
        this._logAvailableTimers();
        
        return true;
      }
      
      // 4. Closing/removing a timer
      const closeTimerMatch = cleanCommand.match(/(close|cancel|clear|remove)\s+(?:the\s+)?(.+?)(?:\s+timer)?/i);
      if (closeTimerMatch) {
        const timerName = closeTimerMatch[2];
        console.log(`Direct match for closing timer: "${timerName}"`);
        
        // Try to close the timer with various name formats
        console.log(`Publishing event timer:request:remove:byName with name: "${timerName}"`);
        this.eventBus.publish('timer:request:remove:byName', { name: timerName });
        
        // Try with just the first word
        const firstWord = timerName.split(' ')[0];
        if (firstWord && firstWord !== timerName) {
          console.log(`Also trying with just first word: "${firstWord}"`);
          this.eventBus.publish('timer:request:remove:byName', { name: firstWord });
        }
        
        // Also try with "timer" appended
        if (!timerName.toLowerCase().endsWith('timer')) {
          const nameWithTimer = `${timerName} timer`;
          console.log(`Also trying with 'timer' appended: "${nameWithTimer}"`);
          this.eventBus.publish('timer:request:remove:byName', { name: nameWithTimer });
        }
        
        // Log all available timers for debugging
        this._logAvailableTimers();
        
        return true;
      }
      
      // Handle general "start timer" command (without specific name)
      if (cleanCommand.match(/^start\s+timer$/i)) {
        console.log('Generic "start timer" command detected - starting all inactive timers');
        this.eventBus.publish('timer:request:start:all', null);
        this._logAvailableTimers();
        return true;
      }
      
      // Try direct timer extraction using timer-utils
      const duration = extractDuration(cleanCommand);
      if (duration > 0) {
        const label = createTimerLabel(cleanCommand);
        console.log(`Extracted duration ${duration}s, creating timer with label: "${label}"`);
        this.eventBus.publish('timer:request:create', {
          name: label,
          duration: duration,
          autoStart: true,
          metadata: {
            stepText: cleanCommand,
            matchIndex: 0
          }
        });
        return true;
      }
      
      // Try to match against patterns
      for (const pattern of this.commandPatterns) {
        for (const regex of pattern.patterns) {
          const matches = cleanCommand.match(regex);
          if (matches) {
            console.log(`Timer command matched pattern: ${regex}`);
            pattern.action(matches);
            return true;
          }
        }
      }
      
      console.log('No timer command pattern matched');
      return false;
    }
  };
}

export default createTimerCommandInterface; 