import { ipcMain, dialog, BrowserWindow, app, shell } from 'electron';
import { z } from 'zod';
import fs from 'fs/promises';
import * as fsSync from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { getTempDir, isWindows } from './env';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEnvFilePath, updateEnvApiKey } from './envManager';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Project metadata types (duplicated here to avoid import issues)
interface ProjectMetadata {
  id: string;
  name: string;
  filePath: string;
  lastOpened: string;
  lastModified: string;
  favorite: boolean;
  provider?: string;
  evalCount: number;
}

interface MetadataStore {
  recentProjects: ProjectMetadata[];
  settings: {
    autoSave: boolean;
    autoSaveInterval: number;
    maxRecentProjects: number;
    defaultProjectPath: string;
  };
}

// Store running processes by runId
const runningProcesses = new Map<string, ChildProcess>();


// Regex patterns for detecting API keys
const API_KEY_PATTERNS = [
  /sk-[a-zA-Z0-9]{48}/g, // OpenAI keys
  /sk-ant-[a-zA-Z0-9\-]{95,}/g, // Anthropic keys
  /AIza[a-zA-Z0-9_\-]{35}/g, // Google API keys
  /ya29\.[a-zA-Z0-9_\-]+/g, // Google OAuth tokens
  /[a-zA-Z0-9]{32,}/g, // Generic long strings that might be keys
];

// Sanitize logs to remove API keys
function sanitizeLog(text: string): string {
  let sanitized = text;

  // Replace all API key patterns with [REDACTED]
  API_KEY_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[API_KEY_REDACTED]');
  });

  // Also redact common environment variable patterns
  sanitized = sanitized.replace(/OPENAI_API_KEY=.+/gi, 'OPENAI_API_KEY=[REDACTED]');
  sanitized = sanitized.replace(/ANTHROPIC_API_KEY=.+/gi, 'ANTHROPIC_API_KEY=[REDACTED]');
  sanitized = sanitized.replace(/GEMINI_API_KEY=.+/gi, 'GEMINI_API_KEY=[REDACTED]');
  sanitized = sanitized.replace(/GOOGLE_API_KEY=.+/gi, 'GOOGLE_API_KEY=[REDACTED]');
  sanitized = sanitized.replace(/apiKey['":\s]+['"a-zA-Z0-9\-_]+/gi, 'apiKey: [REDACTED]');

  return sanitized;
}

// Sanitize JSON to remove API keys from objects
function sanitizeJSON(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeLog(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeJSON(item));
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip (don't include) keys that contain sensitive information
      // BUT preserve tokenUsage and similar metrics
      const keyLower = key.toLowerCase();
      const shouldSkip = (
        keyLower === 'apikey' ||
        keyLower === 'api_key' ||
        keyLower === 'secret' ||
        keyLower === 'password' ||
        (keyLower.includes('token') && !keyLower.includes('tokenusage') && !keyLower.includes('tokens'))
      );

      if (!shouldSkip) {
        // Only include non-sensitive keys
        sanitized[key] = sanitizeJSON(value);
      }
      // If shouldSkip is true, we simply don't add the key to sanitized object
    }
    return sanitized;
  }

  return obj;
}

// Universal AI Generation Helper
// Supports Google Gemini, OpenAI, and Anthropic models
async function callAIModel(params: {
  modelId: string;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
}): Promise<{ text: string; error?: string }> {
  const {
    modelId,
    apiKey,
    systemPrompt,
    userPrompt,
    temperature = 0.3,
    maxTokens = 8192,
    responseFormat = 'json',
  } = params;

  const [provider, ...modelParts] = modelId.split(':');
  const modelName = modelParts.join(':');

  try {
    // Google Gemini
    if (provider === 'google' || provider === 'vertex') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: maxTokens,
          responseMimeType: responseFormat === 'json' ? 'application/json' : 'text/plain',
        },
      });

      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      const result = await model.generateContent(fullPrompt);
      let text = result.response.text();

      // Clean up markdown code fences if present
      text = text.trim();
      if (text.startsWith('```json')) {
        text = text.substring(7);
      } else if (text.startsWith('```')) {
        text = text.substring(3);
      }
      if (text.endsWith('```')) {
        text = text.substring(0, text.length - 3);
      }

      return { text: text.trim() };
    }

    // Anthropic Claude
    if (provider === 'anthropic') {
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: modelName,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const textContent = response.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        return { text: '', error: 'No text content in response' };
      }

      return { text: textContent.text };
    }

    // OpenAI
    if (provider === 'openai') {
      const openai = new OpenAI({ apiKey });
      const response = await openai.chat.completions.create({
        model: modelName,
        temperature,
        max_tokens: maxTokens,
        response_format: responseFormat === 'json' ? { type: 'json_object' } : { type: 'text' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      return { text: response.choices[0]?.message?.content || '' };
    }

    return { text: '', error: `Unsupported AI provider: ${provider}` };
  } catch (error: any) {
    console.error(`Error calling ${modelId}:`, error.message);
    return { text: '', error: error.message || 'AI generation failed' };
  }
}

// Validation schemas
const ExportYamlSchema = z.object({
  content: z.string(),
  defaultPath: z.string().optional(),
});

const SaveProjectSchema = z.object({
  project: z.any(),
  defaultPath: z.string().optional(),
});

const RunPromptfooSchema = z.object({
  yamlContent: z.string(),
  runId: z.string(),
});

// Safe path validation to prevent directory traversal
function sanitizePath(filePath: string): string {
  const normalized = path.normalize(filePath);
  if (normalized.includes('..')) {
    throw new Error('Invalid path: directory traversal detected');
  }
  return normalized;
}

// Ensure temp directory exists
async function ensureTempDir(): Promise<string> {
  const tempDir = getTempDir(app);
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

// Calculate costs for Google models based on token usage
// Pricing as of January 2025 (per million tokens)
// Source: https://ai.google.dev/gemini-api/docs/pricing
function calculateGoogleCosts(results: any): void {
  const GOOGLE_PRICING: Record<string, { input: number; output: number }> = {
    'google:gemini-2.5-pro': { input: 1.25, output: 5.00 }, // $1.25 per 1M input, $5.00 per 1M output
    'google:gemini-2.5-flash': { input: 0.075, output: 0.30 }, // $0.075 per 1M input, $0.30 per 1M output
    'google:gemini-2.5-flash-preview-09-2025': { input: 0.075, output: 0.30 },
    'google:gemini-2.0-flash-exp': { input: 0.00, output: 0.00 }, // Free experimental model
    'google:gemini-1.5-pro': { input: 1.25, output: 5.00 },
    'google:gemini-1.5-flash': { input: 0.075, output: 0.30 },
  };

  if (!results || !results.results || !results.results.results) {
    return;
  }

  const testResults = results.results.results;

  for (const result of testResults) {
    // Skip if cost is already calculated and non-zero
    if (result.cost && result.cost > 0) {
      continue;
    }

    // Get provider ID
    const providerId = result.provider?.id || result.provider || '';

    // Check if it's a Google model we have pricing for
    const pricing = GOOGLE_PRICING[providerId];
    if (!pricing) {
      continue;
    }

    // Get token usage
    const tokenUsage = result.response?.tokenUsage;
    if (!tokenUsage) {
      continue;
    }

    const inputTokens = tokenUsage.prompt || 0;
    const outputTokens = tokenUsage.completion || 0;

    // Calculate cost: (tokens / 1,000,000) * price_per_million
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    const totalCost = inputCost + outputCost;

    // Update the result with calculated cost
    result.cost = totalCost;

    console.log(`Calculated cost for ${providerId}: $${totalCost.toFixed(6)} (${inputTokens} input + ${outputTokens} output tokens)`);
  }

  // Also update prompt-level metrics if present
  if (results.results.prompts) {
    for (const prompt of results.results.prompts) {
      const providerId = prompt.provider || prompt.id;
      const pricing = GOOGLE_PRICING[providerId];

      if (pricing && prompt.metrics && prompt.metrics.tokenUsage) {
        const inputTokens = prompt.metrics.tokenUsage.prompt || 0;
        const outputTokens = prompt.metrics.tokenUsage.completion || 0;

        const inputCost = (inputTokens / 1_000_000) * pricing.input;
        const outputCost = (outputTokens / 1_000_000) * pricing.output;
        const totalCost = inputCost + outputCost;

        prompt.metrics.cost = totalCost;
      }
    }
  }
}

// API Key Validation Interface
interface ValidationResult {
  isValid: boolean;
  error?: string;
  message?: string;
}

// Validate API key by making a test API call to the provider
async function validateProviderApiKey(provider: string, apiKey: string, modelName?: string): Promise<ValidationResult> {
  if (!apiKey || apiKey.trim() === '') {
    return { isValid: false, error: 'API key is empty' };
  }

  try {
    switch (provider) {
      case 'openai':
        return await validateOpenAIKey(apiKey);
      case 'anthropic':
        return await validateAnthropicKey(apiKey);
      case 'google':
        return await validateGoogleKey(apiKey, modelName);
      case 'mistral':
        return await validateMistralKey(apiKey);
      case 'cohere':
        return await validateCohereKey(apiKey);
      case 'groq':
        return await validateGroqKey(apiKey);
      case 'perplexity':
        return await validatePerplexityKey(apiKey);
      case 'deepseek':
        return await validateDeepSeekKey(apiKey);
      case 'xai':
        return await validateXAIKey(apiKey);
      case 'openrouter':
        return await validateOpenRouterKey(apiKey);
      case 'huggingface':
        return await validateHuggingFaceKey(apiKey);
      case 'replicate':
        return await validateReplicateKey(apiKey);
      case 'together':
        return await validateTogetherKey(apiKey);
      case 'fireworks':
        return await validateFireworksKey(apiKey);
      case 'anyscale':
        return await validateAnyscaleKey(apiKey);
      case 'cloudflare':
        return await validateCloudflareKey(apiKey);
      case 'ollama':
        return { isValid: true, message: 'Ollama runs locally and does not require an API key' };
      case 'azure':
      case 'bedrock':
      case 'vertex':
        return { isValid: true, message: `${provider} uses service-specific authentication. Please verify credentials in your environment.` };
      default:
        return { isValid: true, message: 'API key format validation not available for this provider' };
    }
  } catch (error: any) {
    return { isValid: false, error: error.message || 'Validation failed' };
  }
}

// OpenAI validation
async function validateOpenAIKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return { isValid: true, message: 'API key is valid' };
    } else if (response.status === 401) {
      return { isValid: false, error: 'Invalid API key - Authentication failed' };
    } else if (response.status === 403) {
      // 403 can mean the key is valid but doesn't have permission for this endpoint
      // Try a simpler validation - if we get 403, the key format is likely correct
      return { isValid: false, error: 'API key authentication succeeded but lacks permission. Please verify your OpenAI API key has the correct permissions.' };
    } else if (response.status === 429) {
      // Rate limit - key is valid but rate limited
      return { isValid: true, message: 'API key is valid (rate limited, but key works)' };
    } else {
      const errorText = await response.text().catch(() => '');
      return { isValid: false, error: `Validation failed with status ${response.status}${errorText ? `: ${errorText}` : ''}` };
    }
  } catch (error: any) {
    return { isValid: false, error: `Network error: ${error.message}` };
  }
}

