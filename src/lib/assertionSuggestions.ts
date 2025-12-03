import type { Prompt, Assertion, Provider } from './types';

/**
 * Analyzes a prompt and suggests appropriate assertions based on its content
 */
export function suggestAssertionsFromPrompt(
  prompt: Prompt,
  providers: Provider[]
): Assertion[] {
  const suggestions: Assertion[] = [];
  const promptText = prompt.text.toLowerCase();
  const defaultProvider = providers.length > 0 ? providers[0].providerId : '';

  // JSON output detection
  if (
    promptText.includes('json') ||
    promptText.includes('{ ') ||
    promptText.includes('{\\n') ||
    promptText.includes('output format:') ||
    promptText.includes('respond with a json') ||
    promptText.includes('return json') ||
    promptText.includes('format the response as json')
  ) {
    suggestions.push({
      id: `assertion-json-${Date.now()}`,
      type: 'is-json',
    });
  }

  // Classification/categorization tasks
  if (
    promptText.includes('classify') ||
    promptText.includes('categorize') ||
    promptText.includes('identify the category') ||
    promptText.includes('determine the type')
  ) {
    // Extract possible categories if mentioned
    const categories = extractCategories(promptText);
    if (categories.length > 0) {
      suggestions.push({
        id: `assertion-contains-${Date.now()}`,
        type: 'contains',
        value: categories[0], // Use first category as example
      });
    }

    // Add LLM rubric for classification quality
    suggestions.push({
      id: `assertion-rubric-${Date.now()}`,
      type: 'llm-rubric',
      rubric: 'The classification should be accurate and match the expected category based on the input.',
      threshold: 0.8,
      provider: defaultProvider,
    });
  }

  // Sentiment analysis
  if (
    promptText.includes('sentiment') ||
    promptText.includes('positive or negative') ||
    promptText.includes('tone of')
  ) {
    suggestions.push({
      id: `assertion-sentiment-${Date.now()}`,
      type: 'llm-rubric',
      rubric: 'The sentiment analysis should correctly identify whether the text is positive, negative, or neutral.',
      threshold: 0.8,
      provider: defaultProvider,
    });
  }

  // Summarization tasks
  if (
    promptText.includes('summar') ||
    promptText.includes('tldr') ||
    promptText.includes('brief') ||
    promptText.includes('concise')
  ) {
    suggestions.push({
      id: `assertion-summary-${Date.now()}`,
      type: 'llm-rubric',
      rubric: 'The summary should be concise, accurate, and capture the key points of the original text.',
      threshold: 0.7,
      provider: defaultProvider,
    });

    // Check for length requirements
    if (promptText.includes('short') || promptText.includes('brief')) {
      suggestions.push({
        id: `assertion-length-${Date.now()}`,
        type: 'javascript',
        value: 'output.length < 500',
      });
    }
  }

  // Translation tasks
  if (
    promptText.includes('translate') ||
    promptText.includes('translation')
  ) {
    suggestions.push({
      id: `assertion-translation-${Date.now()}`,
      type: 'llm-rubric',
      rubric: 'The translation should be accurate, natural-sounding, and preserve the meaning of the original text.',
      threshold: 0.8,
      provider: defaultProvider,
    });
  }

  // Question answering
  if (
    promptText.includes('answer the question') ||
    promptText.includes('respond to the question') ||
    promptText.includes('what is') ||
    promptText.includes('how does') ||
    promptText.includes('explain')
  ) {
    suggestions.push({
      id: `assertion-qa-${Date.now()}`,
      type: 'llm-rubric',
      rubric: 'The answer should be accurate, relevant to the question, and well-explained.',
      threshold: 0.7,
      provider: defaultProvider,
    });
  }

  // Code generation
  if (
    promptText.includes('write code') ||
    promptText.includes('generate code') ||
    promptText.includes('create a function') ||
    promptText.includes('implement')
  ) {
    suggestions.push({
      id: `assertion-code-${Date.now()}`,
      type: 'llm-rubric',
      rubric: 'The code should be correct, follow best practices, and solve the specified problem.',
      threshold: 0.7,
      provider: defaultProvider,
    });

    // Check for specific languages
    if (promptText.includes('python')) {
      suggestions.push({
        id: `assertion-python-${Date.now()}`,
        type: 'contains',
        value: 'def ',
      });
    } else if (promptText.includes('javascript') || promptText.includes('typescript')) {
      suggestions.push({
        id: `assertion-js-${Date.now()}`,
        type: 'contains',
        value: 'function',
      });
    }
  }

  // Structured output requirements
  if (
    promptText.includes('list of') ||
    promptText.includes('bullet points') ||
    promptText.includes('numbered list')
  ) {
    suggestions.push({
      id: `assertion-list-${Date.now()}`,
      type: 'llm-rubric',
      rubric: 'The output should be properly formatted as a list with clear, distinct items.',
      threshold: 0.7,
      provider: defaultProvider,
    });
  }

  // Safety and security checks
  if (
    promptText.includes('safe') ||
    promptText.includes('appropriate') ||
    promptText.includes('professional')
  ) {
    suggestions.push({
      id: `assertion-safety-${Date.now()}`,
      type: 'llm-rubric',
      rubric: 'The output should be safe, appropriate, and professional in tone.',
      threshold: 0.8,
      provider: defaultProvider,
    });
  }

  // Extract expected output format if specified
  const formatMatch = promptText.match(/format[:\s]+(.*?)(?:\.|,|$)/i);
  if (formatMatch) {
    const format = formatMatch[1].trim();
    if (format) {
      suggestions.push({
        id: `assertion-format-${Date.now()}`,
        type: 'llm-rubric',
        rubric: `The output should follow the specified format: ${format}`,
        threshold: 0.7,
        provider: defaultProvider,
      });
    }
  }

  // Performance assertions for all prompts
  suggestions.push({
    id: `assertion-latency-${Date.now()}`,
    type: 'latency',
    threshold: 30000, // 30 seconds default
  });

  // If no specific assertions were suggested, add a general quality check
  if (suggestions.length === 1) { // Only latency was added
    suggestions.push({
      id: `assertion-quality-${Date.now()}`,
      type: 'llm-rubric',
      rubric: 'The output should be relevant, coherent, and directly address the prompt requirements.',
      threshold: 0.7,
      provider: defaultProvider,
    });
  }

  return suggestions;
}

