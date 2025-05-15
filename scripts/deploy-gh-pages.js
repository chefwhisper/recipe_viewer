#!/usr/bin/env node

/**
 * GitHub Pages deployment script using gh-pages package
 */

const ghpages = require('gh-pages');
const path = require('path');
const fs = require('fs');

// Configuration
const distFolder = 'dist';
const publishOptions = {
  branch: 'gh-pages',
  message: 'Auto-generated deployment to GitHub Pages',
  dotfiles: true // Include .nojekyll file
};

// Ensure dist folder exists
if (!fs.existsSync(distFolder)) {
  console.error(`Error: ${distFolder} folder does not exist. Run 'npm run build' first.`);
  process.exit(1);
}

// Ensure .nojekyll file exists
if (!fs.existsSync(path.join(distFolder, '.nojekyll'))) {
  fs.writeFileSync(path.join(distFolder, '.nojekyll'), '');
  console.log('Created .nojekyll file');
}

console.log('Publishing to GitHub Pages...');
ghpages.publish(distFolder, publishOptions, (err) => {
  if (err) {
    console.error(`Deployment failed: ${err}`);
    process.exit(1);
  } else {
    console.log('Successfully deployed to GitHub Pages!');
  }
}); 