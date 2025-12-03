/**
 * API Key Validation Utilities
 * Validates API keys for different providers and provides helpful error messages
 */

export interface ApiKeyValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
  envVarName?: string;
  docsUrl?: string;
}

// Map provider prefixes to their expected API key formats and environment variables
export const PROVIDER_API_KEY_CONFIGS: Record<string, {
  envVarName: string;
  format: RegExp;
  formatDescription: string;
  docsUrl: string;
  getApiKeyUrl: string;
}> = {
  'openai': {
    envVarName: 'OPENAI_API_KEY',
    format: /^sk-(proj-)?[a-zA-Z0-9]{20,}$/,
    formatDescription: 'sk-... or sk-proj-...',
    docsUrl: 'https://platform.openai.com/docs/api-reference/authentication',
    getApiKeyUrl: 'https://platform.openai.com/api-keys',
  },
  'anthropic': {
    envVarName: 'ANTHROPIC_API_KEY',
    format: /^sk-ant-[a-zA-Z0-9\-_]{95,}$/,
    formatDescription: 'sk-ant-...',
    docsUrl: 'https://docs.anthropic.com/en/api/getting-started',
    getApiKeyUrl: 'https://console.anthropic.com/settings/keys',
  },
  'google': {
    envVarName: 'GEMINI_API_KEY',
    format: /^[A-Za-z0-9_-]{39}$/,
    formatDescription: '39-character alphanumeric key',
    docsUrl: 'https://ai.google.dev/tutorials/setup',
    getApiKeyUrl: 'https://makersuite.google.com/app/apikey',
  },
  'vertex': {
    envVarName: 'GOOGLE_APPLICATION_CREDENTIALS',
    format: /.+\.json$/,
    formatDescription: 'Path to service account JSON file',
    docsUrl: 'https://cloud.google.com/vertex-ai/docs/authentication',
    getApiKeyUrl: 'https://console.cloud.google.com/iam-admin/serviceaccounts',
  },
  'bedrock': {
    envVarName: 'AWS_ACCESS_KEY_ID',
    format: /^AKIA[0-9A-Z]{16}$/,
    formatDescription: 'AKIA...',
    docsUrl: 'https://docs.aws.amazon.com/bedrock/latest/userguide/security-iam.html',
    getApiKeyUrl: 'https://console.aws.amazon.com/iam/home#/security_credentials',
  },
  'azureopenai': {
    envVarName: 'AZURE_OPENAI_API_KEY',
    format: /^[a-f0-9]{32}$/,
    formatDescription: '32-character hexadecimal key',
    docsUrl: 'https://learn.microsoft.com/en-us/azure/ai-services/openai/quickstart',
    getApiKeyUrl: 'https://portal.azure.com/',
  },
  'mistral': {
    envVarName: 'MISTRAL_API_KEY',
    format: /^[a-zA-Z0-9]{32}$/,
    formatDescription: '32-character alphanumeric key',
    docsUrl: 'https://docs.mistral.ai/api/',
    getApiKeyUrl: 'https://console.mistral.ai/api-keys',
  },
  'cohere': {
    envVarName: 'COHERE_API_KEY',
    format: /^[a-zA-Z0-9-_]{40}$/,
    formatDescription: '40-character alphanumeric key',
    docsUrl: 'https://docs.cohere.com/docs/authentication',
    getApiKeyUrl: 'https://dashboard.cohere.com/api-keys',
  },
  'groq': {
    envVarName: 'GROQ_API_KEY',
    format: /^gsk_[a-zA-Z0-9]{52}$/,
    formatDescription: 'gsk_...',
    docsUrl: 'https://console.groq.com/docs/quickstart',
    getApiKeyUrl: 'https://console.groq.com/keys',
  },
  'perplexity': {
    envVarName: 'PERPLEXITY_API_KEY',
    format: /^pplx-[a-f0-9]{40}$/,
    formatDescription: 'pplx-...',
    docsUrl: 'https://docs.perplexity.ai/docs/getting-started',
    getApiKeyUrl: 'https://www.perplexity.ai/settings/api',
  },
  'huggingface': {
    envVarName: 'HUGGINGFACE_API_KEY',
    format: /^hf_[a-zA-Z0-9]{34,}$/,
    formatDescription: 'hf_...',
    docsUrl: 'https://huggingface.co/docs/api-inference/quicktour',
    getApiKeyUrl: 'https://huggingface.co/settings/tokens',
  },
  'replicate': {
    envVarName: 'REPLICATE_API_TOKEN',
    format: /^r8_[a-zA-Z0-9]{40}$/,
    formatDescription: 'r8_...',
    docsUrl: 'https://replicate.com/docs/reference/http',
    getApiKeyUrl: 'https://replicate.com/account/api-tokens',
  },
  'deepseek': {
    envVarName: 'DEEPSEEK_API_KEY',
    format: /^sk-[a-f0-9]{48}$/,
    formatDescription: 'sk-...',
    docsUrl: 'https://platform.deepseek.com/docs',
    getApiKeyUrl: 'https://platform.deepseek.com/api_keys',
  },
  'xai': {
    envVarName: 'XAI_API_KEY',
    format: /^xai-[a-zA-Z0-9-_]{40,}$/,
    formatDescription: 'xai-...',
    docsUrl: 'https://docs.x.ai/api',
    getApiKeyUrl: 'https://console.x.ai/',
  },
  'openrouter': {
    envVarName: 'OPENROUTER_API_KEY',
    format: /^sk-or-v1-[a-f0-9]{64}$/,
    formatDescription: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/docs',
    getApiKeyUrl: 'https://openrouter.ai/keys',
  },
  'together': {
    envVarName: 'TOGETHER_API_KEY',
    format: /^[a-f0-9]{64}$/,
    formatDescription: '64-character hexadecimal key',
    docsUrl: 'https://docs.together.ai/docs/quickstart',
    getApiKeyUrl: 'https://api.together.xyz/settings/api-keys',
  },
  'fireworks': {
    envVarName: 'FIREWORKS_API_KEY',
    format: /^fw_[a-zA-Z0-9]{40,}$/,
    formatDescription: 'fw_...',
    docsUrl: 'https://readme.fireworks.ai/docs/quickstart',
    getApiKeyUrl: 'https://fireworks.ai/api-keys',
  },
  'cloudflare': {
    envVarName: 'CLOUDFLARE_API_KEY',
    format: /^[a-zA-Z0-9_-]{40}$/,
    formatDescription: '40-character alphanumeric key',
    docsUrl: 'https://developers.cloudflare.com/workers-ai/get-started/rest-api/',
    getApiKeyUrl: 'https://dash.cloudflare.com/profile/api-tokens',
  },
  'anyscale': {
    envVarName: 'ANYSCALE_API_KEY',
    format: /^[a-zA-Z0-9_-]{40,}$/,
    formatDescription: 'Alphanumeric key',
    docsUrl: 'https://docs.anyscale.com/endpoints/get-started',
    getApiKeyUrl: 'https://console.anyscale.com/credentials',
  },
};

