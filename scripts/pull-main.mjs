import { execSync } from 'child_process';

console.log('[v0] Fetching latest changes from remote...');
try {
  execSync('git fetch origin main', { cwd: process.cwd(), stdio: 'inherit' });
  
  console.log('[v0] Current branch:');
  execSync('git branch -v', { cwd: process.cwd(), stdio: 'inherit' });
  
  console.log('[v0] Pulling changes from main...');
  execSync('git pull origin main', { cwd: process.cwd(), stdio: 'inherit' });
  
  console.log('[v0] Pull completed successfully');
  execSync('git log --oneline -5', { cwd: process.cwd(), stdio: 'inherit' });
} catch (error) {
  console.error('[v0] Error pulling changes:', error.message);
  process.exit(1);
}
