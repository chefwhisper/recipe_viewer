const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure dist folder exists
if (!fs.existsSync('dist')) {
  console.error('Error: dist folder does not exist. Run npm run build first.');
  process.exit(1);
}

// Create .nojekyll file
fs.writeFileSync(path.join('dist', '.nojekyll'), '');

try {
  // Create a temporary directory for the dist folder
  execSync('rm -rf temp_deploy || true');
  execSync('mkdir -p temp_deploy');
  
  // Copy the dist folder to the temporary directory
  execSync('cp -r dist/* dist/.nojekyll temp_deploy');
  
  // Save current branch
  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  
  // Checkout gh-pages branch or create it if it doesn't exist
  try {
    execSync('git checkout gh-pages');
  } catch (error) {
    execSync('git checkout -b gh-pages');
  }
  
  // Clean the branch
  execSync('git rm -rf .', { stdio: 'pipe' });
  
  // Copy contents from temporary directory
  execSync('cp -r temp_deploy/* temp_deploy/.nojekyll .');
  
  // Commit and push
  execSync('git add -A');
  execSync('git commit -m "Deploy to GitHub Pages"');
  execSync('git push origin gh-pages --force');
  
  // Switch back to the original branch
  execSync(`git checkout ${currentBranch}`);
  
  // Clean up
  execSync('rm -rf temp_deploy');
  
  console.log('Successfully deployed to GitHub Pages!');
} catch (error) {
  console.error(`Deployment failed: ${error.message}`);
  process.exit(1);
} 