// Anthropic validation
async function validateAnthropicKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      }),
    });

    if (response.ok || response.status === 400) {
      // 400 is ok because it means the API key is valid but request may have issues
      return { isValid: true, message: 'API key is valid' };
    } else if (response.status === 401) {
      return { isValid: false, error: 'Invalid API key' };
    } else {
      return { isValid: false, error: `Validation failed with status ${response.status}` };
    }
  } catch (error: any) {
    return { isValid: false, error: `Network error: ${error.message}` };
  }
}

// Google validation
async function validateGoogleKey(apiKey: string, modelName?: string): Promise<ValidationResult> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use the exact model specified by the user, or fallback to gemini-1.5-flash
    const modelToTest = modelName || 'gemini-1.5-flash';
    const model = genAI.getGenerativeModel({ model: modelToTest });

    // Try to make a minimal request
    await model.generateContent('test');

    return { isValid: true, message: `API key is valid for ${modelToTest}` };
  } catch (error: any) {
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('invalid') || error.message?.includes('API key not valid')) {
      return { isValid: false, error: 'Invalid API key' };
    }
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return { isValid: false, error: `Model "${modelName}" not found or not accessible with this API key` };
    }
    return { isValid: false, error: error.message || 'Validation failed' };
  }
}

// Mistral validation
async function validateMistralKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.mistral.ai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { isValid: true, message: 'API key is valid' };
    } else if (response.status === 401) {
      return { isValid: false, error: 'Invalid API key' };
    } else {
      return { isValid: false, error: `Validation failed with status ${response.status}` };
    }
  } catch (error: any) {
    return { isValid: false, error: `Network error: ${error.message}` };
  }
}

// Cohere validation
async function validateCohereKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.cohere.ai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { isValid: true, message: 'API key is valid' };
    } else if (response.status === 401) {
      return { isValid: false, error: 'Invalid API key' };
    } else {
      return { isValid: false, error: `Validation failed with status ${response.status}` };
    }
  } catch (error: any) {
    return { isValid: false, error: `Network error: ${error.message}` };
  }
}

// Groq validation
async function validateGroqKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { isValid: true, message: 'API key is valid' };
    } else if (response.status === 401) {
      return { isValid: false, error: 'Invalid API key' };
    } else {
      return { isValid: false, error: `Validation failed with status ${response.status}` };
    }
  } catch (error: any) {
    return { isValid: false, error: `Network error: ${error.message}` };
  }
}

// Perplexity validation
async function validatePerplexityKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      }),
    });

    if (response.ok || response.status === 400) {
      return { isValid: true, message: 'API key is valid' };
    } else if (response.status === 401) {
      return { isValid: false, error: 'Invalid API key' };
    } else {
      return { isValid: false, error: `Validation failed with status ${response.status}` };
    }
  } catch (error: any) {
    return { isValid: false, error: `Network error: ${error.message}` };
  }
}

// DeepSeek validation
async function validateDeepSeekKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.deepseek.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { isValid: true, message: 'API key is valid' };
    } else if (response.status === 401) {
      return { isValid: false, error: 'Invalid API key' };
    } else {
      return { isValid: false, error: `Validation failed with status ${response.status}` };
    }
  } catch (error: any) {
    return { isValid: false, error: `Network error: ${error.message}` };
  }
}

// xAI validation
async function validateXAIKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.x.ai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { isValid: true, message: 'API key is valid' };
    } else if (response.status === 401) {
      return { isValid: false, error: 'Invalid API key' };
    } else {
      return { isValid: false, error: `Validation failed with status ${response.status}` };
    }
  } catch (error: any) {
    return { isValid: false, error: `Network error: ${error.message}` };
  }
}

// OpenRouter validation
async function validateOpenRouterKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { isValid: true, message: 'API key is valid' };
    } else if (response.status === 401) {
      return { isValid: false, error: 'Invalid API key' };
    } else {
      return { isValid: false, error: `Validation failed with status ${response.status}` };
    }
  } catch (error: any) {
    return { isValid: false, error: `Network error: ${error.message}` };
  }
}

// HuggingFace validation
async function validateHuggingFaceKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://huggingface.co/api/whoami-v2', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { isValid: true, message: 'API key is valid' };
    } else if (response.status === 401) {
      return { isValid: false, error: 'Invalid API key' };
    } else {
      return { isValid: false, error: `Validation failed with status ${response.status}` };
    }
  } catch (error: any) {
    return { isValid: false, error: `Network error: ${error.message}` };
  }
}

