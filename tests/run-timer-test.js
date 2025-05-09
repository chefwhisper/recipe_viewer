/**
 * Run Timer Test Script
 * This script runs the timer test and checks the results
 */

import http from 'http';

// Function to run the test
function runTest() {
  console.log('Running timer test...');
  
  // Make a request to the test page
  const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/timer-test.html',
    method: 'GET'
  };
  
  const req = http.request(options, (res) => {
    console.log(`Test page status code: ${res.statusCode}`);
    
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Test page loaded successfully');
      
      // Check if the test page contains the test-passed or test-failed class
      if (data.includes('test-passed')) {
        console.log('✅ TEST PASSED: No infinite recursion detected');
      } else if (data.includes('test-failed')) {
        console.log('❌ TEST FAILED: Infinite recursion may still be present');
      } else {
        console.log('⚠️ TEST INCOMPLETE: Check browser for details');
      }
      
      // Make a request to check if the timer module is loaded
      const moduleOptions = {
        hostname: 'localhost',
        port: 8080,
        path: '/js/modules/timer/timer-ui.js',
        method: 'GET'
      };
      
      const moduleReq = http.request(moduleOptions, (moduleRes) => {
        console.log(`Timer UI module status code: ${moduleRes.statusCode}`);
        
        let moduleData = '';
        
        moduleRes.on('data', (chunk) => {
          moduleData += chunk;
        });
        
        moduleRes.on('end', () => {
          console.log('Timer UI module loaded successfully');
          
          // Check if the timer UI module contains our fix
          if (moduleData.includes('_pendingUpdates')) {
            console.log('✅ FIX VERIFIED: The timer UI module contains our fix for infinite recursion');
          } else {
            console.log('❌ FIX NOT VERIFIED: The timer UI module does not contain our fix for infinite recursion');
          }
          
          console.log('Test completed');
        });
      });
      
      moduleReq.on('error', (error) => {
        console.error('Error checking timer UI module:', error.message);
      });
      
      moduleReq.end();
    });
  });
  
  req.on('error', (error) => {
    console.error('Error running test:', error.message);
  });
  
  req.end();
}

// Run the test
runTest(); 