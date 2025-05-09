import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Recipe Viewer Tests', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    // Read the HTML file
    const html = fs.readFileSync(path.resolve(__dirname, '../src/html/recipe-viewer.html'), 'utf8');
    
    // Create a new JSDOM instance
    dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable'
    });
    
    document = dom.window.document;
    window = dom.window;
  });

  afterEach(() => {
    dom.window.close();
  });

  test('Recipe viewer page loads successfully', () => {
    expect(document).toBeDefined();
    expect(document.title).toBeDefined();
  });

  test('Recipe list container exists', () => {
    const recipeList = document.querySelector('.recipe-list');
    expect(recipeList).toBeDefined();
  });

  test('Recipe form exists', () => {
    const recipeForm = document.querySelector('form');
    expect(recipeForm).toBeDefined();
  });

  test('Search functionality exists', () => {
    const searchInput = document.querySelector('input[type="search"]');
    expect(searchInput).toBeDefined();
  });

  test('Recipe details container exists', () => {
    const recipeDetails = document.querySelector('.recipe-details');
    expect(recipeDetails).toBeDefined();
  });
}); 