// Replicate validation
async function validateReplicateKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.replicate.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Token ${apiKey}`,
      },
    });

    if (response.ok) {
      return { isValid: true, message: 'API key is valid' };
    } else if (response.status === 401) {
      return { isValid: false, error: 'Invalid API key' };
    } else {
      return { isValid: false, error: `Validation failed with status ${response.status}` };
    }
  } catch (error: any) {
    return { isValid: false, error: `Network error: ${error.message}` };
  }
}

// Together AI validation
async function validateTogetherKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.together.xyz/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { isValid: true, message: 'API key is valid' };
    } else if (response.status === 401) {
      return { isValid: false, error: 'Invalid API key' };
    } else {
      return { isValid: false, error: `Validation failed with status ${response.status}` };
    }
  } catch (error: any) {
    return { isValid: false, error: `Network error: ${error.message}` };
  }
}

// Fireworks validation
async function validateFireworksKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.fireworks.ai/inference/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { isValid: true, message: 'API key is valid' };
    } else if (response.status === 401) {
      return { isValid: false, error: 'Invalid API key' };
    } else {
      return { isValid: false, error: `Validation failed with status ${response.status}` };
    }
  } catch (error: any) {
    return { isValid: false, error: `Network error: ${error.message}` };
  }
}

// Anyscale validation
async function validateAnyscaleKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.endpoints.anyscale.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { isValid: true, message: 'API key is valid' };
    } else if (response.status === 401) {
      return { isValid: false, error: 'Invalid API key' };
    } else {
      return { isValid: false, error: `Validation failed with status ${response.status}` };
    }
  } catch (error: any) {
    return { isValid: false, error: `Network error: ${error.message}` };
  }
}

// Cloudflare validation
async function validateCloudflareKey(apiKey: string): Promise<ValidationResult> {
  try {
    // Cloudflare Workers AI uses account ID and API token
    // This is a basic validation - actual validation would need account ID
    const response = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { isValid: true, message: 'API key is valid' };
    } else if (response.status === 401) {
      return { isValid: false, error: 'Invalid API key' };
    } else {
      return { isValid: false, error: `Validation failed with status ${response.status}` };
    }
  } catch (error: any) {
    return { isValid: false, error: `Network error: ${error.message}` };
  }
}

export function registerIpcHandlers() {
  // Get app version
  ipcMain.handle('app:getVersion', async () => {
    return app.getVersion();
  });

  ipcMain.handle('app:getUserDataPath', async () => {
    return app.getPath('userData');
  });

  // Get .env file path
  ipcMain.handle('app:getEnvFilePath', async () => {
    return getEnvFilePath();
  });

  // Toggle developer tools
  ipcMain.handle('app:toggleDevTools', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      if (window.webContents.isDevToolsOpened()) {
        window.webContents.closeDevTools();
      } else {
        window.webContents.openDevTools();
      }
    }
  });

  // Export YAML to file
  ipcMain.handle('fs:exportYaml', async (_event, payload) => {
    try {
      const validated = ExportYamlSchema.parse(payload);
      const { filePath, canceled } = await dialog.showSaveDialog({
        title: 'Export Promptfoo Config',
        defaultPath: validated.defaultPath || 'promptfooconfig.yaml',
        filters: [
          { name: 'YAML Files', extensions: ['yaml', 'yml'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (canceled || !filePath) {
        return null;
      }

      const safePath = sanitizePath(filePath);
      await fs.writeFile(safePath, validated.content, 'utf-8');
      return safePath;
    } catch (error: any) {
      const sanitizedError = sanitizeLog(error.message || String(error));
      console.error('Error exporting YAML:', sanitizedError);
      throw new Error(sanitizedError);
    }
  });

  // Save project to JSON
  ipcMain.handle('fs:saveProject', async (_event, payload) => {
    try {
      const validated = SaveProjectSchema.parse(payload);
      const { filePath, canceled } = await dialog.showSaveDialog({
        title: 'Save Project',
        defaultPath: validated.defaultPath || 'promptfoo-project.json',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (canceled || !filePath) {
        return null;
      }

      const safePath = sanitizePath(filePath);
      // Sanitize the project data before saving
      const sanitizedProject = sanitizeJSON(validated.project);
      await fs.writeFile(safePath, JSON.stringify(sanitizedProject, null, 2), 'utf-8');
      return safePath;
    } catch (error: any) {
      const sanitizedError = sanitizeLog(error.message || String(error));
      console.error('Error saving project:', sanitizedError);
      throw new Error(sanitizedError);
    }
  });

  // Load project from JSON
  ipcMain.handle('fs:loadProject', async () => {
    try {
      const { filePaths, canceled } = await dialog.showOpenDialog({
        title: 'Load Project',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      if (canceled || filePaths.length === 0) {
        return null;
      }

      const safePath = sanitizePath(filePaths[0]);
      const content = await fs.readFile(safePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      const sanitizedError = sanitizeLog(error.message || String(error));
      console.error('Error loading project:', sanitizedError);
      throw new Error(sanitizedError);
    }
  });

  // Check if promptfoo is installed
  ipcMain.handle('promptfoo:checkInstalled', async () => {
    return new Promise((resolve) => {
      const command = isWindows ? 'where' : 'which';
      const executable = isWindows ? 'promptfoo.cmd' : 'promptfoo';

      // First, try to find promptfoo in PATH
      const child = spawn(command, [executable], {
        shell: true,
        env: {
          ...process.env,
          // Add common paths where npm global packages are installed
          PATH: process.env.PATH + (isWindows
            ? ';' + process.env.APPDATA + '\\npm'
            : ':/usr/local/bin:/opt/homebrew/bin:' +
              (process.env.HOME || '') + '/.nvm/versions/node/*/bin'),
        },
      });

      child.on('error', () => resolve(false));
      child.on('exit', (code) => {
        if (code === 0) {
          // Found via which/where, now verify it works
          const verifyChild = spawn(executable, ['--version'], {
            shell: true,
            env: {
              ...process.env,
              PATH: process.env.PATH + (isWindows
                ? ';' + process.env.APPDATA + '\\npm'
                : ':/usr/local/bin:/opt/homebrew/bin:' +
                  (process.env.HOME || '') + '/.nvm/versions/node/*/bin'),
            },
          });
          verifyChild.on('error', () => resolve(false));
          verifyChild.on('exit', (verifyCode) => resolve(verifyCode === 0));
        } else {
          resolve(false);
        }
      });
    });
  });

  // Run promptfoo evaluation
  ipcMain.handle('promptfoo:run', async (_event, payload) => {
    try {
      const validated = RunPromptfooSchema.parse(payload);
      const tempDir = await ensureTempDir();
      const configPath = path.join(tempDir, `config-${Date.now()}.yaml`);
      const resultsPath = path.join(tempDir, `results-${Date.now()}.json`);

      // Write YAML config to temp file
      await fs.writeFile(configPath, validated.yamlContent, 'utf-8');

      // Parse YAML to extract outputPath for HTML report and JSON
      let htmlOutputPath = './output.html'; // default
      let jsonOutputPath: string | null = null;
      try {
        const yaml = require('js-yaml');
        const config = yaml.load(validated.yamlContent);
        if (config.outputPath) {
          if (Array.isArray(config.outputPath)) {
            // First item is HTML, second is JSON
            htmlOutputPath = config.outputPath[0];
            jsonOutputPath = config.outputPath[1];
          } else {
            htmlOutputPath = config.outputPath;
          }
        }
      } catch (e) {
        // If parsing fails, use default
      }

      // Resolve paths to absolute (relative to temp dir where promptfoo runs)
      const absoluteHtmlPath = path.isAbsolute(htmlOutputPath)
        ? htmlOutputPath
        : path.resolve(tempDir, htmlOutputPath);

      const absoluteJsonPath = jsonOutputPath
        ? (path.isAbsolute(jsonOutputPath) ? jsonOutputPath : path.resolve(tempDir, jsonOutputPath))
        : null;

      // Enhanced PATH to find npm global packages
      const enhancedPath = process.env.PATH + (isWindows
        ? ';' + process.env.APPDATA + '\\npm'
        : ':/usr/local/bin:/opt/homebrew/bin:' +
          (process.env.HOME || '') + '/.nvm/versions/node/*/bin');

      return new Promise((resolve) => {
        const logs: string[] = [];
        const command = isWindows ? 'npx.cmd' : 'npx';
        // Don't use --output flag, let the YAML config's outputPath handle it
        const args = [
          'promptfoo',
          'eval',
          '-c',
          configPath,
          '--no-cache', // Always disable cache
        ];

        const child = spawn(command, args, {
          shell: true,
          env: {
            ...process.env,
            PATH: enhancedPath,
          },
          cwd: tempDir,
        });

        // Store the process for potential abortion
        runningProcesses.set(validated.runId, child);

        let testCount = 0;
        let totalTests = 0;
        let aborted = false;

        child.stdout?.on('data', (data) => {
          const rawLog = data.toString();
          const sanitizedLog = sanitizeLog(rawLog);
          logs.push(sanitizedLog);

          // Parse logs for progress information
          // Pattern 1: "Running 10 test cases" - Initialize total count
          const totalMatch = sanitizedLog.match(/Running\s+(\d+)\s+test\s+cases?/i);
          if (totalMatch) {
            const total = parseInt(totalMatch[1], 10);
            if (total > 0 && totalTests === 0) {
              totalTests = total;
              testCount = 0; // Reset count when starting
            }
          }

          // Pattern 2: Count each test completion by looking for result indicators
          if (totalTests > 0 && testCount < totalTests) {
            // Look for [PASS] or [FAIL] in the log output
            if (sanitizedLog.includes('[PASS]') || sanitizedLog.includes('[FAIL]')) {
              testCount++;
            }
          }

          // Ensure testCount doesn't exceed totalTests
          if (testCount > totalTests && totalTests > 0) {
            testCount = totalTests;
          }

          // Send sanitized log and progress to renderer
          const window = BrowserWindow.getFocusedWindow();
          if (window) {
            window.webContents.send('promptfoo:log', sanitizedLog);
            if (totalTests > 0) {
              window.webContents.send('promptfoo:progress', { current: testCount, total: totalTests, runId: validated.runId });
            }
          }
        });

        child.stderr?.on('data', (data) => {
          const rawLog = data.toString();
          const sanitizedLog = sanitizeLog(rawLog);
          logs.push(sanitizedLog);

          // Detect Google Vertex AI errors and provide helpful guidance
          let helpMessage = '';

          // Error 1: OAuth invalid_grant
          if (rawLog.includes('invalid_grant') || rawLog.includes('Error: invalid_grant')) {
            helpMessage = '\n\n⚠️  GOOGLE AUTHENTICATION ERROR DETECTED\n' +
              '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
              'Your Google Cloud credentials have expired or are invalid.\n\n' +
              '📌 RECOMMENDED SOLUTION (No terminal required):\n' +
              '   Use Gemini API key instead of Vertex AI:\n' +
              '   1. Get a Gemini API key from: https://makersuite.google.com/app/apikey\n' +
              '   2. In the Providers tab, select "Google Gemini" instead of "Vertex AI"\n' +
              '   3. Set GEMINI_API_KEY in Settings, or add to your .env file:\n' +
              '      GEMINI_API_KEY=your-key-here\n\n' +
              '🔧 ADVANCED OPTIONS (For Vertex AI users):\n' +
              '   Option 1 - OAuth (requires terminal):\n' +
              '   • Run: gcloud auth application-default login\n' +
              '   • Follow browser authentication flow\n\n' +
              '   Option 2 - Service Account:\n' +
              '   • Set environment variable:\n' +
              '     export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"\n' +
              '   • Restart the application\n' +
              '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
          }
          // Error 2: Invalid resource field value
          else if (rawLog.includes('Invalid resource field value') || rawLog.includes('Vertex API call error')) {
            helpMessage = '\n\n⚠️  GOOGLE GEMINI API KEY MISSING\n' +
              '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
              'Your provider is set to "google:gemini-*" but GEMINI_API_KEY is not configured.\n' +
              'Promptfoo tried to use Vertex AI as a fallback but it\'s not set up correctly.\n\n' +
              '📌 SOLUTION (Simple - takes 2 minutes):\n' +
              '   Set up Gemini API key:\n' +
              '   1. Get a FREE Gemini API key from: https://makersuite.google.com/app/apikey\n' +
              '   2. In Prompt Evaluator, go to Settings (gear icon)\n' +
              '   3. Set GEMINI_API_KEY to your API key\n' +
              '   4. Restart the evaluation\n\n' +
              '   Your provider "google:gemini-*" will now work correctly!\n\n' +
              '💡 Why this happened:\n' +
              '   • Your provider tab shows "google:gemini-2.5-flash" (correct!)\n' +
              '   • But GEMINI_API_KEY environment variable is not set\n' +
              '   • Promptfoo tried Vertex AI as fallback (requires gcloud auth)\n' +
              '   • Solution: Just add GEMINI_API_KEY in Settings\n' +
              '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
          }

          if (helpMessage) {
            logs.push(helpMessage);
            const window = BrowserWindow.getFocusedWindow();
            if (window) {
              window.webContents.send('promptfoo:log', sanitizedLog + helpMessage);
            }
          } else {
            const window = BrowserWindow.getFocusedWindow();
            if (window) {
              window.webContents.send('promptfoo:log', sanitizedLog);
            }
          }
        });

        child.on('error', (error) => {
          runningProcesses.delete(validated.runId);
          const sanitizedError = sanitizeLog(error.message);
          resolve({
            success: false,
            error: `Failed to run promptfoo: ${sanitizedError}`,
            logs,
            aborted,
          });
        });

        child.on('exit', async (code, signal) => {
          runningProcesses.delete(validated.runId);

          // Check if the process was killed/aborted
          if (signal === 'SIGTERM' || signal === 'SIGKILL' || code === null) {
            aborted = true;
            resolve({
              success: false,
              error: 'Evaluation was aborted',
              logs,
              aborted: true,
            });
            return;
          }

          if (code !== 0) {
            // Check if the error was due to Google OAuth invalid_grant
            const logsText = logs.join('\n');
            let errorMessage = `promptfoo exited with code ${code}`;

            if (logsText.includes('invalid_grant') || logsText.includes('Error: invalid_grant')) {
              errorMessage = 'Google Cloud authentication failed (invalid_grant). ' +
                'Recommended: Use Google Gemini API (no terminal required) - get your API key at https://makersuite.google.com/app/apikey ' +
                'and set GEMINI_API_KEY in Settings. ' +
                'Or for Vertex AI, run "gcloud auth application-default login" in your terminal.';
            } else if (logsText.includes('Invalid resource field value') || logsText.includes('Vertex API call error')) {
              errorMessage = 'GEMINI_API_KEY not configured. ' +
                'Your provider is "google:gemini-*" but the API key is missing. ' +
                'Get a FREE key at https://makersuite.google.com/app/apikey ' +
                'and set GEMINI_API_KEY in Settings (gear icon).';
            }

            resolve({
              success: false,
              error: errorMessage,
              logs,
              aborted,
            });
            return;
          }

          try {
            // Read results file from the JSON output path if specified, otherwise from temp
            const readPath = absoluteJsonPath || resultsPath;

            console.log('Reading results from:', readPath);
            console.log('absoluteJsonPath:', absoluteJsonPath);
            console.log('resultsPath:', resultsPath);

            // Wait a bit for file to be written
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Check if file exists
            try {
              await fs.access(readPath);
              console.log('Results file exists at:', readPath);
            } catch (e) {
              console.error('Results file does not exist at:', readPath);
              throw new Error(`Results file not found at: ${readPath}`);
            }

            const resultsContent = await fs.readFile(readPath, 'utf-8');
            console.log('Results file size:', resultsContent.length, 'bytes');

            const results = JSON.parse(resultsContent);
            console.log('Results parsed successfully, keys:', Object.keys(results));

            // Calculate costs for Google models if not already calculated
            calculateGoogleCosts(results);

            // Save the updated results with costs back to the file
            if (absoluteJsonPath) {
              try {
                await fs.writeFile(absoluteJsonPath, JSON.stringify(results, null, 2), 'utf-8');
                console.log('Updated results with costs saved to:', absoluteJsonPath);
              } catch (saveError) {
                console.error('Failed to save updated costs:', saveError);
                // Don't fail the operation if save fails
              }
            }

            // Sanitize results before sending to renderer
            const sanitizedResults = sanitizeJSON(results);
            console.log('Results sanitized, sending to renderer');

            // Cleanup temp files (but keep HTML and JSON files for viewing)
            await fs.unlink(configPath).catch(() => {});
            // Don't delete resultsPath if it's the same as absoluteJsonPath
            if (!absoluteJsonPath || absoluteJsonPath !== resultsPath) {
              await fs.unlink(resultsPath).catch(() => {});
            }

            resolve({
              success: true,
              results: sanitizedResults,
              logs,
              htmlPath: absoluteHtmlPath,
              aborted: false,
            });
          } catch (error: any) {
            console.error('Error reading results:', error);
            const sanitizedError = sanitizeLog(error.message);
            resolve({
              success: false,
              error: `Failed to read results: ${sanitizedError}`,
              logs,
              aborted,
            });
          }
        });
      });
    } catch (error: any) {
      const sanitizedError = sanitizeLog(error.message || 'Unknown error');
      return {
        success: false,
        error: sanitizedError,
        logs: [],
        aborted: false,
      };
    }
  });

  // Abort a running evaluation
  ipcMain.handle('promptfoo:abort', async (_event, runId: string) => {
    try {
      const child = runningProcesses.get(runId);
      if (child && !child.killed) {
        // Kill the process and all its children
        if (isWindows) {
          spawn('taskkill', ['/pid', child.pid!.toString(), '/f', '/t']);
        } else {
          child.kill('SIGTERM');
          // If SIGTERM doesn't work after 5 seconds, force kill
          setTimeout(() => {
            if (!child.killed) {
              child.kill('SIGKILL');
            }
          }, 5000);
        }
        runningProcesses.delete(runId);
        return { success: true };
      }
      return { success: false, error: 'No running process found' };
    } catch (error: any) {
      const sanitizedError = sanitizeLog(error.message || String(error));
      console.error('Error aborting evaluation:', sanitizedError);
      return { success: false, error: sanitizedError };
    }
  });

  // Read JSON results file
  ipcMain.handle('fs:readJsonResults', async (_event, filePath: string) => {
    try {
      const safePath = sanitizePath(filePath);

      // Check if file exists
      await fs.access(safePath);

      // Read the file
      const content = await fs.readFile(safePath, 'utf-8');
      const results = JSON.parse(content);

      // Calculate costs for Google models if not already calculated
      calculateGoogleCosts(results);

      // Save updated costs back to file
      try {
        await fs.writeFile(safePath, JSON.stringify(results, null, 2), 'utf-8');
        console.log('Updated costs saved to:', safePath);
      } catch (saveError) {
        console.error('Failed to save updated costs:', saveError);
        // Don't fail if save fails
      }

      // Sanitize results
      const sanitizedResults = sanitizeJSON(results);

      return {
        success: true,
        results: sanitizedResults,
      };
    } catch (error: any) {
      const sanitizedError = sanitizeLog(error.message || String(error));
      console.error('Error reading JSON results:', sanitizedError);
      return {
        success: false,
        error: sanitizedError,
      };
    }
  });

  // Open HTML file in default browser
  ipcMain.handle('shell:openPath', async (_event, filePath: string) => {
    try {
      // Resolve relative paths to absolute paths
      const tempDir = getTempDir(app);
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(tempDir, filePath);

      const safePath = sanitizePath(absolutePath);

      // Check if file exists
      await fs.access(safePath);

      // Open the file in default application
      const result = await shell.openPath(safePath);

      if (result) {
        // openPath returns error message if failed
        throw new Error(result);
      }

      return { success: true };
    } catch (error: any) {
      const sanitizedError = sanitizeLog(error.message || String(error));
      console.error('Error opening file:', sanitizedError);
      return {
        success: false,
        error: sanitizedError,
      };
    }
  });

  ipcMain.handle('ai:analyzeResults', async (_event, summaryData: any, jsonOutputPath?: string, aiModel: string = 'google:gemini-2.5-pro', customPrompt?: string) => {
    try {
      // Extract provider prefix and model name
      const modelPrefix = aiModel.split(':')[0];
      const modelName = aiModel.split(':')[1] || aiModel;

      // Get appropriate API key based on model provider
      let apiKey: string | undefined;
      if (modelPrefix === 'google' || modelPrefix === 'vertex') {
        apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      } else if (modelPrefix === 'anthropic') {
        apiKey = process.env.ANTHROPIC_API_KEY;
      } else if (modelPrefix === 'openai') {
        apiKey = process.env.OPENAI_API_KEY;
      }

      if (!apiKey) {
        return {
          success: false,
          error: `API key not found for ${modelPrefix}. Please set the appropriate environment variable (GEMINI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY).`,
        };
      }

      console.log(`Using ${aiModel} for analysis. API key:`, apiKey ? '✓ Key found' : '✗ No key');

      // Use custom prompt if provided, otherwise read from file or use embedded default
      let systemPrompt = '';

      if (customPrompt) {
        console.log('Using custom AI analysis prompt from settings');
        systemPrompt = customPrompt;
      } else {
        // Read the AI analysis prompt from the prompts directory
        const possiblePaths = [
          path.join(__dirname, '..', 'prompts', 'ai-analysis-prompt.md'),
          path.join(__dirname, '..', '..', 'prompts', 'ai-analysis-prompt.md'),
          path.join(process.resourcesPath || '', 'prompts', 'ai-analysis-prompt.md'),
          path.join(app.getAppPath(), 'prompts', 'ai-analysis-prompt.md'),
        ];

        let foundPrompt = false;
        for (const tryPath of possiblePaths) {
          try {
            systemPrompt = await fs.readFile(tryPath, 'utf-8');
            console.log('Successfully loaded AI analysis prompt from:', tryPath);
            foundPrompt = true;
            break;
          } catch (err) {
            // Continue to next path
          }
        }

        if (!foundPrompt) {
          console.log('Could not find AI analysis prompt file, using embedded prompt');
          // Fallback to embedded comprehensive prompt
          systemPrompt = `You are a rigorous test-results analyst for LLM evaluations produced by Promptfoo.

