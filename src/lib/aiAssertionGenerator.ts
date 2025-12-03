import type { Prompt, Provider, Assertion, Dataset } from './types';
import { GoogleGenerativeAI } from '@google/generative-ai';

const ASSERTION_GENERATION_PROMPT = `# AI Assertion Generation Prompt for LLM Test Configuration

You are an expert test engineer specializing in LLM evaluation.

Analyze the provided prompts, their context, and variables to generate contextual, relevant assertions.

## Key Rules:

1. **Expected Variables (CRITICAL)**: For every variable starting with \`expected_\`, create a validation assertion
2. **Functional Assertions Only**: Generate only functional assertions (quality, format, performance) for defaultTest
3. **CRITICAL: NO SECURITY ASSERTIONS AND NO LLM-RUBRIC**:
   - Do NOT generate any assertions with type "llm-rubric"
   - Do NOT generate any assertions with type containing "security"
   - Do NOT add "security" tags to any assertions
   - Do NOT generate assertions for prompt injection, XSS, SQL injection, or any security concerns
   - ONLY generate: is-json, contains, icontains, equals, regex, starts-with, latency, javascript, python
   - Focus ONLY on quality, format, accuracy, and performance
4. **Context-Based**: Generate assertions based on actual prompt intent, not generic defaults
5. **Priority Levels**: critical > high > medium > low

## Output Format (STRICT JSON):

\`\`\`json
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
      "rubric": "grading criteria",
      "provider": "provider-id",
      "weight": 1.0,
      "priority": "critical|high|medium|low",
      "tags": ["format", "quality", "performance"]
    }
  ],
  "recommendations": {
    "essential": [],
    "suggested": []
  }
}
\`\`\`

## Assertion Types:

### Text Matching
- \`equals\`: Exact match
- \`contains\`: Must include keywords
- \`icontains\`: Case-insensitive contains
- \`regex\`: Pattern matching
- \`starts-with\`: Specific prefix

### Structured Data
- \`is-json\`: Valid JSON output
- \`contains-json\`: Contains valid JSON

### Performance
- \`latency\`: Response time (default: 30000ms, range: 10000-60000ms)
- \`cost\`: Cost threshold

### Custom
- \`javascript\`: Custom JavaScript validation (preferred)
- \`python\`: Custom Python validation (alternative)

## Expected Variable Rules (CRITICAL):

For variables like \`{{expected_category}}\`, \`{{expected_sentiment}}\`, \`{{expected_output}}\`:

1. Create validation assertion (priority: critical)
2. Choose type based on name:
   - category/class/label → \`contains\` or \`icontains\`
   - sentiment → \`contains\` or \`llm-rubric\`
   - output → \`similar\` or \`llm-rubric\`
   - json → \`is-json\` + validation
   - code → \`contains\` + \`llm-rubric\`

## Context Detection:

**Classification**: "classify", "categorize" → \`llm-rubric\` for accuracy, \`contains\` if expected value exists
**JSON Output**: "return json", "output as json", "return as JSON", contains JSON example → \`is-json\` (critical)
**Code Generation**: "write code", "implement" → \`contains\` (language keywords), \`llm-rubric\` for quality
**Summarization**: "summarize", "tldr" → \`llm-rubric\` for quality, length check
**Q&A / Chat**: "answer", "helpful assistant", "question" → **MUST include JSON format instructions**
  - **CRITICAL**: If prompt is Q&A/Chat style, ADD JSON format instructions to the prompt
  - Format: "Return the answer in JSON format.\\n\\nExample:\\n{\\"answer\\": \\"Answer from model here\\"}"
  - Then use \`is-json\` and \`llm-rubric\` assertions

Return ONLY the JSON, no markdown code blocks, no extra text.`;

