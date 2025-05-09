/**
 * Automated timer tests
 * This module tests timer functionality to ensure no duplicates and proper names
 */

import eventBus from '../../core/events/event-bus.js';
import timerModule from './index.js';

/**
 * Run automated tests for timers
 */
export function runTimerTests() {
  console.log('--- RUNNING AUTOMATED TIMER TESTS ---');
  
  // Track all created timers
  const timerIds = new Set();
  const timers = new Map();
  let duplicateFound = false;
  let invalidNameFound = false;
  
  // Display test UI
  createTestUI();
  
  // Test timer creation
  eventBus.subscribe('timer:created', (data) => {
    console.log(`Timer created event received: ${data.timer.id}, name: ${data.timer.name}`);
    
    // Store timer data for analysis
    timers.set(data.timer.id, data.timer);
    
    // Check if this timer ID already exists
    if (timerIds.has(data.timer.id)) {
      console.error(`DUPLICATE TIMER DETECTED: ${data.timer.id}`);
      logTestResult('error', `Duplicate timer detected: ${data.timer.id}`);
      duplicateFound = true;
    } else {
      timerIds.add(data.timer.id);
      console.log(`Added timer ${data.timer.id} to tracking list`);
      logTestResult('info', `Timer created: ${data.timer.name} (${data.timer.id})`);
    }
    
    // Check if timer name is valid
    if (!data.timer.name || data.timer.name === 'Timer' || data.timer.name === 'undefined') {
      console.error(`INVALID TIMER NAME: "${data.timer.name}" for timer ${data.timer.id}`);
      logTestResult('error', `Invalid timer name: "${data.timer.name}" for timer ${data.timer.id}`);
      invalidNameFound = true;
    } else {
      console.log(`Timer name verified: "${data.timer.name}"`);
      logTestResult('success', `Timer name verified: "${data.timer.name}"`);
    }
  });
  
  // Check for step highlighting
  setTimeout(() => {
    const stepIndicators = document.querySelectorAll('.timer-step-indicator');
    const currentStepId = document.body.dataset.currentStepId;
    
    if (!currentStepId) {
      logTestResult('error', 'Current step ID not set on document.body');
    } else {
      logTestResult('info', `Current step ID: ${currentStepId}`);
    }
    
    if (stepIndicators.length === 0) {
      logTestResult('error', 'No step indicators found');
    } else {
      const currentIndicators = document.querySelectorAll('.timer-step-indicator.current');
      logTestResult('info', `Found ${stepIndicators.length} step indicators, ${currentIndicators.length} are marked as current`);
    }
  }, 2000);
  
  // Report test results after a delay
  setTimeout(() => {
    console.log('--- TIMER TEST RESULTS ---');
    console.log(`Total timers created: ${timerIds.size}`);
    
    logTestResult('heading', `Timer Test Results`);
    logTestResult('info', `Total timers created: ${timerIds.size}`);
    
    if (duplicateFound) {
      console.error('TEST FAILED: Duplicate timers detected');
      logTestResult('error', 'TEST FAILED: Duplicate timers detected');
    } else {
      console.log('TEST PASSED: No duplicate timers detected');
      logTestResult('success', 'TEST PASSED: No duplicate timers detected');
    }
    
    if (invalidNameFound) {
      console.error('TEST FAILED: Invalid timer names detected');
      logTestResult('error', 'TEST FAILED: Invalid timer names detected');
    } else {
      console.log('TEST PASSED: All timer names are valid');
      logTestResult('success', 'TEST PASSED: All timer names are valid');
    }
    
    console.log('--- END TIMER TESTS ---');
  }, 5000);
}

/**
 * Create a UI for displaying test results
 */
function createTestUI() {
  // Create test results container
  const container = document.createElement('div');
  container.id = 'timer-test-results';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.width = '400px';
  container.style.maxHeight = '300px';
  container.style.overflowY = 'auto';
  container.style.backgroundColor = 'rgba(245, 245, 245, 0.95)';
  container.style.border = '1px solid #ccc';
  container.style.borderRadius = '5px';
  container.style.padding = '10px';
  container.style.zIndex = '1000';
  container.style.fontFamily = 'monospace';
  container.style.fontSize = '12px';
  
  // Add heading
  const heading = document.createElement('h3');
  heading.textContent = 'Timer Tests';
  heading.style.margin = '0 0 10px 0';
  heading.style.padding = '0 0 5px 0';
  heading.style.borderBottom = '1px solid #ccc';
  container.appendChild(heading);
  
  // Add results list
  const results = document.createElement('div');
  results.id = 'timer-test-logs';
  container.appendChild(results);
  
  // Add to body
  document.body.appendChild(container);
}

/**
 * Log a test result to the UI
 * @param {string} type - Type of log (info, success, error, heading)
 * @param {string} message - Message to log
 */
function logTestResult(type, message) {
  const resultsContainer = document.getElementById('timer-test-logs');
  if (!resultsContainer) return;
  
  const log = document.createElement('div');
  log.style.marginBottom = '5px';
  log.style.padding = '5px';
  log.style.borderRadius = '3px';
  
  switch (type) {
    case 'info':
      log.style.backgroundColor = '#f0f0f0';
      break;
    case 'success':
      log.style.backgroundColor = '#dff0d8';
      log.style.color = '#3c763d';
      break;
    case 'error':
      log.style.backgroundColor = '#f2dede';
      log.style.color = '#a94442';
      break;
    case 'heading':
      log.style.fontWeight = 'bold';
      log.style.borderBottom = '1px solid #ccc';
      log.style.paddingBottom = '5px';
      break;
  }
  
  log.textContent = message;
  resultsContainer.appendChild(log);
  resultsContainer.scrollTop = resultsContainer.scrollHeight;
}

// Export the test function
export default {
  runTimerTests
}; 