CRITICAL: You MUST analyze the SPECIFIC Promptfoo test data provided below. DO NOT generate content about unrelated topics.

Your job:
1. Parse the Promptfoo result JSON data structure.
2. Extract information from "results.table", "results.stats", "results.results".
3. Identify models from "results.table.head.prompts" or "results.prompts".
4. Count tests from table.body length.
5. Check each output's "pass" field and "score".
6. Calculate pass_rate, stability, avg_score for each model.
7. Recommend best model if multiple present.

Data Structure:
- results.table.head.prompts[]: tested models {label, provider}
- results.table.body[]: tests with outputs[] per model {pass, score, text, latencyMs}
- results.stats: {successes, failures, tokenUsage}

Failed = pass===false or score<1.0

Return ONLY this JSON (no markdown, no other text):
{
  "summary": {"total_tests": 0, "models": [], "multi_model": false},
  "failed_tests_by_model": [{"model": "...", "failed_count": 0, "total_count": 0, "failures": []}],
  "cross_model_rca": {"clusters": [], "notes": "..."},
  "model_comparison": {
    "per_model_metrics": [{"model": "...", "pass_rate": 1.0, "avg_score": 1.0, "stability": 1.0, "severe_failures": 0, "latency_ms_avg": null, "cost_usd_estimate": null}],
    "best_model": {"model": "...", "justification": "..."}
  }
}`;
        }
      }

      // Construct condensed data for AI analysis
      // Extract only the essential information to avoid truncation issues
      const condensedData = {
        version: summaryData.version,
        timestamp: summaryData.timestamp,
        results: {
          prompts: summaryData.results?.prompts || [],
          stats: summaryData.results?.stats || {},
          // Include condensed results with only key fields
          results: (summaryData.results?.results || []).map((r: any) => ({
            promptIdx: r.promptIdx,
            provider: r.provider,
            score: r.score,
            success: r.success,
            latencyMs: r.latencyMs,
            cost: r.cost,
            error: r.error,
            gradingResult: r.gradingResult ? {
              pass: r.gradingResult.pass,
              score: r.gradingResult.score,
              reason: r.gradingResult.reason,
            } : undefined,
          })),
        },
        config: {
          description: summaryData.config?.description,
          providers: summaryData.config?.providers?.map((p: any) => ({
            id: p.id || p,
          })) || [],
        },
      };

      let dataString = JSON.stringify(condensedData, null, 2);
      console.log(`Condensed data size: ${dataString.length} characters`);

      const userPrompt = `Analyze this Promptfoo test data:

${dataString}

Return ONLY the JSON response. No explanations, no markdown code blocks, just the raw JSON object.`;

      console.log(`Calling ${aiModel} with condensed data...`);
      console.log('Data size:', dataString.length, 'characters');

      // Call AI model (supports Google, OpenAI, and Anthropic)
      const aiResponse = await callAIModel({
        modelId: aiModel,
        apiKey,
        systemPrompt,
        userPrompt,
        temperature: 0.1,
        maxTokens: 8192,
        responseFormat: 'json',
      });

      if (aiResponse.error) {
        return {
          success: false,
          error: aiResponse.error,
        };
      }

      let text = aiResponse.text;
      console.log('AI response received, length:', text.length);

      // Try to parse as JSON
      let parsedAnalysis = null;
      try {
        parsedAnalysis = JSON.parse(text);
        console.log('Successfully parsed JSON response');
      } catch (parseErr) {
        console.error('Failed to parse JSON:', parseErr);
        console.log('Raw response (first 500 chars):', text.substring(0, 500));
      }

      const analysisResult = {
        success: true,
        analysis: parsedAnalysis || text,
        isStructured: !!parsedAnalysis,
      };

      // Save the analysis back to the JSON file if path is provided
      if (jsonOutputPath && parsedAnalysis) {
        try {
          const safePath = sanitizePath(jsonOutputPath);

          // Read the current JSON file
          const currentContent = await fs.readFile(safePath, 'utf-8');
          const currentResults = JSON.parse(currentContent);

          // Add the AI analysis to the results
          currentResults.aiAnalysis = {
            analysis: parsedAnalysis,
            isStructured: true,
            timestamp: new Date().toISOString(),
          };

          // Write back to file
          await fs.writeFile(safePath, JSON.stringify(currentResults, null, 2), 'utf-8');
          console.log('AI analysis saved to JSON file:', safePath);
        } catch (saveError: any) {
          console.error('Failed to save AI analysis to JSON file:', sanitizeLog(saveError.message || String(saveError)));
          // Don't fail the entire operation if save fails
        }
      }

      return analysisResult;
    } catch (error: any) {
      const sanitizedError = sanitizeLog(error.message || String(error));
      console.error('Error analyzing results:', sanitizedError);
      return {
        success: false,
        error: sanitizedError,
      };
    }
  });

  // AI Assertion Generation
  ipcMain.handle('ai:generateAssertions', async (_event, promptsData: any, providersData: any, datasetData: any, aiModel: string = 'google:gemini-2.5-pro', customPrompt?: string) => {
    try {
      // Extract provider prefix and model name
      const modelPrefix = aiModel.split(':')[0];
      const modelName = aiModel.split(':')[1] || aiModel;

      // Get appropriate API key based on model provider
      let apiKey: string | undefined;
      if (modelPrefix === 'google' || modelPrefix === 'vertex') {
        apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      } else if (modelPrefix === 'anthropic') {
        apiKey = process.env.ANTHROPIC_API_KEY;
      } else if (modelPrefix === 'openai') {
        apiKey = process.env.OPENAI_API_KEY;
      } else {
        return {
          success: false,
          error: `Unsupported AI model provider: ${modelPrefix}. Currently supported: google, anthropic, openai`,
        };
      }

      if (!apiKey) {
        return {
          success: false,
          error: `API key not found for ${modelPrefix}. Please set the appropriate environment variable (GEMINI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY).`,
        };
      }

      console.log(`Generating assertions with AI model: ${aiModel}...`);

      // Use custom prompt if provided, otherwise read from file or use embedded default
      let systemPrompt = '';

      if (customPrompt) {
        console.log('Using custom assertion generation prompt from settings');
        systemPrompt = customPrompt;
      } else {
        // Read the AI assertion generation prompt from the prompts directory
        const possiblePaths = [
          path.join(__dirname, '..', 'prompts', 'assertion-generation-prompt.md'),
          path.join(__dirname, '..', '..', 'prompts', 'assertion-generation-prompt.md'),
          path.join(process.resourcesPath || '', 'prompts', 'assertion-generation-prompt.md'),
          path.join(app.getAppPath(), 'prompts', 'assertion-generation-prompt.md'),
        ];

        let foundPrompt = false;
        for (const tryPath of possiblePaths) {
          try {
            systemPrompt = await fs.readFile(tryPath, 'utf-8');
            console.log('Successfully loaded assertion generation prompt from:', tryPath);
            foundPrompt = true;
            break;
          } catch (err) {
            // Continue to next path
          }
        }

        if (!foundPrompt) {
          console.log('Could not find assertion generation prompt file, using embedded prompt');
          systemPrompt = `You are an expert test engineer specializing in LLM evaluation.

