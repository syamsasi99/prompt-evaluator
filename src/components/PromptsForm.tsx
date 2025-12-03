import React, { useState } from 'react';
import type { Prompt } from '../lib/types';
import { extractVariables } from '../lib/buildYaml';
import { PromptLabelSchema, PromptTextSchema } from '../lib/schemas';
import { useToast } from '../contexts/ToastContext';
import { logger } from '../lib/logger';

interface PromptsFormProps {
  prompts: Prompt[];
  onChange: (prompts: Prompt[]) => void;
  onValidationChange?: (hasErrors: boolean) => void;
  shouldValidate?: boolean;
  suggestedPrompts?: Prompt[] | null;
  onAcceptSuggestions?: () => void;
  onRejectSuggestions?: () => void;
}

const MAX_PROMPTS = 1;

export function PromptsForm({ prompts, onChange, onValidationChange, shouldValidate, suggestedPrompts, onAcceptSuggestions, onRejectSuggestions }: PromptsFormProps) {
  const toast = useToast();
  const [promptErrors, setPromptErrors] = useState<Record<string, { label?: string; text?: string }>>({});

  // Validate a single field
  const validateField = (field: 'label' | 'text', value: string): string | null => {
    try {
      if (field === 'label') {
        PromptLabelSchema.parse(value);
      } else {
        PromptTextSchema.parse(value);
      }
      return null;
    } catch (error: any) {
      return error.errors?.[0]?.message || 'Invalid value';
    }
  };

  // Validate all prompts when shouldValidate changes to true
  React.useEffect(() => {
    if (shouldValidate) {
      const newErrors: Record<string, { label?: string; text?: string }> = {};

      prompts.forEach((prompt, index) => {
        const errors: { label?: string; text?: string } = {};

        const labelError = validateField('label', prompt.label);
        if (labelError) {
          errors.label = labelError;
        } else {
          // Check for duplicate label
          const isDuplicate = prompts.some(
            (p, i) => i !== index && p.label.toLowerCase() === prompt.label.toLowerCase()
          );
          if (isDuplicate) {
            errors.label = `Prompt label "${prompt.label}" is already used`;
          }
        }

        const textError = validateField('text', prompt.text);
        if (textError) {
          errors.text = textError;
        }

        if (errors.label || errors.text) {
          newErrors[prompt.id] = errors;
        }
      });
      setPromptErrors(newErrors);
    }
  }, [shouldValidate, prompts]);

  // Notify parent component of validation status
  React.useEffect(() => {
    // Only check for validation errors, not empty prompts array
    const hasErrors = Object.keys(promptErrors).length > 0;
    onValidationChange?.(hasErrors);
  }, [promptErrors]);

  const addPrompt = () => {
    // Check max prompts limit
    if (prompts.length >= MAX_PROMPTS) {
      logger.warn('prompts', `Failed to add prompt: Maximum ${MAX_PROMPTS} prompts limit reached`);
      toast.warning(`Maximum ${MAX_PROMPTS} prompts allowed. Please remove a prompt before adding a new one.`);
      return;
    }

    const newPrompt: Prompt = {
      id: `prompt-${Date.now()}`,
      label: `Prompt ${prompts.length + 1}`,
      text: '',
    };
    logger.info('prompts', 'Prompt added', { promptId: newPrompt.id, label: newPrompt.label });
    toast.success('Prompt added successfully!');
    onChange([...prompts, newPrompt]);
  };

  const removePrompt = (id: string) => {
    const promptToRemove = prompts.find(p => p.id === id);
    logger.info('prompts', 'Prompt removed', { promptId: id, label: promptToRemove?.label });
    onChange(prompts.filter((p) => p.id !== id));
    toast.success('Prompt removed successfully!');
  };

  const validatePromptText = (text: string): string | null => {
    // First validate with schema
    const schemaError = validateField('text', text);
    if (schemaError) {
      return schemaError;
    }

    // Check for variables
    const variables = extractVariables(text);
    if (variables.length === 0) {
      return 'Prompt must contain at least one variable (e.g., {{variable_name}})';
    }

    return null;
  };

  const updatePrompt = (id: string, updates: Partial<Prompt>) => {
    // Validate updated fields
    const newErrors = { ...promptErrors };
    const currentPromptErrors = { ...newErrors[id] };

    if (updates.label !== undefined) {
      const labelError = validateField('label', updates.label);
      if (labelError) {
        currentPromptErrors.label = labelError;
      } else {
        // Check for duplicate label (only if non-empty)
        if (updates.label.trim() !== '') {
          const isDuplicate = prompts.some(
            p => p.id !== id && p.label.toLowerCase() === updates.label.toLowerCase()
          );

          if (isDuplicate) {
            currentPromptErrors.label = `Prompt label "${updates.label}" is already used`;
          } else {
            delete currentPromptErrors.label;
          }
        } else {
          delete currentPromptErrors.label;
        }
      }
    }

    if (updates.text !== undefined) {
      const textError = validateField('text', updates.text);
      if (textError) {
        currentPromptErrors.text = textError;
      } else {
        delete currentPromptErrors.text;
      }
    }

    if (currentPromptErrors.label || currentPromptErrors.text) {
      newErrors[id] = currentPromptErrors;
    } else {
      delete newErrors[id];
    }

    setPromptErrors(newErrors);

    // Log the update with details about what changed
    const changedFields = Object.keys(updates).join(', ');
    const prompt = prompts.find(p => p.id === id);
    logger.debug('prompts', 'Prompt updated', {
      promptId: id,
      label: prompt?.label,
      fields: changedFields,
      hasErrors: !!(currentPromptErrors.label || currentPromptErrors.text)
    });

    onChange(
      prompts.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  return (
    <div className="space-y-4">
      {/* AI Suggestions Banner */}
      {suggestedPrompts && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-4 shadow-md">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-green-800 dark:text-green-300 mb-1">AI Prompt Suggestions Available</h3>
              <p className="text-sm text-green-700 dark:text-green-400 mb-3">
                The AI has analyzed your test results and suggested improvements to your prompts. Review the changes below and decide whether to apply them.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onAcceptSuggestions}
                  className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors font-medium text-sm flex items-center gap-2 shadow-sm"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Accept Changes
                </button>
                <button
                  onClick={onRejectSuggestions}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium text-sm flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Prompts</h2>
          <p className="text-xs text-muted-foreground dark:text-gray-400 mt-0.5">
            {prompts.length} / {MAX_PROMPTS} prompts
            {prompts.length >= MAX_PROMPTS && <span className="text-orange-600 dark:text-orange-400 ml-2">(Maximum reached)</span>}
          </p>
        </div>
        <button
          onClick={addPrompt}
          disabled={prompts.length >= MAX_PROMPTS}
          className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
          title={prompts.length >= MAX_PROMPTS ? `Maximum ${MAX_PROMPTS} prompts allowed` : 'Add a new prompt'}
        >
          + Add Prompt
        </button>
      </div>

      {prompts.length === 0 && (
        <div className="text-sm text-muted-foreground dark:text-gray-400 p-4 border border-dashed border-gray-200 dark:border-gray-700 rounded">
          No prompts configured. Add at least one prompt to continue.
        </div>
      )}

      <div className="space-y-3">
        {prompts.map((prompt, index) => {
          const variables = extractVariables(prompt.text);
          const suggestedPrompt = suggestedPrompts?.[index];
          const hasChanges = suggestedPrompt && suggestedPrompt.text !== prompt.text;

          return (
            <div key={prompt.id} className={`border rounded-lg p-4 space-y-3 ${hasChanges ? 'border-green-400 dark:border-green-600 bg-green-50/30 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    value={prompt.label}
                    onChange={(e) =>
                      updatePrompt(prompt.id, { label: e.target.value })
                    }
                    onBlur={(e) => {
                      const error = validateField('label', e.target.value);
                      if (error) {
                        setPromptErrors({
                          ...promptErrors,
                          [prompt.id]: { ...promptErrors[prompt.id], label: error }
                        });
                      }
                    }}
                    maxLength={100}
                    placeholder={`Prompt ${index + 1}`}
                    className={`w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                      promptErrors[prompt.id]?.label ? 'border-red-500 focus:ring-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'
                    }`}
                  />
                  {promptErrors[prompt.id]?.label && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {promptErrors[prompt.id].label}
                    </p>
                  )}
                  {!promptErrors[prompt.id]?.label && (
                    <p className="mt-1 text-xs text-muted-foreground dark:text-gray-400">
                      {prompt.label.length}/100 characters
                      {prompt.label.length >= 100 && <span className="text-orange-600 dark:text-orange-400 ml-1">(Maximum reached)</span>}
                    </p>
                  )}
                </div>

                <div className="flex items-start pt-7">
                  <button
                    onClick={() => removePrompt(prompt.id)}
                    className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Show GitHub-style diff view if there are suggested changes */}
              {hasChanges && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      AI Suggested Changes
                    </div>
                    <div className="flex items-center gap-3 text-xs font-medium">
                      <span className="flex items-center gap-1 text-red-700 dark:text-red-400">
                        <span className="inline-block w-3 h-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded"></span>
                        Removed
                      </span>
                      <span className="flex items-center gap-1 text-green-700 dark:text-green-400">
                        <span className="inline-block w-3 h-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 rounded"></span>
                        Added
                      </span>
                    </div>
                  </div>

                  {/* GitHub-style unified diff */}
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
                    {/* Diff header */}
                    <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 px-3 py-2 flex items-center gap-2 text-xs font-mono text-gray-600 dark:text-gray-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-gray-700 dark:text-gray-300 font-semibold">Prompt Text</span>
                    </div>

                    {/* Diff content */}
                    <div className="font-mono text-xs leading-relaxed">
                      {(() => {
                        const oldLines = prompt.text.split('\n');
                        const newLines = suggestedPrompt.text.split('\n');
                        const maxLines = Math.max(oldLines.length, newLines.length);

                        return (
                          <div>
                            {/* Removed lines */}
                            {oldLines.map((line, idx) => (
                              <div key={`old-${idx}`} className="flex hover:bg-red-50 dark:hover:bg-red-900/20">
                                <div className="w-12 px-2 py-1 text-right text-gray-400 dark:text-gray-500 bg-red-50 dark:bg-red-900/30 border-r border-red-200 dark:border-red-700 select-none flex-shrink-0">
                                  {idx + 1}
                                </div>
                                <div className="w-12 px-2 py-1 text-right text-gray-300 dark:text-gray-600 bg-red-50 dark:bg-red-900/30 border-r border-red-200 dark:border-red-700 select-none flex-shrink-0">

                                </div>
                                <div className="flex-1 px-3 py-1 bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-300 border-l-2 border-red-500 dark:border-red-700">
                                  <span className="text-red-600 dark:text-red-400 mr-2 select-none">-</span>
                                  {line || ' '}
                                </div>
                              </div>
                            ))}

                            {/* Separator */}
                            <div className="flex border-y border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                              <div className="w-12 px-2 py-1 text-center text-gray-400 dark:text-gray-500 select-none">⋮</div>
                              <div className="w-12 px-2 py-1 text-center text-gray-400 dark:text-gray-500 select-none">⋮</div>
                              <div className="flex-1 px-3 py-1 text-gray-500 dark:text-gray-400 text-center">
                                <span className="text-xs">Changes applied</span>
                              </div>
                            </div>

                            {/* Added lines */}
                            {newLines.map((line, idx) => (
                              <div key={`new-${idx}`} className="flex hover:bg-green-50 dark:hover:bg-green-900/20">
                                <div className="w-12 px-2 py-1 text-right text-gray-300 dark:text-gray-600 bg-green-50 dark:bg-green-900/30 border-r border-green-200 dark:border-green-700 select-none flex-shrink-0">

                                </div>
                                <div className="w-12 px-2 py-1 text-right text-gray-400 dark:text-gray-500 bg-green-50 dark:bg-green-900/30 border-r border-green-200 dark:border-green-700 select-none flex-shrink-0">
                                  {idx + 1}
                                </div>
                                <div className="flex-1 px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-900 dark:text-green-300 border-l-2 border-green-500 dark:border-green-700">
                                  <span className="text-green-600 dark:text-green-400 mr-2 select-none">+</span>
                                  {line || ' '}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Diff footer */}
                    <div className="bg-gray-50 dark:bg-gray-700 border-t border-gray-300 dark:border-gray-600 px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-red-700 dark:text-red-400">-{prompt.text.split('\n').length}</span> lines removed
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-green-700 dark:text-green-400">+{suggestedPrompt.text.split('\n').length}</span> lines added
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Regular textarea when no suggestions or no changes */}
              {!hasChanges && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prompt Text
                  </label>
                  <textarea
                    value={prompt.text}
                    onChange={(e) =>
                      updatePrompt(prompt.id, { text: e.target.value })
                    }
                    onBlur={(e) => {
                      const error = validatePromptText(e.target.value);
                      const newErrors = { ...promptErrors };
                      if (error) {
                        newErrors[prompt.id] = { ...newErrors[prompt.id], text: error };
                      } else {
                        if (newErrors[prompt.id]) {
                          delete newErrors[prompt.id].text;
                          if (!newErrors[prompt.id].label) {
                            delete newErrors[prompt.id];
                          }
                        }
                      }
                      setPromptErrors(newErrors);
                    }}
                    maxLength={10000}
                    placeholder="Enter your prompt here. Use {{variable}} syntax for variables."
                    className={`w-full px-3 py-2 border rounded-md font-mono text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 ${
                      promptErrors[prompt.id]?.text ? 'border-red-500 focus:ring-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'
                    }`}
                    rows={8}
                  />
                  {promptErrors[prompt.id]?.text && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {promptErrors[prompt.id].text}
                    </p>
                  )}
                  {!promptErrors[prompt.id]?.text && (
                    <p className="mt-1 text-xs text-muted-foreground dark:text-gray-400">
                      {prompt.text.length}/10000 characters
                      {prompt.text.length >= 10000 && <span className="text-orange-600 dark:text-orange-400 ml-1">(Maximum reached)</span>}
                    </p>
                  )}
                </div>
              )}

              {variables.length > 0 && (
                <div className="text-xs text-muted-foreground dark:text-gray-400">
                  Variables detected: {variables.map((v) => `{{${v}}}`).join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground dark:text-gray-400 mt-2 space-y-1">
        <p><strong>Variables:</strong> Use double curly braces for variables: {'{{variableName}}'}</p>
        <p><strong>Example:</strong> "Classify the following text as positive or negative: {'{{text}}'}"</p>
        <p><strong>Limits:</strong> Maximum {MAX_PROMPTS} prompts allowed. Duplicate prompt labels are automatically prevented.</p>
      </div>
    </div>
  );
}
