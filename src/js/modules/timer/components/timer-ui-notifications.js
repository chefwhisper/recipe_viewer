/**
 * Timer UI Notifications Component
 * Handles sounds and browser notifications for timers
 */

/**
 * Create timer notifications module
 * @returns {Object} Timer notifications interface
 */
export function createTimerNotifications() {
  return {
    /**
     * Play timer complete sound
     */
    playTimerCompleteSound() {
      try {
        console.log('Attempting to play timer complete sound');
        // Track if we're using fallback
        let usingFallback = false;
        
        // Try to play the sound file first - use absolute path to ensure it's found
        try {
          // Use a simple beep that works in all browsers
          const audio = new Audio();
          
          // Try to load the actual file, but be ready to use the fallback
          audio.src = '/assets/sounds/timer_completed.mp3';
          audio.volume = 0.5;
          
          console.log('Loading audio file from:', audio.src);
          
          // Set a timeout to prevent hanging if the file doesn't load
          const timeoutId = setTimeout(() => {
            console.warn('Audio file load timeout, using fallback sound');
            this._playFallbackSound();
            usingFallback = true;
          }, 2000);
          
          // Add event listeners
          audio.addEventListener('canplaythrough', () => {
            clearTimeout(timeoutId);
            if (!usingFallback) {
              console.log('Timer sound loaded, playing...');
              audio.play().catch(err => {
                console.warn('Error playing timer complete sound:', err);
                this._playFallbackSound();
              });
            }
          });
          
          audio.addEventListener('error', (e) => {
            clearTimeout(timeoutId);
            console.warn('Error loading timer sound file, using fallback', e);
            this._playFallbackSound();
          });
          
          // Start loading the audio
          audio.load();
        } catch (err) {
          console.warn('Error creating Audio object:', err);
          this._playFallbackSound();
        }
      } catch (error) {
        console.error('Critical error in timer sound system:', error);
        // Don't attempt to play anything else if we hit a critical error
      }
    },
    
    /**
     * Play a simple beep as fallback when audio file can't be loaded
     * @private
     */
    _playFallbackSound() {
      try {
        console.log('Playing fallback beep sound');
        
        // Create an audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create an oscillator (beep sound generator)
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Configure the oscillator
        oscillator.type = 'sine'; // Sine wave - smooth sound
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz - pleasant beep
        
        // Configure the gain (volume)
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Start at 10% volume
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1); // Fade out
        
        // Connect the nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Play the beep for 1 second
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 1);
        
        console.log('Fallback beep started');
      } catch (error) {
        console.warn('Unable to create fallback sound:', error);
        // No more fallbacks to try
      }
    },

    /**
     * Show timer completion notification
     * @param {Object} timer - Timer object
     */
    showTimerNotification(timer) {
      try {
        if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification('Timer Complete', {
              body: `${timer.name} timer is done!`,
              // Don't specify an icon to use browser default
              tag: 'timer-notification',
              renotify: true
            });
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                this.showTimerNotification(timer);
              }
            });
          }
        }
      } catch (error) {
        console.error('Error showing timer notification:', error);
      }
    },

    /**
     * Handle timer completion
     * @param {Object} timer - Timer object
     */
    handleTimerComplete(timer) {
      this.playTimerCompleteSound();
      this.showTimerNotification(timer);
    }
  };
}

export default createTimerNotifications;