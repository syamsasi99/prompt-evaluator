/**
 * Load environment variables from .env file
 * This module MUST be imported before any other modules
 */
import dotenv from 'dotenv';
import path from 'path';
import { app } from 'electron';

// Try to load .env from multiple locations in order of priority:
// 1. User data directory (production location)
// 2. Current working directory (development)
// 3. Current directory as fallback

let envLoaded = false;

// Priority 1: User data directory - /Users/username/Library/Application Support/prompt-evaluator/.env
try {
  const userDataPath = app.getPath('userData');
  const userDataEnvPath = path.join(userDataPath, '.env');
  const result = dotenv.config({ path: userDataEnvPath });
  if (!result.error) {
    console.log('✓ Loaded .env from user data directory:', userDataEnvPath);
    envLoaded = true;
  }
} catch (error) {
  // App might not be ready yet, continue to fallbacks
}

// Priority 2: Project root (development)
if (!envLoaded) {
  const cwdEnvPath = path.join(process.cwd(), '.env');
  const result = dotenv.config({ path: cwdEnvPath });
  if (!result.error) {
    console.log('✓ Loaded .env from project directory:', cwdEnvPath);
    envLoaded = true;
  }
}

// Priority 3: Current directory fallback
if (!envLoaded) {
  dotenv.config();
}

export { envLoaded };