Analyze the provided prompts, their context, and variables to generate contextual, relevant assertions.

CRITICAL RULES:
1. For every variable starting with "expected_", create a validation assertion (priority: critical)
2. DO NOT generate security assertions - security testing will be configured separately by users
3. Base assertions on actual prompt intent, not generic defaults
4. Focus on functional, semantic, and quality assertions only
5. For llm-rubric assertions, ALWAYS reference test variables in the rubric using {{variable_name}} syntax
   Example: "Given the question in {{question}}, evaluate if the output accurately answers it"
6. IMPORTANT: Detect if prompts request JSON output format (look for keywords: "JSON", "json", "Return JSON", "output in JSON format", etc.)
   If JSON output is requested, set output_format to "json" in the analysis
7. Return ONLY valid JSON, no markdown formatting

Return JSON in this format:
{
  "analysis": {
    "prompt_count": 0,
    "primary_intent": "classification|generation|summarization|qa|code|other",
    "output_format": "text|json|code|structured|mixed",
    "security_risk_level": "low|medium|high|critical",
    "variables_detected": {
      "total": 0,
      "standard": [],
      "expected": [],
      "user_controlled": [],
      "security_sensitive": []
    }
  },
  "assertions": [
    {
      "type": "assertion-type",
      "rationale": "Why this assertion is needed",
      "value": "expected value or pattern",
      "threshold": 0.8,
      "rubric": "For llm-rubric: Include test variables like 'Given {{variable}}, evaluate if...' so grading LLM has context",
      "provider": "provider-id",
      "weight": 1.0,
      "priority": "critical|high|medium|low",
      "tags": ["security", "format", "quality"]
    }
  ],
  "recommendations": {
    "essential": [],
    "suggested": [],
    "security_notes": []
  }
}`;
        }
      }

      // Prepare input data
      const inputData = {
        prompts: promptsData || [],
        providers: providersData || [],
        dataset_sample: datasetData || null,
      };

      const userPrompt = `${systemPrompt}

## Input Data:

${JSON.stringify(inputData, null, 2)}

Analyze the prompts and generate appropriate assertions. Return ONLY valid JSON, no markdown formatting.`;

      console.log(`Calling ${aiModel} for assertion generation...`);

      // Call AI model (supports Google, OpenAI, and Anthropic)
      const aiResponse = await callAIModel({
        modelId: aiModel,
        apiKey,
        systemPrompt: '',
        userPrompt,
        temperature: 0.3,
        maxTokens: 8192,
        responseFormat: 'json',
      });

      if (aiResponse.error) {
        return {
          success: false,
          error: aiResponse.error,
        };
      }

      let text = aiResponse.text;
      console.log('AI response received, length:', text.length);

      // Parse JSON
      let parsedResult = null;
      try {
        parsedResult = JSON.parse(text);
        console.log('Successfully parsed assertion generation response');
      } catch (parseErr) {
        console.error('Failed to parse JSON:', parseErr);
        console.log('Raw response (first 500 chars):', text.substring(0, 500));
        return {
          success: false,
          error: 'Failed to parse AI response. Please try again.',
        };
      }

      // Filter out security assertions from AI-generated results
      const filteredAssertions = (parsedResult.assertions || []).filter((assertion: any) => {
        const assertionType = assertion.type || '';
        // Remove any security-related assertions
        return !assertionType.startsWith('security-');
      });

      console.log(`Filtered assertions: ${parsedResult.assertions?.length || 0} -> ${filteredAssertions.length} (removed ${(parsedResult.assertions?.length || 0) - filteredAssertions.length} security assertions)`);

      // Always add Factuality and Latency assertions
      // Use the AI model from settings as the grading provider for factuality
      const alwaysIncludeAssertions = [
        {
          type: 'factuality',
          rationale: 'Evaluates factual consistency between LLM output and reference answer. Critical for accuracy validation.',
          value: '{{expected_output}}',
          provider: aiModel, // Use the same model configured in settings
          priority: 'critical',
          tags: ['semantic', 'accuracy', 'quality']
        },
        {
          type: 'latency',
          threshold: 30000,
          rationale: 'Ensures response time is under 30 seconds for acceptable user experience.',
          priority: 'high',
          tags: ['performance', 'quality']
        }
      ];

      // Auto-add is-json assertion if output format is JSON
      const outputFormat = parsedResult?.analysis?.output_format;
      if (outputFormat === 'json' || outputFormat === 'structured') {
        console.log(`Detected ${outputFormat} output format, adding is-json assertion`);
        alwaysIncludeAssertions.push({
          type: 'is-json',
          rationale: 'Validates that the output is valid JSON format as expected by the prompt.',
          priority: 'critical',
          tags: ['format', 'validation', 'quality']
        } as any);
      }

      // Set AI model from settings as provider for all LLM-based assertions
      const assertionsWithProvider = filteredAssertions.map((assertion: any) => {
        // LLM-based assertion types that need a provider
        const llmBasedTypes = ['llm-rubric', 'context-relevance', 'factuality', 'answer-relevance'];

        if (llmBasedTypes.includes(assertion.type) && !assertion.provider) {
          return {
            ...assertion,
            provider: aiModel // Use the same model configured in settings
          };
        }
        return assertion;
      });

      // Combine AI-generated assertions with always-included ones
      const finalAssertions = [...assertionsWithProvider, ...alwaysIncludeAssertions];

      console.log(`Added ${alwaysIncludeAssertions.length} default assertions (factuality, latency)`);

      return {
        success: true,
        assertions: finalAssertions,
        analysis: parsedResult.analysis || null,
        recommendations: parsedResult.recommendations || null,
      };
    } catch (error: any) {
      const sanitizedError = sanitizeLog(error.message || String(error));
      console.error('Error generating assertions:', sanitizedError);
      return {
        success: false,
        error: sanitizedError,
      };
    }
  });

  // AI Dataset Generation
  ipcMain.handle('ai:generateDataset', async (_event, promptsData: any, aiModel: string = 'google:gemini-2.5-pro', rowCount: number = 5, customPrompt?: string) => {
    try {
      // Extract provider prefix and model name
      const modelPrefix = aiModel.split(':')[0];
      const modelName = aiModel.split(':')[1] || aiModel;

      // Get appropriate API key based on model provider
      let apiKey: string | undefined;
      if (modelPrefix === 'google' || modelPrefix === 'vertex') {
        apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      } else if (modelPrefix === 'anthropic') {
        apiKey = process.env.ANTHROPIC_API_KEY;
      } else if (modelPrefix === 'openai') {
        apiKey = process.env.OPENAI_API_KEY;
      }

      if (!apiKey) {
        return {
          success: false,
          error: `API key not found for ${modelPrefix}. Please set the appropriate environment variable (GEMINI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY).`,
        };
      }

      console.log(`Generating dataset with AI model: ${aiModel}...`);

      // Use custom prompt if provided, otherwise read from file or use embedded default
      let systemPrompt = '';

      if (customPrompt) {
        console.log('Using custom dataset generation prompt from settings');
        systemPrompt = customPrompt;
      } else {
        // Read the AI dataset generation prompt from the prompts directory
        const possiblePaths = [
          path.join(__dirname, '..', 'prompts', 'dataset-generation-prompt.md'),
          path.join(__dirname, '..', '..', 'prompts', 'dataset-generation-prompt.md'),
          path.join(process.resourcesPath || '', 'prompts', 'dataset-generation-prompt.md'),
          path.join(app.getAppPath(), 'prompts', 'dataset-generation-prompt.md'),
        ];

        let foundPrompt = false;
        for (const tryPath of possiblePaths) {
          try {
            systemPrompt = await fs.readFile(tryPath, 'utf-8');
            console.log('Successfully loaded dataset generation prompt from:', tryPath);
            foundPrompt = true;
            break;
          } catch (err) {
            // Continue to next path
          }
        }

        if (!foundPrompt) {
          console.log('Could not find dataset generation prompt file, using embedded prompt');
          systemPrompt = `You are an expert test data generator for LLM evaluation.

Extract all variables from prompts using {{variable_name}} syntax.
Generate diverse, realistic test data covering normal, edge, and complex cases.

If NO variables found, return error JSON:
{
  "error": "No variables found in prompts",
  "message": "Please use {{variable_name}} syntax in your prompts.",
  "suggestion": "Example: 'Classify {{text}}' creates a 'text' variable."
}

If variables found, return dataset JSON:
{
  "analysis": {
    "variables": ["var1", "var2"],
    "expected_variables": ["expected_*"],
    "prompt_intent": "classification|qa|translation|code|summarization|other",
    "suggested_row_count": 8,
    "coverage": "Description of test case coverage"
  },
  "dataset": {
    "name": "Generated Test Dataset",
    "headers": ["var1", "var2"],
    "rows": [
      {"var1": "value1", "var2": "value2"}
    ]
  },
  "metadata": {
    "total_rows": 5,
    "coverage_notes": ["2 normal cases", "2 edge cases", "1 complex case"],
    "recommendations": ["Review expected values"]
  }
}

Rules:
1. Extract ALL variables from ALL prompts
2. Generate exactly ${rowCount} diverse test cases
3. Include edge cases and normal cases
4. Provide accurate expected values
5. Return ONLY valid JSON, no markdown`;
        }
      }

      const userPrompt = `${systemPrompt}

## REQUIRED ROW COUNT: ${rowCount}
**CRITICAL**: You MUST generate EXACTLY ${rowCount} rows. No more, no less. This is mandatory.