// Providers that don't require API keys (local models)
const NO_API_KEY_PROVIDERS = ['ollama'];

/**
 * Get the provider prefix from a provider ID
 * Example: "openai:gpt-4" -> "openai"
 */
export function getProviderPrefix(providerId: string): string {
  if (!providerId || !providerId.includes(':')) {
    return '';
  }
  return providerId.split(':')[0].toLowerCase();
}

/**
 * Check if a provider requires an API key
 */
export function requiresApiKey(providerId: string): boolean {
  const prefix = getProviderPrefix(providerId);
  return !NO_API_KEY_PROVIDERS.includes(prefix);
}

/**
 * Validate API key format for a specific provider
 */
export function validateApiKeyFormat(providerId: string, apiKey: string): ApiKeyValidationResult {
  const prefix = getProviderPrefix(providerId);

  // Ollama and other local providers don't need API keys
  if (!requiresApiKey(providerId)) {
    return { isValid: true };
  }

  // No API key provided
  if (!apiKey || apiKey.trim() === '') {
    const config = PROVIDER_API_KEY_CONFIGS[prefix];
    if (config) {
      return {
        isValid: false,
        error: `${config.envVarName} is not configured`,
        suggestion: `Add your API key to the .env file or provide it in the "API Key (Optional)" field below.`,
        envVarName: config.envVarName,
        docsUrl: config.docsUrl,
      };
    }
    return {
      isValid: false,
      error: 'API key is required for this provider',
      suggestion: 'Please provide an API key in the "API Key (Optional)" field or configure it in your .env file.',
    };
  }

  // Validate format if we have a config for this provider
  const config = PROVIDER_API_KEY_CONFIGS[prefix];
  if (config) {
    const isValidFormat = config.format.test(apiKey.trim());
    if (!isValidFormat) {
      return {
        isValid: false,
        error: `Invalid API key format for ${prefix}`,
        suggestion: `Expected format: ${config.formatDescription}. Get your API key from ${config.getApiKeyUrl}`,
        envVarName: config.envVarName,
        docsUrl: config.docsUrl,
      };
    }
  }

  return { isValid: true };
}

/**
 * Get API key from environment or explicit value
 * This should be called from the Electron main process, not in the renderer
 */
export function getApiKeyForProvider(providerId: string, explicitApiKey?: string): string | undefined {
  if (explicitApiKey && explicitApiKey.trim() !== '') {
    return explicitApiKey.trim();
  }

  const prefix = getProviderPrefix(providerId);
  const config = PROVIDER_API_KEY_CONFIGS[prefix];

  if (!config) {
    return undefined;
  }

  // In Electron, this would check process.env
  // In browser, this returns undefined (keys must be explicit)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[config.envVarName];
  }

  return undefined;
}

/**
 * Get helpful message for missing API key
 */
export function getApiKeyHelpMessage(providerId: string): {
  message: string;
  envVarName?: string;
  getApiKeyUrl?: string;
  docsUrl?: string;
} {
  const prefix = getProviderPrefix(providerId);

  if (!requiresApiKey(providerId)) {
    return {
      message: 'This provider runs locally and does not require an API key.',
    };
  }

  const config = PROVIDER_API_KEY_CONFIGS[prefix];

  if (!config) {
    return {
      message: 'Please configure your API key in the .env file or provide it below.',
    };
  }

  return {
    message: `To use ${prefix.toUpperCase()}, you need to configure ${config.envVarName}.`,
    envVarName: config.envVarName,
    getApiKeyUrl: config.getApiKeyUrl,
    docsUrl: config.docsUrl,
  };
}

/**
 * Get the .env file path for the current platform
 */
export function getEnvFilePath(): string {
  // Detect platform
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const isWindows = navigator.platform.toUpperCase().indexOf('WIN') >= 0;

  if (isMac) {
    return '~/Library/Application Support/prompt-evaluator/.env';
  } else if (isWindows) {
    return '%APPDATA%\\prompt-evaluator\\.env';
  } else {
    // Linux
    return '~/.config/prompt-evaluator/.env';
  }
}
