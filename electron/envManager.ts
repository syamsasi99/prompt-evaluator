import { app, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';

const DEFAULT_ENV_CONTENT = `# Prompt Evaluator Environment Variables
#
# Add your API keys here. Get free API keys from:
# - Gemini: https://makersuite.google.com/app/apikey
# - OpenAI: https://platform.openai.com/api-keys
# - Anthropic: https://console.anthropic.com/settings/keys
#
# After updating this file, changes will be applied automatically!

# Google Gemini API (Recommended - Free and easy to set up)
GEMINI_API_KEY=

# OpenAI API
OPENAI_API_KEY=

# Anthropic Claude API
ANTHROPIC_API_KEY=

# Other providers (optional)
# MISTRAL_API_KEY=
# COHERE_API_KEY=
# GROQ_API_KEY=
# XAI_API_KEY=
`;

let envWatcher: chokidar.FSWatcher | null = null;

/**
 * Get the path to the .env file in userData directory
 */
export function getEnvFilePath(): string {
  return path.join(app.getPath('userData'), '.env');
}

/**
 * Create .env file with default placeholder keys if it doesn't exist
 */
export function ensureEnvFile(): void {
  const envPath = getEnvFilePath();

  if (!fs.existsSync(envPath)) {
    console.log('Creating .env file with placeholder keys at:', envPath);
    fs.writeFileSync(envPath, DEFAULT_ENV_CONTENT, 'utf-8');
    console.log('.env file created successfully');
  } else {
    console.log('.env file already exists at:', envPath);
  }
}

/**
 * Load environment variables from .env file
 */
export function loadEnvVariables(): void {
  const dotenv = require('dotenv');
  const envPath = getEnvFilePath();

  // Load from userData directory
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('Loaded environment variables from:', envPath);
  }

  // Also try current working directory as fallback
  dotenv.config({ path: path.join(process.cwd(), '.env') });
  dotenv.config();

  // Log loaded keys (without showing actual values)
  console.log('Environment variables status:');
  console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✓ Set' : '✗ Not set');
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Not set');
  console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✓ Set' : '✗ Not set');
}

/**
 * Start watching .env file for changes and reload automatically
 */
export function watchEnvFile(): void {
  const envPath = getEnvFilePath();

  // Stop existing watcher if any
  if (envWatcher) {
    envWatcher.close();
  }

  console.log('Starting .env file watcher at:', envPath);

  // Watch for changes
  envWatcher = chokidar.watch(envPath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  });

  envWatcher.on('change', () => {
    console.log('.env file changed, reloading environment variables...');

    // Clear existing environment variables
    const keysToReload = [
      'GEMINI_API_KEY',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'MISTRAL_API_KEY',
      'COHERE_API_KEY',
      'GROQ_API_KEY',
      'XAI_API_KEY',
      'HUGGINGFACE_API_KEY',
      'REPLICATE_API_TOKEN',
      'DEEPSEEK_API_KEY',
      'OPENROUTER_API_KEY',
      'TOGETHER_API_KEY',
      'FIREWORKS_API_KEY',
      'CLOUDFLARE_API_KEY',
      'ANYSCALE_API_KEY',
      'AZURE_OPENAI_API_KEY',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'GOOGLE_APPLICATION_CREDENTIALS'
    ];

    keysToReload.forEach(key => {
      delete process.env[key];
    });

    // Reload environment variables
    loadEnvVariables();

    // Notify renderer process
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      window.webContents.send('env:reloaded', {
        timestamp: Date.now(),
        keys: keysToReload.filter(key => process.env[key])
      });
    });

    console.log('Environment variables reloaded successfully');
  });

  envWatcher.on('error', (error) => {
    console.error('Error watching .env file:', error);
  });
}

/**
 * Stop watching .env file
 */
export function stopWatchingEnvFile(): void {
  if (envWatcher) {
    envWatcher.close();
    envWatcher = null;
    console.log('.env file watcher stopped');
  }
}

/**
 * Update or add an API key to the .env file
 */
export function updateEnvApiKey(envVarName: string, apiKey: string): { success: boolean; error?: string; envPath?: string } {
  try {
    const envPath = getEnvFilePath();

    // Ensure .env file exists
    ensureEnvFile();

    // Read current content
    let content = fs.readFileSync(envPath, 'utf-8');

    // Check if the key already exists
    const keyPattern = new RegExp(`^${envVarName}=.*$`, 'm');

    if (keyPattern.test(content)) {
      // Update existing key
      content = content.replace(keyPattern, `${envVarName}=${apiKey}`);
      console.log(`Updated ${envVarName} in .env file`);
    } else {
      // Add new key at the end
      if (!content.endsWith('\n')) {
        content += '\n';
      }
      content += `\n# Added by API key validation\n${envVarName}=${apiKey}\n`;
      console.log(`Added ${envVarName} to .env file`);
    }

    // Write back to file
    fs.writeFileSync(envPath, content, 'utf-8');

    // Reload environment variables
    loadEnvVariables();

    return { success: true, envPath };
  } catch (error: any) {
    console.error('Error updating .env file:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initialize environment management
 */
export function initializeEnvManager(): void {
  // Ensure .env file exists with placeholders
  ensureEnvFile();

  // Load environment variables
  loadEnvVariables();

  // Start watching for changes
  watchEnvFile();
}
