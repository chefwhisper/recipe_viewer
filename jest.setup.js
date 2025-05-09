// Add any global Jest setup here
// Import Jest functions from globals
import { jest } from '@jest/globals';

global.jest = jest;

// Mock Web Speech API if not available
if (!global.SpeechRecognition) {
  global.SpeechRecognition = jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
}

if (!global.webkitSpeechRecognition) {
  global.webkitSpeechRecognition = global.SpeechRecognition;
}

// Mock speechSynthesis if not available
if (!global.speechSynthesis) {
  global.speechSynthesis = {
    speak: jest.fn(),
    cancel: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    getVoices: jest.fn().mockReturnValue([]),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
}

// Mock SpeechSynthesisUtterance if not available
if (!global.SpeechSynthesisUtterance) {
  global.SpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
    text,
    voice: null,
    rate: 1,
    pitch: 1,
    volume: 1,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Mock console methods to keep test output clean
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Global test timeout
jest.setTimeout(30000);

// Add TextEncoder and TextDecoder to global scope
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder; 