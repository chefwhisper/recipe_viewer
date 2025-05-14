const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const config = {
  basePath: '/recipe_viewer/',  // Base path for GitHub Pages
  distFolder: 'dist',           // Production build folder
  ghPagesBranch: 'gh-pages',    // Branch for GitHub Pages
};

// Ensure dist folder exists
if (!fs.existsSync(config.distFolder)) {
  console.error(`Error: ${config.distFolder} folder does not exist. Run 'npm run build' first.`);
  process.exit(1);
}

// Create .nojekyll file to prevent GitHub from ignoring files that begin with an underscore
fs.writeFileSync(path.join(config.distFolder, '.nojekyll'), '');

// Create script to modify paths for GitHub Pages
console.log('Deploying to GitHub Pages...');

try {
  // Save the dist folder
  execSync('mv dist dist_temp', { stdio: 'inherit' });
  
  // Checkout gh-pages branch
  execSync('git checkout gh-pages', { stdio: 'inherit' });

  // Remove previous files
  execSync('git rm -rf .', { stdio: 'inherit' });

  // Copy dist folder contents to root
  execSync('mv ../dist_temp/* .', { stdio: 'inherit' });
  
  // Copy .nojekyll file
  execSync('mv ../dist_temp/.nojekyll .', { stdio: 'inherit' });

  // Add all files
  execSync('git add -A', { stdio: 'inherit' });

  // Commit changes
  execSync('git commit -m "Deploy to GitHub Pages"', { stdio: 'inherit' });

  // Push to GitHub
  execSync('git push origin gh-pages', { stdio: 'inherit' });

  // Switch back to main branch
  execSync('git checkout main', { stdio: 'inherit' });

  console.log('Deployment to GitHub Pages complete!');

} catch (error) {
  console.error(`Deployment failed: ${error.message}`);
  // Try to switch back to main branch
  try {
    execSync('git checkout main', { stdio: 'inherit' });
    // If dist_temp still exists, restore it
    if (fs.existsSync('dist_temp')) {
      execSync('mv dist_temp dist', { stdio: 'inherit' });
    }
  } catch (e) {
    console.error('Failed to switch back to main branch or restore dist folder.');
  }
  process.exit(1);
} 