import type { Provider } from './types';

/**
 * Transforms provider data for YAML configuration
 * Handles markdown code fence stripping and optional API key inclusion
 */
export function transformProviderForYaml(
  provider: Provider,
  options?: { includeApiKeys?: boolean }
): any {
  const includeApiKeys = options?.includeApiKeys ?? true;

  const result: any = {
    id: provider.providerId,
  };

  // Always add transform to strip markdown code fences
  result.transform = `// Strip markdown code fences if present
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
return output;`;

  // Add config if present
  if (provider.config && Object.keys(provider.config).length > 0) {
    let providerConfig = provider.config;

    // Remove apiKey from config if requested (for export/preview)
    if (!includeApiKeys) {
      const { apiKey, ...configWithoutApiKey } = provider.config;
      providerConfig = configWithoutApiKey;
    }

    // Only include config if there are properties
    if (Object.keys(providerConfig).length > 0) {
      result.config = providerConfig;
    }
  }

  return result;
}

/**
 * Transforms an array of providers for YAML configuration
 */
export function transformProvidersForYaml(
  providers: Provider[],
  options?: { includeApiKeys?: boolean }
): any[] {
  return providers.map(p => transformProviderForYaml(p, options));
}