interface AIAssertionResponse {
  analysis: {
    prompt_count: number;
    primary_intent: string;
    output_format: string;
    variables_detected: {
      total: number;
      standard: string[];
      expected: string[];
    };
  };
  assertions: Array<{
    type: string;
    rationale: string;
    value?: string;
    threshold?: number;
    rubric?: string;
    provider?: string;
    weight?: number;
    priority: string;
    tags: string[];
  }>;
  recommendations: {
    essential: string[];
    suggested: string[];
  };
}

export async function generateAssertionsWithAI(
  prompts: Prompt[],
  providers: Provider[],
  dataset?: Dataset,
  apiKey?: string
): Promise<{
  assertions: Assertion[];
  analysis: any;
  recommendations?: any;
  error?: string
}> {
  try {
    // Get API key from environment or parameter
    const key = apiKey || import.meta.env.VITE_GEMINI_API_KEY;

    if (!key) {
      return {
        assertions: [],
        analysis: null,
        error: 'Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your environment.',
      };
    }

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.3, // Lower temperature for more consistent, focused output
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });

    // Prepare input data
    const inputData = {
      prompts: prompts.map(p => ({
        label: p.label,
        text: p.text,
      })),
      providers: providers.map(p => ({
        id: p.id,
        providerId: p.providerId,
      })),
      dataset_sample: dataset && dataset.rows.length > 0 ? {
        headers: dataset.headers || Object.keys(dataset.rows[0] || {}),
        sample_row: dataset.rows[0],
      } : null,
    };

    const prompt = `${ASSERTION_GENERATION_PROMPT}

## Input Data:

${JSON.stringify(inputData, null, 2)}

Analyze the prompts and generate appropriate assertions. Return ONLY valid JSON, no markdown formatting.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    let aiResponse: AIAssertionResponse;
    try {
      // Remove markdown code blocks if present
      const cleanedText = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      aiResponse = JSON.parse(cleanedText);

      // Log the raw AI response for debugging
      console.log('[AI Generator] Raw AI response:', JSON.stringify(aiResponse, null, 2));
    } catch (parseError) {
      console.error('Failed to parse AI response:', text);
      return {
        assertions: [],
        analysis: null,
        error: 'Failed to parse AI response. Please try again.',
      };
    }

    // Convert functional assertions to app Assertion format (for defaultTest)
    const convertAssertion = (aiAssertion: any, index: number, prefix: string) => {
      const assertion: Assertion = {
        id: `assertion-ai-${prefix}-${Date.now()}-${index}`,
        type: aiAssertion.type,
      };

      if (aiAssertion.value !== undefined && aiAssertion.value !== null) {
        assertion.value = aiAssertion.value;
      }

      if (aiAssertion.threshold !== undefined && aiAssertion.threshold !== null) {
        assertion.threshold = aiAssertion.threshold;
      }

      if (aiAssertion.rubric) {
        assertion.rubric = aiAssertion.rubric;
      }

      if (aiAssertion.provider) {
        assertion.provider = aiAssertion.provider;
      } else if (aiAssertion.type.includes('llm-rubric')) {
        // Use first available provider for LLM-based assertions
        assertion.provider = providers.length > 0 ? providers[0].providerId : '';
      }

      if (aiAssertion.weight !== undefined && aiAssertion.weight !== null) {
        assertion.weight = aiAssertion.weight;
      }

      return assertion;
    };

    // Comprehensive security keyword list
    const securityKeywords = [
      'xss', 'injection', 'sql', 'disclosure', 'sanitize', 'malicious',
      'attack', 'exploit', 'prevent', 'security', 'vulnerab', 'threat',
      'breach', 'hack', 'compromise', 'unauthorized', 'cross-site',
      'path traversal', 'dos', 'denial of service', 'reject', 'block',
      'manipulat', 'adversarial', 'jailbreak', 'bypass', 'leak', 'exfiltrat'
    ];

    // Process assertions - filter out any security-related assertions
    const allAssertions = aiResponse.assertions || [];
    console.log(`[AI Generator] Processing ${allAssertions.length} assertions from AI`);

    const filteredAssertions = allAssertions.filter((a, index) => {
      console.log(`[AI Generator] Checking assertion ${index}:`, JSON.stringify(a, null, 2));

      // Filter by priority
      if (a.priority !== 'critical' && a.priority !== 'high' && a.priority !== 'medium') {
        console.log(`[AI Generator] Filtered out assertion ${index} due to low priority:`, a.priority);
        return false;
      }

      // Explicitly filter out security assertions by type
      if (a.type && typeof a.type === 'string') {
        const typeLower = a.type.toLowerCase();

        // Remove ALL llm-rubric assertions (they contain security checks)
        if (typeLower === 'llm-rubric' || typeLower.includes('llm-rubric')) {
          console.log(`[AI Generator] Filtered out llm-rubric assertion ${index}:`, a.type);
          return false;
        }

        if (typeLower.includes('security') || typeLower.includes('xss') ||
            typeLower.includes('injection') || typeLower.includes('sql')) {
          console.log(`[AI Generator] Filtered out assertion ${index} by type:`, a.type);
          return false;
        }
      }

      // Filter out security tags
      if (a.tags && Array.isArray(a.tags)) {
        const hasSecurityTag = a.tags.some(tag =>
          typeof tag === 'string' && tag.toLowerCase().includes('security')
        );
        if (hasSecurityTag) {
          console.log(`[AI Generator] Filtered out assertion ${index} with security tag:`, a.tags);
          return false;
        }
      }

      // Filter by rationale content
      if (a.rationale && typeof a.rationale === 'string') {
        const rationaleLower = a.rationale.toLowerCase();
        const matchedKeyword = securityKeywords.find(keyword => rationaleLower.includes(keyword));
        if (matchedKeyword) {
          console.log(`[AI Generator] Filtered out assertion ${index} with security rationale (matched: ${matchedKeyword}):`, a.rationale);
          return false;
        }
      }

      // Filter by rubric content
      if (a.rubric && typeof a.rubric === 'string') {
        const rubricLower = a.rubric.toLowerCase();
        const matchedKeyword = securityKeywords.find(keyword => rubricLower.includes(keyword));
        if (matchedKeyword) {
          console.log(`[AI Generator] Filtered out assertion ${index} with security rubric (matched: ${matchedKeyword}):`, a.rubric);
          return false;
        }
      }

      // Filter by value content
      if (a.value && typeof a.value === 'string') {
        const valueLower = a.value.toLowerCase();
        const matchedKeyword = securityKeywords.find(keyword => valueLower.includes(keyword));
        if (matchedKeyword) {
          console.log(`[AI Generator] Filtered out assertion ${index} with security value (matched: ${matchedKeyword}):`, a.value);
          return false;
        }
      }

      console.log(`[AI Generator] Assertion ${index} passed all filters`);
      return true;
    });

    // Helper function to extract JSON schema from prompt examples
    const extractJsonSchemaFromPrompt = (): any | null => {
      const promptTexts = prompts.map(p => p.text).join('\n\n');

      // Try to find JSON examples in the prompt
      const jsonMatches = promptTexts.match(/\{[^}]*"[^"]*"[^}]*\}/g);

      if (jsonMatches && jsonMatches.length > 0) {
        try {
          // Parse the first JSON example to infer schema
          const exampleJson = JSON.parse(jsonMatches[0]);
          const required = Object.keys(exampleJson);

          const properties: any = {};
          for (const key of required) {
            const value = exampleJson[key];
            const valueType = Array.isArray(value) ? 'array' : typeof value;

            properties[key] = { type: valueType };

            if (valueType === 'array' && value.length > 0) {
              properties[key].minItems = 1;
            } else if (valueType === 'string' && value.length > 0) {
              properties[key].minLength = 1;
            } else if (valueType === 'object') {
              properties[key].required = Object.keys(value);
            }
          }

          console.log('[AI Generator] Extracted JSON schema from prompt example:', { required, properties });

          return {
            required,
            properties
          };
        } catch (e) {
          console.log('[AI Generator] Could not parse JSON example from prompt');
        }
      }

      return null;
    };

    // Check if output format is JSON - if so, ensure is-json assertions come first
    const isJsonOutput = aiResponse.analysis?.output_format === 'json' ||
                        aiResponse.analysis?.output_format === 'structured';

    let assertions: Assertion[] = [];

    if (isJsonOutput) {
      console.log('[AI Generator] JSON output detected, prioritizing is-json assertions');

      // Separate is-json assertions from others
      const jsonAssertions = filteredAssertions.filter(a => a.type === 'is-json');
      const otherAssertions = filteredAssertions.filter(a => a.type !== 'is-json');

      // If we don't have any is-json assertions, create them
      if (jsonAssertions.length === 0) {
        console.log('[AI Generator] No is-json assertions found, creating default ones');

        // 1. Basic is-json assertion
        jsonAssertions.push({
          type: 'is-json',
          rationale: 'Output must be valid JSON format',
          priority: 'critical',
          tags: ['format', 'validation']
        });

        // 2. Try to infer JSON schema from prompt text
        const extractedSchema = extractJsonSchemaFromPrompt();

        if (extractedSchema) {
          // Create a schema validation assertion based on extracted schema
          jsonAssertions.push({
            type: 'is-json',
            rationale: 'Validate JSON schema structure and required fields based on prompt example',
            value: extractedSchema,
            priority: 'high',
            tags: ['format', 'schema', 'validation']
          });
        } else {
          // Fallback to generic schema - skip if no schema can be extracted
          console.log('[AI Generator] No JSON schema extracted, skipping generic schema assertion');
        }
      } else {
        console.log(`[AI Generator] Found ${jsonAssertions.length} is-json assertions`);

        // Ensure we have at least one is-json with schema if there are multiple is-json assertions
        const hasSchemaValidation = jsonAssertions.some(a => a.value && typeof a.value === 'object');

        if (jsonAssertions.length === 1 && !hasSchemaValidation) {
          // Try to extract schema from prompt
          const extractedSchema = extractJsonSchemaFromPrompt();

          if (extractedSchema) {
            // Add extracted schema validation assertion
            jsonAssertions.push({
              type: 'is-json',
              rationale: 'Validate JSON schema structure and required fields based on prompt example',
              value: extractedSchema,
              priority: 'high',
              tags: ['format', 'schema', 'validation']
            });
          } else {
            // Skip adding generic schema if no schema can be extracted
            console.log('[AI Generator] No schema to add for is-json assertion');
          }
        }
      }

      // Combine: is-json assertions first, then others
      const orderedAssertions = [...jsonAssertions, ...otherAssertions];
      assertions = orderedAssertions.map((a, i) => convertAssertion(a, i, 'assert'));

      console.log(`[AI Generator] Reordered assertions for JSON output: ${jsonAssertions.length} JSON assertions first, ${otherAssertions.length} other assertions`);
    } else {
      // Non-JSON output, keep original order
      assertions = filteredAssertions.map((a, i) => convertAssertion(a, i, 'assert'));
    }

    const totalGenerated = aiResponse.assertions?.length || 0;
    const filtered = totalGenerated - assertions.length;
    console.log(`[AI Generator] Generated ${totalGenerated} assertions, filtered ${filtered} security assertions, returning ${assertions.length}`);

    return {
      assertions,
      analysis: aiResponse.analysis,
      recommendations: aiResponse.recommendations,
    };
  } catch (error: any) {
    console.error('AI assertion generation error:', error);
    return {
      assertions: [],
      analysis: null,
      error: error.message || 'Failed to generate assertions with AI',
    };
  }
}