## Prompts to analyze:

${JSON.stringify(promptsData, null, 2)}

Extract variables and generate a dataset with EXACTLY ${rowCount} rows. Ensure all cells have meaningful, non-empty data. Return ONLY valid JSON, no markdown formatting.`;

      console.log(`Calling ${aiModel} for dataset generation...`);

      // Call AI model (supports Google, OpenAI, and Anthropic)
      const aiResponse = await callAIModel({
        modelId: aiModel,
        apiKey,
        systemPrompt: '',
        userPrompt,
        temperature: 0.4,
        maxTokens: 8192,
        responseFormat: 'json',
      });

      if (aiResponse.error) {
        return {
          success: false,
          error: aiResponse.error,
        };
      }

      let text = aiResponse.text;
      console.log('AI response received, length:', text.length);

      // Parse JSON
      let parsedResult = null;
      try {
        parsedResult = JSON.parse(text);
        console.log('Successfully parsed dataset generation response');
      } catch (parseErr) {
        console.error('Failed to parse JSON:', parseErr);
        console.log('Raw response (first 500 chars):', text.substring(0, 500));
        return {
          success: false,
          error: 'Failed to parse AI response. Please try again.',
        };
      }

      // Check if it's an error response (no variables found)
      if (parsedResult.error) {
        return {
          success: false,
          error: parsedResult.error,
          message: parsedResult.message,
          suggestion: parsedResult.suggestion,
        };
      }

      // Validate row count
      const generatedRows = parsedResult.dataset?.rows?.length || 0;
      if (generatedRows !== rowCount) {
        console.warn(`AI generated ${generatedRows} rows but ${rowCount} were requested. Adjusting...`);

        // If AI generated fewer rows, pad with duplicates or request regeneration
        if (generatedRows < rowCount && generatedRows > 0) {
          const rowsToPad = rowCount - generatedRows;
          const paddedRows = [...parsedResult.dataset.rows];

          // Duplicate existing rows to reach the target count
          for (let i = 0; i < rowsToPad; i++) {
            paddedRows.push({ ...parsedResult.dataset.rows[i % generatedRows] });
          }

          parsedResult.dataset.rows = paddedRows;
          console.log(`Padded dataset to ${rowCount} rows`);
        } else if (generatedRows > rowCount) {
          // If AI generated more rows, truncate
          parsedResult.dataset.rows = parsedResult.dataset.rows.slice(0, rowCount);
          console.log(`Truncated dataset to ${rowCount} rows`);
        }
      }

      // Validate no empty values
      if (parsedResult.dataset?.rows) {
        parsedResult.dataset.rows = parsedResult.dataset.rows.map((row: any) => {
          const cleanedRow: any = {};
          for (const [key, value] of Object.entries(row)) {
            // Replace empty or null values with a placeholder
            cleanedRow[key] = (value === '' || value === null || value === undefined)
              ? `[Sample ${key}]`
              : value;
          }
          return cleanedRow;
        });
      }

      return {
        success: true,
        dataset: parsedResult.dataset || null,
        analysis: parsedResult.analysis || null,
        metadata: parsedResult.metadata || null,
      };
    } catch (error: any) {
      const sanitizedError = sanitizeLog(error.message || String(error));
      console.error('Error generating dataset:', sanitizedError);
      return {
        success: false,
        error: sanitizedError,
      };
    }
  });

  // AI Dataset Column Generation
  ipcMain.handle('ai:generateDatasetColumn', async (_event, payload: { columnType: string; existingData: any; prompts: any; aiModel?: string; customPrompt?: string }) => {
    const { columnType, existingData, prompts, aiModel = 'google:gemini-2.0-flash-exp', customPrompt } = payload;

    try {
      const modelPrefix = aiModel.split(':')[0];
      const modelName = aiModel.split(':')[1] || aiModel;

      let apiKey: string | undefined;
      if (modelPrefix === 'google' || modelPrefix === 'vertex') {
        apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      } else if (modelPrefix === 'anthropic') {
        apiKey = process.env.ANTHROPIC_API_KEY;
      } else if (modelPrefix === 'openai') {
        apiKey = process.env.OPENAI_API_KEY;
      }

      if (!apiKey) {
        return { success: false, error: `API key not found for ${modelPrefix}. Please set the appropriate environment variable.` };
      }

      console.log(`[AI Column Generation] Generating "${columnType}" column with ${aiModel}...`);

      const systemPrompt = customPrompt || `You are an expert test data generator. Generate a new column for an existing dataset.

Column Type: ${columnType}

Instructions based on column type:
- expected_output: Generate factually correct expected outputs for Factuality assertion. Column name MUST be "expected_output"

**CRITICAL NAMING RULES**:
- For "expected_output" type → columnName MUST be exactly "expected_output" (not "expected_answer" or any variation)

**VALUE FORMAT RULES - CRITICAL FOR JSON OUTPUTS**:
- Analyze the prompts to determine if they expect JSON output (look for keywords like "JSON", "json", "Return JSON", "output format: JSON", etc.)
- If the prompt requests JSON output:
  * Each value MUST be a JSON STRING (not a plain object)
  * The JSON should be properly formatted as a compact string
  * Escape quotes and special characters properly within the string
  * Example: {"columnName": "expected_output", "values": ["{\"key\":\"value\",\"items\":[1,2,3]}", "{\"key\":\"value2\"}"]}
- If the prompt does NOT request JSON output:
  * Values should be plain strings
  * Example: {"columnName": "expected_output", "values": ["answer1", "answer2"]}

Return ONLY JSON with this structure:
{
  "columnName": "column_name_here",
  "values": ["value for row 1", "value for row 2", ...]
}

Rules:
1. Generate exactly ${existingData.rows.length} values (one per existing row)
2. Values should be relevant to existing data in each row
3. Be concise and accurate
4. Use EXACT column names as specified above
5. **CRITICAL**: For JSON outputs, return compact JSON STRINGS (with escaped quotes), not plain objects
6. Return ONLY valid JSON, no markdown`;

      const userPrompt = `${systemPrompt}

## Existing Data:
Headers: ${JSON.stringify(existingData.headers)}
Rows: ${JSON.stringify(existingData.rows)}

${prompts && prompts.length > 0 ? `## Prompts (for context):
${JSON.stringify(prompts)}` : ''}

Generate the "${columnType}" column. Return JSON: {"columnName": "...", "values": [...]}`;

      // Call AI model (supports Google, OpenAI, and Anthropic)
      const aiResponse = await callAIModel({
        modelId: aiModel,
        apiKey,
        systemPrompt: '',
        userPrompt,
        temperature: 0.4,
        maxTokens: 8192,
        responseFormat: 'json',
      });

      if (aiResponse.error) {
        return {
          success: false,
          error: aiResponse.error,
        };
      }

      let text = aiResponse.text;

      const parsedResult = JSON.parse(text);

      if (!parsedResult.columnName || !parsedResult.values || !Array.isArray(parsedResult.values)) {
        return { success: false, error: 'Invalid AI response format' };
      }

      // Enforce exact column names
      let finalColumnName = parsedResult.columnName;
      if (columnType === 'expected_output') {
        finalColumnName = 'expected_output';
      }

      console.log(`[AI Column Generation] Generated "${finalColumnName}" with ${parsedResult.values.length} values`);

      return {
        success: true,
        columnName: finalColumnName,
        values: parsedResult.values,
      };
    } catch (error: any) {
      console.error('[AI Column Generation] Error:', error);
      return { success: false, error: sanitizeLog(error.message || String(error)) };
    }
  });

  // AI Dataset Row Generation
  ipcMain.handle('ai:generateDatasetRow', async (_event, payload: { existingData: any; prompts: any; aiModel?: string; customPrompt?: string }) => {
    const { existingData, prompts, aiModel = 'google:gemini-2.0-flash-exp', customPrompt } = payload;

    try {
      const modelPrefix = aiModel.split(':')[0];
      const modelName = aiModel.split(':')[1] || aiModel;

      let apiKey: string | undefined;
      if (modelPrefix === 'google' || modelPrefix === 'vertex') {
        apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      } else if (modelPrefix === 'anthropic') {
        apiKey = process.env.ANTHROPIC_API_KEY;
      } else if (modelPrefix === 'openai') {
        apiKey = process.env.OPENAI_API_KEY;
      }

      if (!apiKey) {
        return { success: false, error: `API key not found for ${modelPrefix}. Please set the appropriate environment variable.` };
      }

      console.log(`[AI Row Generation] Generating new row with ${aiModel}...`);

      const systemPrompt = customPrompt || `You are an expert test data generator. Generate a new row of data for an existing dataset.

Analyze the existing dataset and generate ONE NEW ROW that:
1. Follows the same pattern and style as existing rows
2. Maintains data consistency and relationships between columns
3. Creates diverse, realistic data that doesn't duplicate existing rows
4. Ensures all column values are meaningful and complete (no empty values)

Return ONLY JSON with this structure:
{
  "row": {
    "column1": "value1",
    "column2": "value2",
    ...
  }
}

Rules:
1. Include ALL columns from the existing dataset
2. Values should be contextually appropriate and diverse
3. Maintain the same data types and formats as existing rows
4. Be creative but realistic
5. Return ONLY valid JSON, no markdown`;

      const userPrompt = `${systemPrompt}

## Existing Dataset:
Headers: ${JSON.stringify(existingData.headers)}
Sample Rows: ${JSON.stringify(existingData.rows.slice(0, 5))}

${prompts && prompts.length > 0 ? `## Prompts (for context):
${JSON.stringify(prompts)}` : ''}

Generate ONE new row. Return JSON: {"row": {...}}`;

      // Call AI model (supports Google, OpenAI, and Anthropic)
      const aiResponse = await callAIModel({
        modelId: aiModel,
        apiKey,
        systemPrompt: '',
        userPrompt,
        temperature: 0.7,
        maxTokens: 8192,
        responseFormat: 'json',
      });

      if (aiResponse.error) {
        return {
          success: false,
          error: aiResponse.error,
        };
      }

      let text = aiResponse.text;

      const parsedResult = JSON.parse(text);

      if (!parsedResult.row || typeof parsedResult.row !== 'object') {
        return { success: false, error: 'Invalid AI response format' };
      }

      console.log(`[AI Row Generation] Generated new row with ${Object.keys(parsedResult.row).length} columns`);

      return {
        success: true,
        row: parsedResult.row,
      };
    } catch (error: any) {
      console.error('[AI Row Generation] Error:', error);
      return { success: false, error: sanitizeLog(error.message || String(error)) };
    }
  });

  // AI Reference Answer Generation for Factuality Assertion
  ipcMain.handle('ai:generateReferenceAnswer', async (_event, promptsData: any, datasetData: any, aiModel: string = 'google:gemini-2.0-flash-exp', customPrompt?: string) => {
    try {
      // Extract provider prefix and model name
      const modelPrefix = aiModel.split(':')[0];
      const modelName = aiModel.split(':')[1] || aiModel;

      // Get appropriate API key based on model provider
      let apiKey: string | undefined;
      if (modelPrefix === 'google' || modelPrefix === 'vertex') {
        apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      } else if (modelPrefix === 'anthropic') {
        apiKey = process.env.ANTHROPIC_API_KEY;
      } else if (modelPrefix === 'openai') {
        apiKey = process.env.OPENAI_API_KEY;
      }

      if (!apiKey) {
        return {
          success: false,
          error: `API key not found for ${modelPrefix}. Please set the appropriate environment variable.`,
        };
      }

      console.log(`Generating reference answer with AI model: ${aiModel}...`);

      // Build the prompt for reference answer generation
      const systemPrompt = customPrompt || `You are an expert fact checker and reference answer generator for LLM evaluation.

