/**
 * Timer Class
 * Base implementation of a timer object
 */
import { formatTimeMMSS } from '../utils/common.js';

export class Timer {
    constructor({ id, name, duration, onComplete, metadata = {} }) {
        this.id = id;
        this.name = name;
        this.duration = duration;
        this.remaining = duration;
        this.interval = null;
        this._isRunning = false;
        this.status = 'idle';
        this.startTime = null;
        this.pauseTime = null;
        this.completion = 0;
        this.createTime = new Date();
        this.metadata = metadata;
        this.onComplete = onComplete;
    }

    /**
     * Start the timer
     */
    start() {
        console.log(`Timer.start() called for timer: ${this.id} (${this.name})`);
        
        if (this._isRunning) {
            console.log(`Timer ${this.id} already running, ignoring start call`);
            return;
        }

        console.log(`Setting timer ${this.id} to running state`);
        this._isRunning = true;
        this.status = 'running';
        this.startTime = new Date();

        console.log(`Setting interval for timer ${this.id}`);
        
        // Clear any existing interval first to avoid duplicates
        if (this.interval) {
            console.log(`Clearing existing interval for timer ${this.id}`);
            clearInterval(this.interval);
        }
        
        this.interval = setInterval(() => {
            this.remaining--;
            this.completion = ((this.duration - this.remaining) / this.duration) * 100;
            
            // Debug logging for timer tick
            if (this.remaining % 10 === 0 || this.remaining <= 5) {
                console.log(`Timer ${this.id} tick: ${this.remaining}s remaining`);
            }

            if (this.remaining <= 0) {
                console.log(`Timer ${this.id} completed via interval`);
                this.complete();
            }
        }, 1000);
        
        console.log(`Timer ${this.id} started successfully`);
    }

    /**
     * Pause the timer
     */
    pause() {
        if (!this._isRunning) return;

        this._isRunning = false;
        this.status = 'paused';
        this.pauseTime = new Date();
        clearInterval(this.interval);
    }

    /**
     * Reset the timer
     */
    reset() {
        this.pause();
        this.remaining = this.duration;
        this.status = 'idle';
        this.startTime = null;
        this.pauseTime = null;
        this.completion = 0;
    }

    /**
     * Complete the timer
     */
    complete() {
        this.pause();
        this.status = 'completed';
        this.remaining = 0;
        this.completion = 100;
        
        if (this.onComplete) {
            this.onComplete();
        }
    }

    /**
     * Get the remaining time in seconds
     * @returns {number} - Remaining time in seconds
     */
    getRemainingTime() {
        return this.remaining;
    }
    
    /**
     * Get formatted remaining time (MM:SS)
     * @returns {string} - Formatted time string
     */
    getFormattedTime() {
        return formatTimeMMSS(this.remaining);
    }

    /**
     * Get the timer status
     * @returns {string} - Timer status
     */
    getStatus() {
        return this.status;
    }

    /**
     * Get the timer completion percentage
     * @returns {number} - Completion percentage
     */
    getCompletion() {
        return this.completion;
    }

    /**
     * Get the timer metadata
     * @returns {Object} - Timer metadata
     */
    getMetadata() {
        return this.metadata;
    }

    /**
     * Add metadata to the timer
     * @param {Object} metadata - Metadata to add
     */
    addMetadata(metadata) {
        this.metadata = { ...this.metadata, ...metadata };
    }

    /**
     * Rename the timer
     * @param {string} name - New name
     */
    rename(name) {
        this.name = name;
    }

    /**
     * Clean up the timer
     */
    cleanup() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }
    
    /**
     * Check if timer is complete
     */
    get isComplete() {
        return this.status === 'completed';
    }
    
    /**
     * Check if timer is running
     */
    get isRunning() {
        return this._isRunning;
    }
    
    /**
     * Check if timer is paused
     */
    get isPaused() {
        return this.status === 'paused';
    }
    
    /**
     * Get the remaining time (for display purposes)
     */
    get remainingTime() {
        return this.remaining;
    }
} 