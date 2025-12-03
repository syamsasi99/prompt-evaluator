import React, { useState, useEffect, useRef } from 'react';
import type { Provider } from '../lib/types';
import { useToast } from '../contexts/ToastContext';
import {
  requiresApiKey,
  validateApiKeyFormat,
  getApiKeyHelpMessage,
  getProviderPrefix,
  PROVIDER_API_KEY_CONFIGS,
  getEnvFilePath,
} from '../lib/apiKeyValidation';
import { logger } from '../lib/logger';

interface ProvidersFormProps {
  providers: Provider[];
  onChange: (providers: Provider[]) => void;
  onValidationChange?: (hasErrors: boolean) => void;
  shouldValidate?: boolean;
}

// Categorized provider list based on promptfoo documentation
export const PROVIDER_CATEGORIES = {
  'OpenAI': [
    { id: 'openai:gpt-4o', label: 'GPT-4o' },
    { id: 'openai:gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'openai:gpt-4-turbo', label: 'GPT-4 Turbo' },
    { id: 'openai:gpt-4', label: 'GPT-4' },
    { id: 'openai:gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { id: 'openai:o1', label: 'O1 (Reasoning)' },
    { id: 'openai:o1-mini', label: 'O1 Mini (Reasoning)' },
    { id: 'openai:o3-mini', label: 'O3 Mini (Reasoning)' },
  ],
  'Anthropic': [
    { id: 'anthropic:claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (May 2025)' },
    { id: 'anthropic:claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Oct 2024)' },
    { id: 'anthropic:claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet (Jun 2024)' },
    { id: 'anthropic:claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { id: 'anthropic:claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
    { id: 'anthropic:claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ],
  'Google': [
    { id: 'google:gemini-2.5-pro', label: 'Gemini 2.5 Pro - Latest stable reasoning, coding, multimodal' },
    { id: 'google:gemini-2.5-flash', label: 'Gemini 2.5 Flash - Enhanced reasoning/thinking' },
    { id: 'google:gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite - Most cost-efficient & fastest' },
    { id: 'google:gemini-2.5-flash-preview-09-2025', label: 'Gemini 2.5 Flash Preview (Sep 2025)' },
    { id: 'google:gemini-2.0-pro', label: 'Gemini 2.0 Pro - Earlier generation' },
    { id: 'google:gemini-2.0-flash', label: 'Gemini 2.0 Flash - Earlier flash model' },
    { id: 'google:gemini-1.5-flash', label: 'Gemini 1.5 Flash - Earlier generation' },
    { id: 'google:gemini-1.5-pro', label: 'Gemini 1.5 Pro - Earlier generation' },
    { id: 'google:gemini-pro', label: 'Gemini Pro - General purpose' },
    { id: 'google:gemini-pro-vision', label: 'Gemini Pro Vision - Multimodal' },
  ],
  'Google Vertex AI': [
    { id: 'vertex:gemini-2.5-pro', label: 'Gemini 2.5 Pro - Latest stable reasoning, coding, multimodal' },
    { id: 'vertex:gemini-2.5-flash', label: 'Gemini 2.5 Flash - Enhanced reasoning/thinking' },
    { id: 'vertex:gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite - Most cost-efficient & fastest' },
    { id: 'vertex:gemini-2.5-flash-preview-09-2025', label: 'Gemini 2.5 Flash Preview (Sep 2025)' },
    { id: 'vertex:gemini-2.0-pro', label: 'Gemini 2.0 Pro - Earlier generation' },
    { id: 'vertex:gemini-2.0-flash', label: 'Gemini 2.0 Flash - Earlier flash model' },
    { id: 'vertex:gemini-1.5-flash', label: 'Gemini 1.5 Flash - Earlier generation' },
    { id: 'vertex:gemini-1.5-pro', label: 'Gemini 1.5 Pro - Earlier generation' },
    { id: 'vertex:gemini-pro', label: 'Gemini Pro - General purpose' },
    { id: 'vertex:gemini-pro-vision', label: 'Gemini Pro Vision - Multimodal' },
  ],
  'AWS Bedrock': [
    { id: 'bedrock:anthropic.claude-3-5-sonnet-20241022-v2:0', label: 'Claude 3.5 Sonnet v2' },
    { id: 'bedrock:anthropic.claude-3-5-sonnet-20240620-v1:0', label: 'Claude 3.5 Sonnet' },
    { id: 'bedrock:anthropic.claude-3-opus-20240229-v1:0', label: 'Claude 3 Opus' },
    { id: 'bedrock:anthropic.claude-3-haiku-20240307-v1:0', label: 'Claude 3 Haiku' },
    { id: 'bedrock:meta.llama3-3-70b-instruct-v1:0', label: 'Llama 3.3 70B' },
    { id: 'bedrock:meta.llama3-1-70b-instruct-v1:0', label: 'Llama 3.1 70B' },
    { id: 'bedrock:amazon.nova-pro-v1:0', label: 'Amazon Nova Pro' },
    { id: 'bedrock:amazon.nova-lite-v1:0', label: 'Amazon Nova Lite' },
    { id: 'bedrock:amazon.nova-micro-v1:0', label: 'Amazon Nova Micro' },
  ],
  'Azure OpenAI': [
    { id: 'azureopenai:gpt-4o', label: 'GPT-4o' },
    { id: 'azureopenai:gpt-4-turbo', label: 'GPT-4 Turbo' },
    { id: 'azureopenai:gpt-4', label: 'GPT-4' },
    { id: 'azureopenai:gpt-35-turbo', label: 'GPT-3.5 Turbo' },
  ],
  'Mistral': [
    { id: 'mistral:mistral-large-latest', label: 'Mistral Large' },
    { id: 'mistral:mistral-medium-latest', label: 'Mistral Medium' },
    { id: 'mistral:mistral-small-latest', label: 'Mistral Small' },
    { id: 'mistral:open-mixtral-8x7b', label: 'Mixtral 8x7B' },
    { id: 'mistral:open-mistral-7b', label: 'Mistral 7B' },
  ],
  'Cohere': [
    { id: 'cohere:command-r-plus', label: 'Command R+' },
    { id: 'cohere:command-r', label: 'Command R' },
    { id: 'cohere:command', label: 'Command' },
    { id: 'cohere:command-light', label: 'Command Light' },
  ],
  'Groq': [
    { id: 'groq:llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
    { id: 'groq:llama-3.1-70b-versatile', label: 'Llama 3.1 70B' },
    { id: 'groq:mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
    { id: 'groq:gemma2-9b-it', label: 'Gemma 2 9B' },
  ],
  'Perplexity': [
    { id: 'perplexity:llama-3.1-sonar-large-128k-online', label: 'Sonar Large (Online)' },
    { id: 'perplexity:llama-3.1-sonar-small-128k-online', label: 'Sonar Small (Online)' },
    { id: 'perplexity:llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
  ],
  'Ollama (Local)': [
    { id: 'ollama:llama3.3', label: 'Llama 3.3' },
    { id: 'ollama:llama3.1', label: 'Llama 3.1' },
    { id: 'ollama:mistral', label: 'Mistral' },
    { id: 'ollama:mixtral', label: 'Mixtral' },
    { id: 'ollama:gemma2', label: 'Gemma 2' },
    { id: 'ollama:qwen2.5', label: 'Qwen 2.5' },
    { id: 'ollama:phi3', label: 'Phi-3' },
  ],
  'Hugging Face': [
    { id: 'huggingface:text-generation:meta-llama/Llama-3.3-70B-Instruct', label: 'Llama 3.3 70B' },
    { id: 'huggingface:text-generation:mistralai/Mixtral-8x7B-Instruct-v0.1', label: 'Mixtral 8x7B' },
    { id: 'huggingface:text-generation:google/gemma-2-9b-it', label: 'Gemma 2 9B' },
  ],
  'Replicate': [
    { id: 'replicate:meta/meta-llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
    { id: 'replicate:mistralai/mixtral-8x7b-instruct-v0.1', label: 'Mixtral 8x7B' },
  ],
  'DeepSeek': [
    { id: 'deepseek:deepseek-chat', label: 'DeepSeek Chat' },
    { id: 'deepseek:deepseek-reasoner', label: 'DeepSeek Reasoner (R1)' },
    { id: 'deepseek:deepseek-coder', label: 'DeepSeek Coder' },
  ],
  'xAI': [
    { id: 'xai:grok-beta', label: 'Grok Beta' },
    { id: 'xai:grok-2-1212', label: 'Grok 2' },
  ],
  'OpenRouter': [
    { id: 'openrouter:anthropic/claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { id: 'openrouter:openai/gpt-4o', label: 'GPT-4o' },
    { id: 'openrouter:google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'openrouter:deepseek/deepseek-reasoner', label: 'DeepSeek Reasoner' },
  ],
  'Other': [
    { id: 'together:meta-llama/Llama-3.3-70B-Instruct-Turbo', label: 'Together AI - Llama 3.3' },
    { id: 'fireworks:accounts/fireworks/models/llama-v3p3-70b-instruct', label: 'Fireworks - Llama 3.3' },
    { id: 'cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast', label: 'Cloudflare - Llama 3.3' },
    { id: 'anyscale:meta-llama/Llama-3.3-70B-Instruct', label: 'Anyscale - Llama 3.3' },
  ],
};

// Flatten for datalist
const COMMON_PROVIDERS = Object.entries(PROVIDER_CATEGORIES).flatMap(([category, providers]) =>
  providers.map(p => ({ id: p.id, label: `${category}: ${p.label}` }))
);

const MAX_PROVIDERS = 10;

export function ProvidersForm({ providers, onChange, onValidationChange, shouldValidate }: ProvidersFormProps) {
  const toast = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [configJson, setConfigJson] = useState<string>('{}');
  const [showProviderList, setShowProviderList] = useState<string | null>(null);
  const [providerErrors, setProviderErrors] = useState<Record<string, string>>({});
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [apiKeyWarnings, setApiKeyWarnings] = useState<Record<string, { error: string; suggestion: string; docsUrl?: string }>>({});
  const [envApiKeyStatus, setEnvApiKeyStatus] = useState<Record<string, boolean>>({});
  const [lastAddedProviderId, setLastAddedProviderId] = useState<string | null>(null);
  const [validatingApiKey, setValidatingApiKey] = useState<Record<string, boolean>>({});
  const [apiKeyValidation, setApiKeyValidation] = useState<Record<string, { isValid: boolean; message?: string; error?: string }>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Check API keys for all providers
  useEffect(() => {
    const checkApiKeys = async () => {
      const warnings: Record<string, { error: string; suggestion: string; docsUrl?: string }> = {};
      const envStatus: Record<string, boolean> = {};

      for (const provider of providers) {
        if (!provider.providerId || !requiresApiKey(provider.providerId)) {
          continue;
        }

        const prefix = getProviderPrefix(provider.providerId);
        const config = PROVIDER_API_KEY_CONFIGS[prefix];

        if (!config) {
          continue;
        }

        // Check if API key is explicitly provided in config
        const explicitApiKey = provider.config?.apiKey as string | undefined;

        if (explicitApiKey) {
          // Validate the explicit API key format
          const validation = validateApiKeyFormat(provider.providerId, explicitApiKey);
          if (!validation.isValid) {
            warnings[provider.id] = {
              error: validation.error || 'Invalid API key',
              suggestion: validation.suggestion || 'Please check your API key format',
              docsUrl: validation.docsUrl,
            };
          }
          envStatus[provider.id] = true; // Has explicit key
        } else {
          // Check if API key exists in environment and auto-fill it
          if (window.api?.getApiKeyFromEnv) {
            try {
              const result = await window.api.getApiKeyFromEnv(config.envVarName);
              envStatus[provider.id] = result.hasApiKey;

              if (result.hasApiKey && result.apiKey) {
                // Auto-fill the API key from .env file
                logger.info('api-key', `Auto-filling ${config.envVarName} from .env file for provider ${provider.id}`);
                const updatedConfig = { ...provider.config, apiKey: result.apiKey };
                updateProvider(provider.id, { config: updatedConfig });
              } else {
                // No API key in environment
                const helpMessage = getApiKeyHelpMessage(provider.providerId);
                const envFilePath = getEnvFilePath();
                warnings[provider.id] = {
                  error: `${config.envVarName} not found`,
                  suggestion: `Get your API key from ${config.getApiKeyUrl} and add it to your .env file (${envFilePath}) or paste it in the "API Key (Optional)" field below.`,
                  docsUrl: config.docsUrl,
                };
              }
            } catch (error) {
              console.error('Error getting API key from env:', error);
            }
          }
        }
      }

      setApiKeyWarnings(warnings);
      setEnvApiKeyStatus(envStatus);
    };

    checkApiKeys();
  }, [providers]);

  // Validate all providers when shouldValidate changes to true
  React.useEffect(() => {
    if (shouldValidate) {
      const newErrors: Record<string, string> = {};
      providers.forEach(provider => {
        const error = validateProviderId(provider.providerId);
        if (error) {
          newErrors[provider.id] = error;
        }
      });
      setProviderErrors(newErrors);
    }
  }, [shouldValidate, providers]);

  // Notify parent component of validation status
  React.useEffect(() => {
    // Only report validation errors, don't check for invalid providers unless validation is triggered
    const hasErrors = Object.keys(providerErrors).length > 0 ||
                      (shouldValidate === true && (
                        providers.length === 0 ||
                        providers.some(p => !p.providerId || !p.providerId.includes(':'))
                      ));
    if (onValidationChange) {
      onValidationChange(hasErrors);
    }
  }, [providerErrors, providers, shouldValidate]); // Removed onValidationChange from deps to avoid loops

  // Validate provider ID format
  const validateProviderId = (providerId: string): string | null => {
    if (!providerId || providerId.trim() === '') {
      return 'Provider ID is required';
    }

    // Check for valid format: provider:model
    if (!providerId.includes(':')) {
      return 'Provider ID must be in format "provider:model" (e.g., openai:gpt-4o)';
    }

    const parts = providerId.split(':');
    if (parts.length < 2) {
      return 'Provider ID must be in format "provider:model"';
    }

    const [provider, ...modelParts] = parts;
    const model = modelParts.join(':');

    if (!provider || provider.trim() === '') {
      return 'Provider name is missing (before the colon)';
    }

    if (!model || model.trim() === '') {
      return 'Model name is missing (after the colon)';
    }

    // Check for valid characters (alphanumeric, hyphens, underscores, dots, slashes, @)
    const validPattern = /^[a-zA-Z0-9\-_.@\/]+:[a-zA-Z0-9\-_.@\/:\s]+$/;
    if (!validPattern.test(providerId)) {
      return 'Provider ID contains invalid characters';
    }

    return null;
  };

  // Test API key by making an actual API call
  const testApiKey = async (providerId: string, apiKey: string, providerInternalId: string) => {
    if (!apiKey || apiKey.trim() === '') {
      toast.error('Please enter an API key to test');
      return;
    }

    if (!providerId || providerId.trim() === '') {
      toast.error('Please select a provider first');
      return;
    }

    setValidatingApiKey({ ...validatingApiKey, [providerInternalId]: true });
    logger.info('api-validation', `Testing API key for provider: ${providerId}`);

    try {
      const result = await window.api.validateApiKey(providerId, apiKey);

      if (result.success && result.isValid) {
        logger.info('api-validation', `API key validation successful for ${providerId}`);
        setApiKeyValidation({
          ...apiKeyValidation,
          [providerInternalId]: { isValid: true, message: result.message || 'API key is valid' }
        });
        // Clear any warnings since validation passed
        const newWarnings = { ...apiKeyWarnings };
        delete newWarnings[providerInternalId];
        setApiKeyWarnings(newWarnings);
        toast.success('API key is valid!');

        // Check if we should save to .env file
        const prefix = getProviderPrefix(providerId);
        const config = PROVIDER_API_KEY_CONFIGS[prefix];

        if (config) {
          // Check if the key already exists in environment
          const envCheckResult = await window.api.checkApiKey(config.envVarName);

          // Only prompt if the key doesn't exist in .env
          if (!envCheckResult.hasApiKey) {
            const shouldSave = window.confirm(
              `API key validated successfully!\n\n` +
              `Would you like to save this API key to your .env file?\n\n` +
              `Location: ${await window.api.getUserDataPath()}/.env\n` +
              `Variable: ${config.envVarName}\n\n` +
              `This will allow the app to use this key automatically without entering it each time.`
            );

            if (shouldSave) {
              try {
                const saveResult = await window.api.saveApiKeyToEnv(config.envVarName, apiKey);

                if (saveResult.success) {
                  logger.info('api-validation', `Saved ${config.envVarName} to .env file`);
                  toast.success(`API key saved to .env file!`);
                } else {
                  logger.error('api-validation', `Failed to save API key: ${saveResult.error}`);
                  toast.error(`Failed to save: ${saveResult.error}`);
                }
              } catch (error: any) {
                logger.error('api-validation', `Error saving API key`, error);
                toast.error('Failed to save API key to .env file');
              }
            }
          } else {
            logger.info('api-validation', `${config.envVarName} already exists in .env, skipping save prompt`);
          }
        }
      } else {
        logger.error('api-validation', `API key validation failed for ${providerId}: ${result.error}`);
        setApiKeyValidation({
          ...apiKeyValidation,
          [providerInternalId]: { isValid: false, error: result.error || 'Invalid API key' }
        });
        toast.error(result.error || 'Invalid API key');
      }
    } catch (error: any) {
      logger.error('api-validation', `Error testing API key for ${providerId}`, error);
      setApiKeyValidation({
        ...apiKeyValidation,
        [providerInternalId]: { isValid: false, error: error.message || 'Failed to test API key' }
      });
      toast.error('Failed to test API key. Please try again.');
    } finally {
      setValidatingApiKey({ ...validatingApiKey, [providerInternalId]: false });
    }
  };

  const addProvider = () => {
    // Check max providers limit
    if (providers.length >= MAX_PROVIDERS) {
      logger.warn('providers', `Failed to add provider: Maximum ${MAX_PROVIDERS} providers limit reached`);
      toast.warning(`Maximum ${MAX_PROVIDERS} providers allowed. Please remove a provider before adding a new one.`);
      return;
    }

    // Check if all existing providers have valid provider IDs
    const hasEmptyProvider = providers.some(p => !p.providerId || p.providerId.trim() === '');
    if (hasEmptyProvider) {
      logger.warn('providers', 'Failed to add provider: Existing provider has no provider ID');
      toast.warning('Please select a provider for all existing providers before adding a new one.');
      return;
    }

    // Check if any existing provider has validation errors
    const hasInvalidProvider = providers.some(p => {
      const error = validateProviderId(p.providerId);
      return error !== null;
    });
    if (hasInvalidProvider) {
      logger.warn('providers', 'Failed to add provider: Existing provider has invalid provider ID');
      toast.warning('Please fix all provider validation errors before adding a new one.');
      return;
    }

    const newProvider: Provider = {
      id: `provider-${Date.now()}`,
      providerId: '',
      config: {},
    };
    logger.info('providers', 'Provider slot added (awaiting selection)', {
      providerId: newProvider.id,
      totalProviders: providers.length + 1
    });
    setLastAddedProviderId(newProvider.id);
    onChange([...providers, newProvider]);
  };

  // Focus the newly added provider input
  useEffect(() => {
    if (lastAddedProviderId && inputRefs.current[lastAddedProviderId]) {
      setTimeout(() => {
        inputRefs.current[lastAddedProviderId]?.focus();
        inputRefs.current[lastAddedProviderId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setLastAddedProviderId(null);
      }, 100);
    }
  }, [lastAddedProviderId, providers]);

  const selectProvider = (providerId: string, providerInternalId: string) => {
    // Validate format
    const validationError = validateProviderId(providerId);
    if (validationError) {
      logger.warn('providers', 'Provider selection failed: Invalid provider ID', {
        providerId,
        error: validationError
      });
      toast.error(`Invalid provider ID: ${validationError}`);
      return;
    }

    // Check for duplicate provider ID
    const isDuplicate = providers.some(
      p => p.id !== providerInternalId && p.providerId === providerId
    );

    if (isDuplicate) {
      logger.warn('providers', 'Provider selection failed: Duplicate provider', {
        providerId
      });
      toast.warning(`Provider "${providerId}" is already added. Please choose a different provider to avoid duplicates.`);
      return;
    }

    logger.info('providers', 'Provider selected', {
      providerId,
      internalId: providerInternalId
    });
    toast.success('Provider added successfully!');

    // Clear any existing error
    const newErrors = { ...providerErrors };
    delete newErrors[providerInternalId];
    setProviderErrors(newErrors);

    updateProvider(providerInternalId, { providerId });
    setShowProviderList(null);
  };

  const removeProvider = (id: string) => {
    const providerToRemove = providers.find(p => p.id === id);
    logger.info('providers', 'Provider removed', {
      providerId: providerToRemove?.providerId || 'unselected',
      internalId: id,
      totalProviders: providers.length - 1
    });

    // Clean up errors for the removed provider
    const newErrors = { ...providerErrors };
    delete newErrors[id];
    setProviderErrors(newErrors);

    // Clean up other state for the removed provider
    const newShowApiKeys = { ...showApiKeys };
    delete newShowApiKeys[id];
    setShowApiKeys(newShowApiKeys);

    const newApiKeyWarnings = { ...apiKeyWarnings };
    delete newApiKeyWarnings[id];
    setApiKeyWarnings(newApiKeyWarnings);

    const newEnvApiKeyStatus = { ...envApiKeyStatus };
    delete newEnvApiKeyStatus[id];
    setEnvApiKeyStatus(newEnvApiKeyStatus);

    onChange(providers.filter((p) => p.id !== id));
    toast.success('Provider removed successfully!');
  };

  const updateProvider = (id: string, updates: Partial<Provider>) => {
    const provider = providers.find(p => p.id === id);
    const changedFields = Object.keys(updates);
    let hasValidationError = false;

    // If updating providerId, validate and check for duplicates
    if (updates.providerId !== undefined) {
      // Validate format
      const validationError = validateProviderId(updates.providerId);
      if (validationError) {
        hasValidationError = true;
        setProviderErrors({ ...providerErrors, [id]: validationError });
      } else {
        // Clear error if valid
        const newErrors = { ...providerErrors };
        delete newErrors[id];
        setProviderErrors(newErrors);
      }

      // Check for duplicates (only if non-empty)
      if (updates.providerId !== '') {
        const isDuplicate = providers.some(
          p => p.id !== id && p.providerId === updates.providerId
        );

        if (isDuplicate) {
          hasValidationError = true;
          setProviderErrors({ ...providerErrors, [id]: `Provider "${updates.providerId}" is already added` });
          return;
        }
      }
    }

    logger.debug('providers', 'Provider updated', {
      providerId: provider?.providerId || 'unselected',
      internalId: id,
      fields: changedFields.join(', '),
      hasErrors: hasValidationError
    });

    onChange(
      providers.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const toggleConfig = (id: string) => {
    if (editingId === id) {
      setEditingId(null);
    } else {
      const provider = providers.find((p) => p.id === id);
      const currentConfig = provider?.config || {};

      // Add default transform if config is empty
      const configWithDefaults = Object.keys(currentConfig).length === 0 ? {
        transform: `// Strip markdown code fences if present
if (typeof output === 'string') {
  output = output.trim();
  // Remove \`\`\`json and \`\`\` markers
  if (output.startsWith('\`\`\`json')) {
    output = output.substring(7);
  } else if (output.startsWith('\`\`\`')) {
    output = output.substring(3);
  }
  if (output.endsWith('\`\`\`')) {
    output = output.substring(0, output.length - 3);
  }
  output = output.trim();
}
return output;`
      } : currentConfig;

      setConfigJson(JSON.stringify(configWithDefaults, null, 2));
      setEditingId(id);
    }
  };

  const saveConfig = (id: string) => {
    try {
      const config = JSON.parse(configJson);
      updateProvider(id, { config });
      setEditingId(null);
      toast.success('Configuration saved successfully!');
    } catch (error) {
      toast.error('Invalid JSON configuration');
    }
  };

  const isMaxProviders = providers.length >= MAX_PROVIDERS;
  const hasEmptyOrInvalidProvider = providers.some(p => {
    if (!p.providerId || p.providerId.trim() === '') return true;
    const error = validateProviderId(p.providerId);
    return error !== null;
  });
  const canAddProvider = !isMaxProviders && !hasEmptyOrInvalidProvider;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Providers</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {providers.length} / {MAX_PROVIDERS} providers
            {isMaxProviders && <span className="text-orange-600 dark:text-orange-400 ml-2">(Maximum reached)</span>}
          </p>
        </div>
        <button
          onClick={addProvider}
          disabled={!canAddProvider}
          className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
          title={
            isMaxProviders
              ? `Maximum ${MAX_PROVIDERS} providers allowed`
              : hasEmptyOrInvalidProvider
              ? 'Please fill in all existing providers with valid IDs before adding a new one'
              : 'Add a new provider'
          }
        >
          + Add Provider
        </button>
      </div>

      {providers.length === 0 && shouldValidate && (
        <div className="text-sm text-red-600 p-4 border border-red-300 bg-red-50 rounded">
          At least one provider is required. Add a provider to continue.
        </div>
      )}

      {providers.length === 0 && !shouldValidate && (
        <div className="text-sm text-muted-foreground p-4 border border-dashed rounded">
          No providers configured. Add at least one provider to continue.
        </div>
      )}

      <div className="space-y-3">
        {providers.map((provider) => (
          <div key={provider.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">
                  Provider ID
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      ref={(el) => (inputRefs.current[provider.id] = el)}
                      type="text"
                      value={provider.providerId}
                      onChange={(e) =>
                        updateProvider(provider.id, { providerId: e.target.value })
                      }
                      onBlur={(e) => {
                        // Validate on blur to show errors when user leaves the field
                        const error = validateProviderId(e.target.value);
                        if (error) {
                          setProviderErrors({ ...providerErrors, [provider.id]: error });
                        }
                      }}
                      placeholder="e.g., openai:gpt-4o"
                      className={`w-full px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 ${
                        providerErrors[provider.id] ? 'border-red-500 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-600' : 'focus:ring-blue-500 dark:focus:ring-blue-600'
                      }`}
                      list={`providers-${provider.id}`}
                    />
                    {providerErrors[provider.id] && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {providerErrors[provider.id]}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowProviderList(showProviderList === provider.id ? null : provider.id)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-sm whitespace-nowrap self-start bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    title="Browse available providers"
                  >
                    Browse
                  </button>
                  <datalist id={`providers-${provider.id}`}>
                    {COMMON_PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* API Key Input Field */}
            <div>
              <label className="block text-sm font-medium mb-1">
                API Key (Optional)
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showApiKeys[provider.id] ? 'text' : 'password'}
                    value={provider.config?.apiKey || ''}
                    onChange={(e) => {
                      const config = { ...provider.config, apiKey: e.target.value };
                      updateProvider(provider.id, { config });
                      // Clear validation state when API key changes
                      const newValidation = { ...apiKeyValidation };
                      delete newValidation[provider.id];
                      setApiKeyValidation(newValidation);
                    }}
                    placeholder="Enter your API key here (alternative to environment variables)"
                    className="w-full px-3 py-2 border rounded-md text-sm pr-20 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-blue-500 dark:focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKeys({ ...showApiKeys, [provider.id]: !showApiKeys[provider.id] })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    title={showApiKeys[provider.id] ? 'Hide API key' : 'Show API key'}
                  >
                    {showApiKeys[provider.id] ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {/* Test API Key Button */}
                {provider.config?.apiKey && provider.providerId && requiresApiKey(provider.providerId) && (
                  <button
                    type="button"
                    onClick={() => testApiKey(provider.providerId, provider.config?.apiKey || '', provider.id)}
                    disabled={validatingApiKey[provider.id]}
                    className="px-3 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    title="Test API key validity"
                  >
                    {validatingApiKey[provider.id] ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Testing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Test
                      </>
                    )}
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Add your API key here or set it as an environment variable (OPENAI_API_KEY, GEMINI_API_KEY, etc.)
              </p>

              {/* API Key Validation Results */}
              {apiKeyValidation[provider.id]?.isValid && (
                <div className="mt-2 p-3 border-l-4 border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20 rounded">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">API Key Validated Successfully</p>
                      <p className="text-xs text-green-700 dark:text-green-300 mt-1">{apiKeyValidation[provider.id].message}</p>
                    </div>
                  </div>
                </div>
              )}

              {apiKeyValidation[provider.id]?.error && (
                <div className="mt-2 p-3 border-l-4 border-red-500 dark:border-red-600 bg-red-50 dark:bg-red-900/20 rounded">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">API Key Validation Failed</p>
                      <p className="text-xs text-red-700 dark:text-red-300 mt-1">{apiKeyValidation[provider.id].error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* API Key Warning/Info Messages */}
              {!apiKeyValidation[provider.id] && apiKeyWarnings[provider.id] && (
                <div className="mt-2 p-3 border-l-4 border-yellow-500 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">{apiKeyWarnings[provider.id].error}</p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">{apiKeyWarnings[provider.id].suggestion}</p>
                      {apiKeyWarnings[provider.id].docsUrl && (
                        <a
                          href={apiKeyWarnings[provider.id].docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline mt-1 inline-block"
                        >
                          View Documentation →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Info message when API key is found but not yet validated */}
              {!apiKeyValidation[provider.id] && !apiKeyWarnings[provider.id] && envApiKeyStatus[provider.id] && requiresApiKey(provider.providerId) && (
                <div className="mt-2 p-2 border-l-4 border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-blue-700 dark:text-blue-200 font-medium">API key found - Click "Test" to validate</p>
                  </div>
                </div>
              )}

              {/* Info for local providers that don't need keys */}
              {provider.providerId && !requiresApiKey(provider.providerId) && (
                <div className="mt-2 p-2 border-l-4 border-blue-500 bg-blue-50 rounded">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-blue-700">This provider runs locally and doesn't require an API key</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => toggleConfig(provider.id)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  title="Configure provider options"
                >
                  {editingId === provider.id ? 'Hide' : 'Config'}
                </button>
                <button
                  onClick={() => removeProvider(provider.id)}
                  className="px-3 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>

            {/* Provider category list */}
            {showProviderList === provider.id && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3 bg-gray-50 dark:bg-gray-900 max-h-96 overflow-y-auto">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                  Select a provider:
                </div>
                {Object.entries(PROVIDER_CATEGORIES).map(([category, categoryProviders]) => (
                  <div key={category} className="mb-3">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1 px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded">
                      {category}
                    </div>
                    <div className="space-y-1 mt-1">
                      {categoryProviders.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => selectProvider(p.id, provider.id)}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded border border-transparent hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-gray-900 dark:text-gray-100"
                        >
                          <div className="font-medium text-gray-900 dark:text-gray-100">{p.label}</div>
                          <div className="text-gray-500 dark:text-gray-400 font-mono text-[10px]">{p.id}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {editingId === provider.id && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Configuration (JSON)
                </label>
                <textarea
                  value={configJson}
                  onChange={(e) => setConfigJson(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-blue-500 dark:focus:ring-blue-600"
                  rows={6}
                  placeholder='{ "temperature": 0, "max_tokens": 1000 }'
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Common config options:</strong></p>
                  <p>• <code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 rounded">temperature</code>: Randomness (0-1)</p>
                  <p>• <code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 rounded">max_tokens</code>: Maximum response length</p>
                  <p>• <code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 rounded">top_p</code>: Nucleus sampling parameter</p>
                  <p>• <code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 rounded">response_format</code>: Response format specification (e.g., {`{ "type": "json_object" }`})</p>
                  <p>• <code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 rounded">transform</code>: JavaScript code to transform the output</p>

                  <p className="mt-2"><strong>Basic Example:</strong></p>
                  <code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 rounded block whitespace-pre-wrap">{`{
  "temperature": 0.7,
  "max_tokens": 2000
}`}</code>

                  <p className="mt-2"><strong>JSON Response Format Example:</strong></p>
                  <code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 rounded block whitespace-pre-wrap">{`{
  "response_format": {
    "type": "json_object"
  }
}`}</code>

                  <p className="text-gray-500 dark:text-gray-400 mt-2"><strong>Note:</strong> Use the "API Key" field above instead of adding apiKey to this config.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveConfig(provider.id)}
                    className="px-3 py-1.5 bg-green-600 dark:bg-green-700 text-white rounded hover:bg-green-700 dark:hover:bg-green-800 text-sm"
                  >
                    Save Config
                  </button>
                  <button
                    onClick={() => {
                      setConfigJson('{}');
                      updateProvider(provider.id, { config: {} });
                      setEditingId(null);
                    }}
                    className="px-3 py-1.5 bg-orange-600 dark:bg-orange-700 text-white rounded hover:bg-orange-700 dark:hover:bg-orange-800 text-sm"
                  >
                    Clear Config
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground mt-2 space-y-1">
        <p><strong>Format:</strong> provider:model (e.g., openai:gpt-4o, google:gemini-2.5-pro, anthropic:claude-3-5-sonnet-20241022)</p>
        <p><strong>Tip:</strong> Click "Browse" to see all {COMMON_PROVIDERS.length}+ available providers from OpenAI, Anthropic, Google, AWS Bedrock, Azure, Mistral, Cohere, Groq, Perplexity, Ollama, Hugging Face, Replicate, and more.</p>
        <p><strong>Authentication (2 options):</strong></p>
        <p className="ml-4">1. <strong>API Key field above</strong> (easiest): Enter your API key directly in the "API Key (Optional)" field. Use the eye icon to show/hide the key.</p>
        <p className="ml-4">2. <strong>.env File</strong> (recommended for security): Create a <code className="bg-gray-200 px-1 rounded text-xs">.env</code> file and add your API keys (e.g., OPENAI_API_KEY=sk-..., ANTHROPIC_API_KEY=sk-ant-..., GEMINI_API_KEY=...).</p>
        <p className="ml-6 text-gray-600"><strong>📂 .env File Location:</strong></p>
        <p className="ml-8 text-gray-600">• <strong>macOS:</strong> <code className="bg-gray-200 px-1 rounded text-xs">~/Library/Application Support/prompt-evaluator/.env</code></p>
        <p className="ml-10 text-gray-500">Open Finder → Press Cmd+Shift+G → Paste the path above</p>
        <p className="ml-8 text-gray-600">• <strong>Windows:</strong> <code className="bg-gray-200 px-1 rounded text-xs">%APPDATA%\prompt-evaluator\.env</code></p>
        <p className="ml-10 text-gray-500">Press Win+R → Type: %APPDATA%\prompt-evaluator → Create .env file</p>
        <p className="ml-8 text-gray-600">• <strong>Linux/Ubuntu:</strong> <code className="bg-gray-200 px-1 rounded text-xs">~/.config/prompt-evaluator/.env</code></p>
        <p className="ml-10 text-gray-500">Open terminal → Run: nano ~/.config/prompt-evaluator/.env</p>
        <p><strong>Limits:</strong> Maximum {MAX_PROVIDERS} providers allowed. Duplicate providers are automatically prevented.</p>
      </div>
    </div>
  );
}