Your task is to analyze the provided prompts and dataset, then generate a factually correct, concise reference answer that can be used to validate LLM outputs for factual consistency.

The reference answer should be:
1. **Factually accurate**: Based on reliable, verifiable information
2. **Concise**: 1-3 sentences maximum
3. **Clear**: Unambiguous and easy to validate against
4. **Complete**: Contains all essential facts needed to answer the question

Return ONLY a JSON object with this structure:
{
  "referenceAnswer": "Your factually correct reference answer here"
}

Do NOT include explanations, markdown formatting, or any other text. Return ONLY the JSON.`;

      const userPrompt = `${systemPrompt}

## Prompts:
${JSON.stringify(promptsData, null, 2)}

${datasetData ? `## Sample Dataset Row:
${JSON.stringify(datasetData.sample_row, null, 2)}` : ''}

Generate a factually correct reference answer. Return ONLY JSON with format: {"referenceAnswer": "..."}`;

      console.log(`Calling ${aiModel} for reference answer generation...`);

      // Call AI model (supports Google, OpenAI, and Anthropic)
      const aiResponse = await callAIModel({
        modelId: aiModel,
        apiKey,
        systemPrompt: '',
        userPrompt,
        temperature: 0.3,
        maxTokens: 2048,
        responseFormat: 'json',
      });

      if (aiResponse.error) {
        return {
          success: false,
          error: aiResponse.error,
        };
      }

      let text = aiResponse.text;
      console.log('AI response received, length:', text.length);

      // Parse JSON
      let parsedResult = null;
      try {
        parsedResult = JSON.parse(text);
        console.log('Successfully parsed reference answer response');
      } catch (parseErr) {
        console.error('Failed to parse JSON:', parseErr);
        console.log('Raw response (first 500 chars):', text.substring(0, 500));
        return {
          success: false,
          error: 'Failed to parse AI response. Please try again.',
        };
      }

      if (!parsedResult.referenceAnswer) {
        return {
          success: false,
          error: 'AI did not generate a reference answer. Please try again.',
        };
      }

      return {
        success: true,
        referenceAnswer: parsedResult.referenceAnswer,
      };
    } catch (error: any) {
      const sanitizedError = sanitizeLog(error.message || String(error));
      console.error('Error generating reference answer:', sanitizedError);
      return {
        success: false,
        error: sanitizedError,
      };
    }
  });

  // Check if API key is configured in environment
  ipcMain.handle('provider:checkApiKey', async (_event, envVarName: string) => {
    try {
      const apiKey = process.env[envVarName];
      return {
        success: true,
        hasApiKey: !!apiKey && apiKey.trim() !== '',
        // Never send the actual key to the renderer for security
      };
    } catch (error: any) {
      console.error('Error checking API key:', error.message);
      return {
        success: false,
        hasApiKey: false,
        error: error.message,
      };
    }
  });

  // Validate API key by making a test API call to the provider
  ipcMain.handle('provider:validateApiKey', async (_event, providerId: string, apiKey: string) => {
    try {
      // Extract provider prefix and model name from providerId (e.g., "google:gemini-2.5-pro" -> "google", "gemini-2.5-pro")
      const parts = providerId.split(':');
      const providerPrefix = parts[0].toLowerCase();
      const modelName = parts.slice(1).join(':'); // Handle models with colons in their names

      // Map provider prefixes to validation functions
      const validationResult = await validateProviderApiKey(providerPrefix, apiKey, modelName);

      return {
        success: true,
        isValid: validationResult.isValid,
        error: validationResult.error,
        message: validationResult.message,
      };
    } catch (error: any) {
      console.error('Error validating API key:', error.message);
      return {
        success: false,
        isValid: false,
        error: error.message || 'Failed to validate API key',
      };
    }
  });

  // Save API key to .env file
  ipcMain.handle('provider:saveApiKeyToEnv', async (_event, envVarName: string, apiKey: string) => {
    try {
      const result = updateEnvApiKey(envVarName, apiKey);

      if (result.success) {
        console.log(`Successfully saved ${envVarName} to .env file at ${result.envPath}`);
        return {
          success: true,
          envPath: result.envPath,
          message: `API key saved to ${result.envPath}`,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to save API key',
        };
      }
    } catch (error: any) {
      console.error('Error saving API key to .env:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to save API key to .env file',
      };
    }
  });

  // Get API key value from environment (masked for display)
  ipcMain.handle('provider:getApiKeyFromEnv', async (_event, envVarName: string) => {
    try {
      const apiKey = process.env[envVarName];

      if (apiKey && apiKey.trim() !== '') {
        return {
          success: true,
          hasApiKey: true,
          // Return the actual key value (will be used to populate the field)
          apiKey: apiKey,
        };
      } else {
        return {
          success: true,
          hasApiKey: false,
        };
      }
    } catch (error: any) {
      console.error('Error getting API key from environment:', error.message);
      return {
        success: false,
        hasApiKey: false,
        error: error.message,
      };
    }
  });

  // === History Management Handlers ===

  // Get history file path
  function getHistoryFilePath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'eval-history.json');
  }

  // Save evaluation result to history
  ipcMain.handle('history:saveResult', async (_event, historyItem: any) => {
    try {
      const historyFilePath = getHistoryFilePath();

      // Read existing history
      let history: any[] = [];
      try {
        const content = await fs.readFile(historyFilePath, 'utf-8');
        history = JSON.parse(content);
      } catch (error) {
        // File doesn't exist yet, start with empty array
        console.log('No existing history file, creating new one');
      }

      // Add new item to the beginning (most recent first)
      history.unshift(historyItem);

      // Limit history to 500 items
      if (history.length > 500) {
        history = history.slice(0, 500);
      }

      // Save back to file
      await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2), 'utf-8');
      console.log('Saved result to history:', historyItem.id);

      return {
        success: true,
        historyItem,
      };
    } catch (error: any) {
      const sanitizedError = sanitizeLog(error.message || String(error));
      console.error('Error saving to history:', sanitizedError);
      return {
        success: false,
        error: sanitizedError,
      };
    }
  });

  // Get all history items
  ipcMain.handle('history:getAll', async (_event) => {
    try {
      const historyFilePath = getHistoryFilePath();

      try {
        const content = await fs.readFile(historyFilePath, 'utf-8');
        const history = JSON.parse(content);

        // Sanitize before sending to renderer
        const sanitizedHistory = sanitizeJSON(history);

        return {
          success: true,
          history: sanitizedHistory,
        };
      } catch (error) {
        // File doesn't exist yet
        return {
          success: true,
          history: [],
        };
      }
    } catch (error: any) {
      const sanitizedError = sanitizeLog(error.message || String(error));
      console.error('Error reading history:', sanitizedError);
      return {
        success: false,
        error: sanitizedError,
      };
    }
  });

  // Get single history item by ID
  ipcMain.handle('history:getById', async (_event, id: string) => {
    try {
      const historyFilePath = getHistoryFilePath();
      const content = await fs.readFile(historyFilePath, 'utf-8');
      const history = JSON.parse(content);

      const item = history.find((h: any) => h.id === id);

      if (!item) {
        return {
          success: false,
          error: 'History item not found',
        };
      }

      // Sanitize before sending to renderer
      const sanitizedItem = sanitizeJSON(item);

      return {
        success: true,
        historyItem: sanitizedItem,
      };
    } catch (error: any) {
      const sanitizedError = sanitizeLog(error.message || String(error));
      console.error('Error reading history item:', sanitizedError);
      return {
        success: false,
        error: sanitizedError,
      };
    }
  });

  // Delete history item by ID
  ipcMain.handle('history:deleteById', async (_event, id: string) => {
    try {
      const historyFilePath = getHistoryFilePath();
      const content = await fs.readFile(historyFilePath, 'utf-8');
      let history = JSON.parse(content);

      const originalLength = history.length;
      history = history.filter((h: any) => h.id !== id);

      if (history.length === originalLength) {
        return {
          success: false,
          error: 'History item not found',
        };
      }

      // Save back to file
      await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2), 'utf-8');
      console.log('Deleted history item:', id);

      return {
        success: true,
      };
    } catch (error: any) {
      const sanitizedError = sanitizeLog(error.message || String(error));
      console.error('Error deleting history item:', sanitizedError);
      return {
        success: false,
        error: sanitizedError,
      };
    }
  });

  // Clear all history
  ipcMain.handle('history:clearAll', async (_event) => {
    try {
      const historyFilePath = getHistoryFilePath();
      await fs.writeFile(historyFilePath, JSON.stringify([], null, 2), 'utf-8');
      console.log('Cleared all history');

      return {
        success: true,
      };
    } catch (error: any) {
      const sanitizedError = sanitizeLog(error.message || String(error));
      console.error('Error clearing history:', sanitizedError);
      return {
        success: false,
        error: sanitizedError,
      };
    }
  });

  // Write debug log
  ipcMain.handle('debug:writeLog', async (_event, payload: { filename: string; data: any }) => {
    try {
      const debugPath = path.join(app.getPath('userData'), payload.filename);
      const jsonString = JSON.stringify(payload.data, null, 2);
      fsSync.writeFileSync(debugPath, jsonString, 'utf-8');
      console.log(`Debug log written to: ${debugPath}`);
      return {
        success: true,
        path: debugPath,
      };
    } catch (error: any) {
      console.error('Error writing debug log:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // AI Comparison Analysis
  ipcMain.handle('ai:analyzeComparison', async (_event, question: string, context: any) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) {
        return {
          success: false,
          error: 'Gemini API key not found. Please set GEMINI_API_KEY environment variable.',
        };
      }

      console.log('Analyzing comparison with Gemini...');

      // Build context-aware prompt
      const systemPrompt = `You are an expert AI assistant helping users understand their LLM evaluation comparison results.

You have access to detailed comparison data between ${context.runCount} evaluation runs for project "${context.projectName}".

**Comparison Summary:**
- Total Tests: ${context.summary.totalTests}
- Consistent Tests: ${context.summary.consistentTests} (${context.summary.consistencyPercentage.toFixed(1)}%)
- Improved Tests: ${context.summary.improvedTests}
- Regressed Tests: ${context.summary.regressedTests}
- Changed Tests: ${context.summary.changedTests}
- Volatile Tests: ${context.summary.volatileTests}

