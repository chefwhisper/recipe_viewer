#!/usr/bin/env node

/**
 * Simple GitHub Pages deployment script
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const distFolder = 'dist';
const ghPagesBranch = 'gh-pages';

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

// Get the current branch
const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
console.log(`Current branch: ${currentBranch}`);

try {
  // Create a temporary branch for deployment
  const tempBranch = `temp-deploy-${Date.now()}`;
  console.log(`Creating temporary branch: ${tempBranch}`);
  execSync(`git checkout -b ${tempBranch}`);

  // Add dist folder to git
  console.log('Adding dist folder to git');
  execSync('git add -f dist');

  // Commit
  console.log('Committing changes');
  execSync('git commit -m "Deploy to GitHub Pages"');

  // Check if gh-pages branch exists
  let branchExists = false;
  try {
    execSync('git rev-parse --verify gh-pages');
    branchExists = true;
  } catch (error) {
    branchExists = false;
  }

  if (branchExists) {
    // Delete the existing gh-pages branch
    console.log('Deleting existing gh-pages branch');
    execSync('git push origin --delete gh-pages');
  }

  // Create a new gh-pages branch with only the dist content
  console.log(`Creating new ${ghPagesBranch} branch with dist content`);
  execSync(`git subtree split --prefix dist -b ${ghPagesBranch}`);
  execSync(`git push -f origin ${ghPagesBranch}:${ghPagesBranch}`);

  // Clean up
  console.log('Cleaning up');
  execSync(`git checkout ${currentBranch}`);
  execSync(`git branch -D ${tempBranch}`);
  execSync(`git branch -D ${ghPagesBranch}`);

  console.log('Deployment completed successfully!');
} catch (error) {
  console.error(`Deployment failed: ${error.message}`);

  // Try to restore the original branch
  try {
    execSync(`git checkout ${currentBranch}`);
  } catch (e) {
    console.error('Failed to restore original branch');
  }

  process.exit(1);
} 