/**
 * Extracts category names from classification prompts
 */
function extractCategories(promptText: string): string[] {
  const categories: string[] = [];

  // Look for patterns like "positive or negative", "spam or not spam", etc.
  const orPattern = /(\w+)\s+or\s+(\w+)/gi;
  let match;
  while ((match = orPattern.exec(promptText)) !== null) {
    categories.push(match[1]);
    categories.push(match[2]);
  }

  // Look for quoted categories
  const quotePattern = /["'](\w+)["']/g;
  while ((match = quotePattern.exec(promptText)) !== null) {
    categories.push(match[1]);
  }

  return categories.filter((c, i, arr) => arr.indexOf(c) === i); // Remove duplicates
}

/**
 * Analyzes all prompts and suggests assertions
 */
export function suggestAssertionsFromPrompts(
  prompts: Prompt[],
  providers: Provider[]
): Assertion[] {
  const allSuggestions: Assertion[] = [];
  const seenTypes = new Set<string>();

  prompts.forEach((prompt) => {
    const promptSuggestions = suggestAssertionsFromPrompt(prompt, providers);

    // Only add unique assertion types (avoid duplicates)
    promptSuggestions.forEach((suggestion) => {
      const typeKey = `${suggestion.type}-${suggestion.value || suggestion.rubric || ''}`;
      if (!seenTypes.has(typeKey)) {
        seenTypes.add(typeKey);
        allSuggestions.push(suggestion);
      }
    });
  });

  return allSuggestions;
}