**Metrics Across Runs:**
- Pass Rate: ${context.metrics.passRate.map((v: number, i: number) => `Run ${i + 1}: ${v.toFixed(1)}%`).join(', ')}
- Average Score: ${context.metrics.avgScore.map((v: number, i: number) => `Run ${i + 1}: ${v.toFixed(2)}`).join(', ')}
- Total Cost: ${context.metrics.totalCost.map((v: number, i: number) => `Run ${i + 1}: $${v.toFixed(3)}`).join(', ')}
- Average Latency: ${context.metrics.avgLatency.map((v: number, i: number) => `Run ${i + 1}: ${v.toFixed(0)}ms`).join(', ')}
- Token Usage: ${context.metrics.tokenUsage.map((v: number, i: number) => `Run ${i + 1}: ${v.toLocaleString()}`).join(', ')}

**Configuration Changes:**
- Prompt Changes: ${context.configChanges.promptChanges}
- Assertion Changes: ${context.configChanges.assertionChanges}
- Provider Changed: ${context.configChanges.providerChanged}

**Run Dates:**
${context.runDates.map((date: string, i: number) => `Run ${i + 1}: ${new Date(date).toLocaleString()}`).join('\n')}

Please provide helpful, concise, and actionable insights based on the user's question. Focus on:
- Identifying trends and patterns
- Explaining causes of changes
- Highlighting areas of concern
- Suggesting next steps or improvements
- Being specific with numbers and percentages

Keep responses conversational but informative. Use bullet points for clarity when listing multiple items.`;

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      // Build chat history
      const history = context.chatHistory.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

      const chat = model.startChat({
        history,
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        },
      });

      const result = await chat.sendMessage(`${systemPrompt}\n\nUser Question: ${question}`);
      const response = await result.response;
      const analysis = response.text();

      console.log('Comparison analysis completed');
      return {
        success: true,
        analysis,
      };
    } catch (error: any) {
      const sanitizedError = sanitizeLog(error.message || String(error));
      console.error('Error analyzing comparison:', sanitizedError);
      return {
        success: false,
        error: sanitizedError,
      };
    }
  });

  // ==================== LOG FILE HANDLERS ====================

  const LOG_FILE_PATH = path.join(app.getPath('userData'), 'application.log');
  const MAX_LOG_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * Write a log line to the application log file
   */
  ipcMain.handle('write-log', async (_event, logLine: string) => {
    // Ensure log file exists (create if needed)
    try {
      await fs.access(LOG_FILE_PATH);
    } catch {
      await fs.writeFile(LOG_FILE_PATH, '');
    }


    try {
      // Check file size and rotate if needed
      const stats = await fs.stat(LOG_FILE_PATH);
      if (stats.size > MAX_LOG_FILE_SIZE) {
        // Rotate: rename current to .old, start fresh
        const oldLogPath = LOG_FILE_PATH + '.old';
        await fs.rename(LOG_FILE_PATH, oldLogPath).catch(() => {});
      }

      // Append log line
      await fs.appendFile(LOG_FILE_PATH, logLine);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to write log:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Read the application log file
   */
  ipcMain.handle('read-logs', async (_event, options?: { lines?: number }) => {
    try {
      const content = await fs.readFile(LOG_FILE_PATH, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      if (options?.lines) {
        // Return last N lines
        return {
          success: true,
          logs: lines.slice(-options.lines).join('\n'),
          totalLines: lines.length,
        };
      }

      return {
        success: true,
        logs: content,
        totalLines: lines.length,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        logs: '',
        totalLines: 0,
      };
    }
  });

  /**
   * Clear the application log file
   */
  ipcMain.handle('clear-logs', async () => {
    try {
      await fs.writeFile(LOG_FILE_PATH, '');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Open log file in default editor
   */
  ipcMain.handle('open-log-file', async () => {
    try {
      await shell.openPath(LOG_FILE_PATH);
      return { success: true, path: LOG_FILE_PATH };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Get log file path
   */
  ipcMain.handle('get-log-file-path', async () => {
    return { success: true, path: LOG_FILE_PATH };
  });

  // =============================================================================
  // PROJECT METADATA HANDLERS
  // =============================================================================

  const METADATA_FILE_NAME = '.promptfoo-metadata.json';
  const DEFAULT_PROJECTS_FOLDER = 'prompt-evaluator/Projects';

  /**
   * Get metadata file path
   */
  function getMetadataFilePath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, METADATA_FILE_NAME);
  }

  /**
   * Get default projects directory path
   */
  function getDefaultProjectsPath(): string {
    const documentsPath = app.getPath('documents');
    return path.join(documentsPath, DEFAULT_PROJECTS_FOLDER);
  }

  /**
   * Load metadata store from disk
   */
  async function loadMetadataStore(): Promise<MetadataStore> {
    const metadataPath = getMetadataFilePath();
    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // Return default if file doesn't exist
      return {
        recentProjects: [],
        settings: {
          autoSave: true,
          autoSaveInterval: 30000,
          maxRecentProjects: 10,
          defaultProjectPath: getDefaultProjectsPath(),
        },
      };
    }
  }

  /**
   * Save metadata store to disk
   */
  async function saveMetadataStore(store: MetadataStore): Promise<void> {
    const metadataPath = getMetadataFilePath();
    await fs.writeFile(metadataPath, JSON.stringify(store, null, 2), 'utf-8');
  }

  /**
   * Get project metadata store
   */
  ipcMain.handle('project:getMetadataStore', async () => {
    try {
      return await loadMetadataStore();
    } catch (error: any) {
      console.error('Error loading metadata store:', error);
      throw new Error(`Failed to load metadata: ${error.message}`);
    }
  });

  /**
   * Update recent projects list
   */
  ipcMain.handle('project:updateRecent', async (_event, metadata: ProjectMetadata) => {
    try {
      const store = await loadMetadataStore();

      // Remove existing entry if present
      const filtered = store.recentProjects.filter(p => p.id !== metadata.id);

      // Add to front of list
      const updated = [metadata, ...filtered];

      // Limit to maxRecentProjects (but keep favorites)
      const favorites = updated.filter(p => p.favorite);
      const nonFavorites = updated.filter(p => !p.favorite);
      const limitedNonFavorites = nonFavorites.slice(
        0,
        store.settings.maxRecentProjects - favorites.length
      );

      store.recentProjects = [...favorites, ...limitedNonFavorites];

      await saveMetadataStore(store);
      return store;
    } catch (error: any) {
      console.error('Error updating recent projects:', error);
      throw new Error(`Failed to update recent projects: ${error.message}`);
    }
  });

  /**
   * Toggle favorite status
   */
  ipcMain.handle('project:toggleFavorite', async (_event, projectId: string) => {
    try {
      const store = await loadMetadataStore();

      store.recentProjects = store.recentProjects.map(p =>
        p.id === projectId ? { ...p, favorite: !p.favorite } : p
      );

      await saveMetadataStore(store);
      return store;
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      throw new Error(`Failed to toggle favorite: ${error.message}`);
    }
  });

  /**
   * Remove project from recent list
   */
  ipcMain.handle('project:removeFromRecent', async (_event, projectId: string) => {
    try {
      const store = await loadMetadataStore();

      store.recentProjects = store.recentProjects.filter(p => p.id !== projectId);

      await saveMetadataStore(store);
      return store;
    } catch (error: any) {
      console.error('Error removing from recent:', error);
      throw new Error(`Failed to remove from recent: ${error.message}`);
    }
  });

  /**
   * Save project to default location (auto-save)
   */
  ipcMain.handle('project:autoSave', async (_event, payload: { project: any; fileName: string }) => {
    try {
      const defaultPath = getDefaultProjectsPath();

      // Ensure directory exists
      await fs.mkdir(defaultPath, { recursive: true });

      const filePath = path.join(defaultPath, payload.fileName);
      const sanitizedProject = sanitizeJSON(payload.project);

      await fs.writeFile(filePath, JSON.stringify(sanitizedProject, null, 2), 'utf-8');

      return { success: true, filePath };
    } catch (error: any) {
      console.error('Error auto-saving project:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Load project by file path
   */
  ipcMain.handle('project:loadByPath', async (_event, filePath: string) => {
    try {
      const safePath = sanitizePath(filePath);
      const content = await fs.readFile(safePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      console.error('Error loading project by path:', error);
      throw new Error(`Failed to load project: ${error.message}`);
    }
  });

  /**
   * Get all projects from default directory
   */
  ipcMain.handle('project:getAllProjects', async () => {
    try {
      const defaultPath = getDefaultProjectsPath();

      // Ensure directory exists
      await fs.mkdir(defaultPath, { recursive: true });

      const files = await fs.readdir(defaultPath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      const projects = await Promise.all(
        jsonFiles.map(async (file) => {
          try {
            const filePath = path.join(defaultPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const project = JSON.parse(content);
            const stats = await fs.stat(filePath);

            return {
              name: project.name || file.replace('.json', ''),
              filePath,
              lastModified: stats.mtime.toISOString(),
              provider: project.providers?.[0]?.providerId,
            };
          } catch (error) {
            console.error(`Error reading project file ${file}:`, error);
            return null;
          }
        })
      );

      return projects.filter(p => p !== null);
    } catch (error: any) {
      console.error('Error getting all projects:', error);
      throw new Error(`Failed to get projects: ${error.message}`);
    }
  });

  /**
   * Delete project file
   */
  ipcMain.handle('project:deleteFile', async (_event, filePath: string) => {
    try {
      const safePath = sanitizePath(filePath);
      await fs.unlink(safePath);

      // Also remove from recent projects metadata
      const metadataPath = path.join(app.getPath('userData'), '.promptfoo-metadata.json');
      try {
        if (fsSync.existsSync(metadataPath)) {
          const metadataContent = await fs.readFile(metadataPath, 'utf-8');
          const metadata = JSON.parse(metadataContent);

          // Remove this project from recent projects
          if (metadata.recentProjects) {
            metadata.recentProjects = metadata.recentProjects.filter(
              (proj: any) => proj.filePath !== filePath
            );
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
          }
        }
      } catch (metaError) {
        console.warn('Failed to update metadata after project deletion:', metaError);
        // Don't fail the whole operation if metadata update fails
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting project:', error);
      return { success: false, error: error.message };
    }
  });

  // Clear all recent projects
  ipcMain.handle('project:clearRecentProjects', async () => {
    try {
      const metadataPath = path.join(app.getPath('userData'), '.promptfoo-metadata.json');

      if (fsSync.existsSync(metadataPath)) {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);

        // Clear recent projects array
        metadata.recentProjects = [];

        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
        return { success: true, metadata };
      }

      return { success: true, metadata: { recentProjects: [] } };
    } catch (error: any) {
      console.error('Error clearing recent projects:', error);
      return { success: false, error: error.message };
    }
  });
}
