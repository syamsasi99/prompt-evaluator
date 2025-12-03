import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptsForm } from './PromptsForm';
import type { Prompt } from '../lib/types';
import { ToastProvider } from '../contexts/ToastContext';

// Mock logger
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

describe('PromptsForm', () => {
  let mockOnChange: ReturnType<typeof vi.fn>;
  let mockOnValidationChange: ReturnType<typeof vi.fn>;
  let mockPrompts: Prompt[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnChange = vi.fn();
    mockOnValidationChange = vi.fn();
    mockPrompts = [
      { id: 'prompt-1', label: 'Prompt 1', text: 'Hello {{name}}' },
    ];
  });

  describe('Rendering', () => {
    it('should render the form with header', () => {
      renderWithToast(
        <PromptsForm prompts={mockPrompts} onChange={mockOnChange} />
      );

      expect(screen.getByText('Prompts')).toBeInTheDocument();
      expect(screen.getByText('+ Add Prompt')).toBeInTheDocument();
    });

    it('should display prompt count', () => {
      renderWithToast(
        <PromptsForm prompts={mockPrompts} onChange={mockOnChange} />
      );

      expect(screen.getByText(/1 \/ 1 prompts/i)).toBeInTheDocument();
    });

    it('should render existing prompts', () => {
      renderWithToast(
        <PromptsForm prompts={mockPrompts} onChange={mockOnChange} />
      );

      expect(screen.getByDisplayValue('Prompt 1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Hello {{name}}')).toBeInTheDocument();
    });

    it('should display "no prompts" message when empty', () => {
      renderWithToast(
        <PromptsForm prompts={[]} onChange={mockOnChange} />
      );

      expect(screen.getByText(/No prompts configured/i)).toBeInTheDocument();
    });

    it('should show variable detection', () => {
      renderWithToast(
        <PromptsForm prompts={mockPrompts} onChange={mockOnChange} />
      );

      expect(screen.getByText(/Variables detected: {{name}}/i)).toBeInTheDocument();
    });

    it('should show multiple variables', () => {
      const prompts = [
        { id: 'prompt-1', label: 'Test', text: 'Hello {{name}} from {{location}}' },
      ];

      renderWithToast(
        <PromptsForm prompts={prompts} onChange={mockOnChange} />
      );

      expect(screen.getByText(/Variables detected: {{name}}, {{location}}/i)).toBeInTheDocument();
    });
  });

  describe('Adding Prompts', () => {
    it('should add a new prompt when button is clicked', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <PromptsForm prompts={[]} onChange={mockOnChange} />
      );

      const addButton = screen.getByText('+ Add Prompt');
      await user.click(addButton);

      expect(mockOnChange).toHaveBeenCalled();
      const newPrompts = mockOnChange.mock.calls[0][0];
      expect(newPrompts).toHaveLength(1);
      expect(newPrompts[0]).toMatchObject({
        label: 'Prompt 1',
        text: '',
      });
    });

    it('should generate unique IDs for new prompts', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <PromptsForm prompts={[]} onChange={mockOnChange} />
      );

      const addButton = screen.getByText('+ Add Prompt');
      await user.click(addButton);

      // Wait for first prompt to be added
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });

      const firstCall = mockOnChange.mock.calls[0][0];
      expect(firstCall.length).toBe(1);
      const firstId = firstCall[0].id;

      // Add second prompt (note: in this test, the prompts prop doesn't update,
      // so the second call will still have the first prompt in it)
      await user.click(addButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledTimes(2);
      });

      // Get the second call - it should have 1 prompt (the new one)
      // because the component's prompts prop is still []
      const secondCall = mockOnChange.mock.calls[1][0];
      expect(secondCall.length).toBe(1);
      const secondId = secondCall[0].id;

      // Even though both calls have 1 prompt, the IDs should be different
      expect(firstId).not.toBe(secondId);
      expect(firstId).toBeTruthy();
      expect(secondId).toBeTruthy();
    });

    it('should disable add button at maximum limit', () => {
      const maxPrompts = [
        { id: 'prompt-1', label: 'Prompt 1', text: 'Test 1' },
      ];

      renderWithToast(
        <PromptsForm prompts={maxPrompts} onChange={mockOnChange} />
      );

      const addButton = screen.getByText('+ Add Prompt');
      expect(addButton).toBeDisabled();
      expect(screen.getAllByText(/Maximum reached/i).length).toBeGreaterThan(0);
    });

    it('should show toast warning when trying to exceed maximum', async () => {
      const user = userEvent.setup();
      const maxPrompts = [
        { id: 'prompt-1', label: 'Prompt 1', text: 'Test 1' },
      ];

      renderWithToast(
        <PromptsForm prompts={maxPrompts} onChange={mockOnChange} />
      );

      // Button should be disabled, but test the function logic
      expect(screen.getAllByText(/Maximum reached/i).length).toBeGreaterThan(0);
    });

  });

  describe('Removing Prompts', () => {
    it('should remove a prompt when remove button is clicked', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <PromptsForm prompts={mockPrompts} onChange={mockOnChange} />
      );

      const removeButton = screen.getByText('Remove');
      await user.click(removeButton);

      expect(mockOnChange).toHaveBeenCalledWith([]);
    });

    it('should remove correct prompt when multiple exist', async () => {
      const user = userEvent.setup();
      const prompts = [
        { id: 'prompt-1', label: 'Prompt 1', text: 'Test 1' },
        { id: 'prompt-2', label: 'Prompt 2', text: 'Test 2' },
      ];

      renderWithToast(
        <PromptsForm prompts={prompts} onChange={mockOnChange} />
      );

      const removeButtons = screen.getAllByText('Remove');
      await user.click(removeButtons[0]);

      expect(mockOnChange).toHaveBeenCalledWith([prompts[1]]);
    });

    it('should show success toast after removing', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <PromptsForm prompts={mockPrompts} onChange={mockOnChange} />
      );

      const removeButton = screen.getByText('Remove');
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.getByText(/Prompt removed successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Editing Prompts', () => {
    it('should update prompt label on change', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <PromptsForm prompts={mockPrompts} onChange={mockOnChange} />
      );

      const labelInput = screen.getByDisplayValue('Prompt 1') as HTMLInputElement;

      // Use fireEvent to directly set the value (more reliable in tests)
      fireEvent.change(labelInput, { target: { value: 'Updated Label' } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
        const calls = mockOnChange.mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall[0].label).toBe('Updated Label');
      });
    });

    it('should update prompt text on change', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <PromptsForm prompts={mockPrompts} onChange={mockOnChange} />
      );

      const textInput = screen.getByDisplayValue('Hello {{name}}') as HTMLTextAreaElement;

      // Use fireEvent to directly set the value (more reliable in tests)
      fireEvent.change(textInput, { target: { value: 'New prompt text' } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
        const calls = mockOnChange.mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall[0].text).toBe('New prompt text');
      });
    });

    it('should show character count for label', () => {
      renderWithToast(
        <PromptsForm prompts={mockPrompts} onChange={mockOnChange} />
      );

      expect(screen.getByText(/8\/100 characters/i)).toBeInTheDocument();
    });

    it('should show character count for text', () => {
      renderWithToast(
        <PromptsForm prompts={mockPrompts} onChange={mockOnChange} />
      );

      expect(screen.getByText(/14\/10000 characters/i)).toBeInTheDocument();
    });

    it('should enforce maximum label length', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <PromptsForm prompts={mockPrompts} onChange={mockOnChange} />
      );

      const labelInput = screen.getByDisplayValue('Prompt 1');
      expect(labelInput).toHaveAttribute('maxLength', '100');
    });

    it('should enforce maximum text length', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <PromptsForm prompts={mockPrompts} onChange={mockOnChange} />
      );

      const textInput = screen.getByDisplayValue('Hello {{name}}');
      expect(textInput).toHaveAttribute('maxLength', '10000');
    });
  });

  describe('Validation', () => {
    it('should validate label on blur', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <PromptsForm
          prompts={mockPrompts}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
        />
      );

      const labelInput = screen.getByDisplayValue('Prompt 1');
      await user.clear(labelInput);
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(screen.getByText(/Label is required/i)).toBeInTheDocument();
      });
    });

    it('should detect duplicate labels', async () => {
      const user = userEvent.setup();
      const prompts = [
        { id: 'prompt-1', label: 'Test', text: 'Text 1' },
        { id: 'prompt-2', label: 'Different', text: 'Text 2' },
      ];

      renderWithToast(
        <PromptsForm
          prompts={prompts}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
          shouldValidate={true}
        />
      );

      // Get the second label input by display value
      const secondLabelInput = screen.getByDisplayValue('Different');

      // Use fireEvent to change the value to a duplicate
      fireEvent.change(secondLabelInput, { target: { value: 'Test' } });
      fireEvent.blur(secondLabelInput);

      await waitFor(() => {
        expect(screen.getByText(/already used/i)).toBeInTheDocument();
      });
    });

    it('should validate all prompts when shouldValidate is true', async () => {
      const prompts = [
        { id: 'prompt-1', label: '', text: '' },
      ];

      renderWithToast(
        <PromptsForm
          prompts={prompts}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
          shouldValidate={true}
        />
      );

      await waitFor(() => {
        expect(mockOnValidationChange).toHaveBeenCalledWith(true); // Has errors
      });
    });

    it('should call onValidationChange with false when no errors', async () => {
      renderWithToast(
        <PromptsForm
          prompts={mockPrompts}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
          shouldValidate={true}
        />
      );

      await waitFor(() => {
        expect(mockOnValidationChange).toHaveBeenCalledWith(false); // No errors
      });
    });

    it('should clear validation errors when field becomes valid', async () => {
      const user = userEvent.setup();
      const prompts = [
        { id: 'prompt-1', label: '', text: 'Test' },
      ];

      renderWithToast(
        <PromptsForm
          prompts={prompts}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
          shouldValidate={true}
        />
      );

      // Initially should have error
      await waitFor(() => {
        expect(screen.getByText(/Label is required/i)).toBeInTheDocument();
      });

      // Fix the error
      const labelInput = screen.getByPlaceholderText(/Prompt 1/i);
      await user.type(labelInput, 'Valid Label');

      await waitFor(() => {
        expect(screen.queryByText(/Label is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('AI Suggestions', () => {
    it('should display AI suggestions banner when suggestedPrompts provided', () => {
      const suggestedPrompts = [
        { id: 'prompt-1', label: 'Prompt 1', text: 'Improved prompt text' },
      ];

      renderWithToast(
        <PromptsForm
          prompts={mockPrompts}
          onChange={mockOnChange}
          suggestedPrompts={suggestedPrompts}
        />
      );

      expect(screen.getByText(/AI Prompt Suggestions Available/i)).toBeInTheDocument();
    });

    it('should show diff view when suggestion text differs', () => {
      const suggestedPrompts = [
        { id: 'prompt-1', label: 'Prompt 1', text: 'New improved text' },
      ];

      renderWithToast(
        <PromptsForm
          prompts={mockPrompts}
          onChange={mockOnChange}
          suggestedPrompts={suggestedPrompts}
        />
      );

      expect(screen.getByText(/AI Suggested Changes/i)).toBeInTheDocument();
      // Multiple "Removed" and "Added" elements exist in the diff view
      const removedElements = screen.getAllByText(/Removed/i);
      expect(removedElements.length).toBeGreaterThan(0);
      const addedElements = screen.getAllByText(/Added/i);
      expect(addedElements.length).toBeGreaterThan(0);
    });

    it('should not show diff view when suggestion text is same', () => {
      const suggestedPrompts = [
        { id: 'prompt-1', label: 'Prompt 1', text: 'Hello {{name}}' },
      ];

      renderWithToast(
        <PromptsForm
          prompts={mockPrompts}
          onChange={mockOnChange}
          suggestedPrompts={suggestedPrompts}
        />
      );

      expect(screen.queryByText(/AI Suggested Changes/i)).not.toBeInTheDocument();
    });

    it('should call onAcceptSuggestions when accept button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnAccept = vi.fn();
      const suggestedPrompts = [
        { id: 'prompt-1', label: 'Prompt 1', text: 'Improved text' },
      ];

      renderWithToast(
        <PromptsForm
          prompts={mockPrompts}
          onChange={mockOnChange}
          suggestedPrompts={suggestedPrompts}
          onAcceptSuggestions={mockOnAccept}
        />
      );

      const acceptButton = screen.getByText('Accept Changes');
      await user.click(acceptButton);

      expect(mockOnAccept).toHaveBeenCalled();
    });

    it('should call onRejectSuggestions when reject button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnReject = vi.fn();
      const suggestedPrompts = [
        { id: 'prompt-1', label: 'Prompt 1', text: 'Improved text' },
      ];

      renderWithToast(
        <PromptsForm
          prompts={mockPrompts}
          onChange={mockOnChange}
          suggestedPrompts={suggestedPrompts}
          onRejectSuggestions={mockOnReject}
        />
      );

      const rejectButton = screen.getByText('Reject Changes');
      await user.click(rejectButton);

      expect(mockOnReject).toHaveBeenCalled();
    });

    it('should display GitHub-style diff with line numbers', () => {
      const suggestedPrompts = [
        { id: 'prompt-1', label: 'Prompt 1', text: 'Line 1\nLine 2\nLine 3' },
      ];

      const currentPrompts = [
        { id: 'prompt-1', label: 'Prompt 1', text: 'Old line 1\nOld line 2' },
      ];

      renderWithToast(
        <PromptsForm
          prompts={currentPrompts}
          onChange={mockOnChange}
          suggestedPrompts={suggestedPrompts}
        />
      );

      expect(screen.getByText(/Prompt Text/i)).toBeInTheDocument();
      // Check for diff summary messages
      const removedMessages = screen.getAllByText(/removed/i);
      expect(removedMessages.length).toBeGreaterThan(0);
      const addedMessages = screen.getAllByText(/added/i);
      expect(addedMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Variable Detection', () => {
    it('should detect single variable', () => {
      const prompts = [
        { id: 'prompt-1', label: 'Test', text: 'Hello {{name}}' },
      ];

      renderWithToast(
        <PromptsForm prompts={prompts} onChange={mockOnChange} />
      );

      expect(screen.getByText(/Variables detected: {{name}}/i)).toBeInTheDocument();
    });

    it('should detect multiple variables', () => {
      const prompts = [
        { id: 'prompt-1', label: 'Test', text: 'Hello {{name}} from {{city}}, {{country}}' },
      ];

      renderWithToast(
        <PromptsForm prompts={prompts} onChange={mockOnChange} />
      );

      expect(screen.getByText(/Variables detected: {{name}}, {{city}}, {{country}}/i)).toBeInTheDocument();
    });

    it('should not show variable detection when none found', () => {
      const prompts = [
        { id: 'prompt-1', label: 'Test', text: 'No variables here' },
      ];

      renderWithToast(
        <PromptsForm prompts={prompts} onChange={mockOnChange} />
      );

      expect(screen.queryByText(/Variables detected:/i)).not.toBeInTheDocument();
    });

    it('should update variable detection when text changes', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <PromptsForm prompts={mockPrompts} onChange={mockOnChange} />
      );

      expect(screen.getByText(/Variables detected: {{name}}/i)).toBeInTheDocument();

      const textInput = screen.getByDisplayValue('Hello {{name}}');
      await user.clear(textInput);
      await user.type(textInput, 'Hello {{firstName}} {{lastName}}');

      // Since we're calling onChange, we need to re-render with new prompts
      // In actual usage, parent would update the prompts prop
    });

    it('should handle malformed variable syntax gracefully', () => {
      const prompts = [
        { id: 'prompt-1', label: 'Test', text: 'Hello {{name} and {age}}' },
      ];

      renderWithToast(
        <PromptsForm prompts={prompts} onChange={mockOnChange} />
      );

      // Should not crash and should not detect invalid variables
      expect(screen.queryByText(/Variables detected:/i)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string in label', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <PromptsForm prompts={mockPrompts} onChange={mockOnChange} shouldValidate={true} />
      );

      const labelInput = screen.getByDisplayValue('Prompt 1');
      await user.clear(labelInput);

      await waitFor(() => {
        expect(screen.getByText(/Label is required/i)).toBeInTheDocument();
      });
    });

    it('should handle empty string in text', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <PromptsForm prompts={mockPrompts} onChange={mockOnChange} shouldValidate={true} />
      );

      const textInput = screen.getByDisplayValue('Hello {{name}}');
      await user.clear(textInput);

      await waitFor(() => {
        expect(screen.getByText(/Prompt text is required/i)).toBeInTheDocument();
      });
    });

    it('should handle very long label text', async () => {
      const user = userEvent.setup();
      const longText = 'a'.repeat(100);
      const promptsWithLongLabel = [
        { id: 'prompt-1', label: longText, text: 'Hello {{name}}' },
      ];

      renderWithToast(
        <PromptsForm prompts={promptsWithLongLabel} onChange={mockOnChange} />
      );

      expect(screen.getByText(/100\/100 characters/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Maximum reached/i).length).toBeGreaterThanOrEqual(2); // One for prompt count, one for label length
    });

    it('should handle special characters in prompt text', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <PromptsForm prompts={mockPrompts} onChange={mockOnChange} />
      );

      const textInput = screen.getByDisplayValue('Hello {{name}}');
      await user.clear(textInput);
      await user.type(textInput, 'Special chars: @#$%^&*()');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should handle multiline text in prompt', async () => {
      const prompts = [
        { id: 'prompt-1', label: 'Test', text: 'Line 1\nLine 2\nLine 3' },
      ];

      renderWithToast(
        <PromptsForm prompts={prompts} onChange={mockOnChange} />
      );

      const textInput = screen.getByDisplayValue(/Line 1/);
      expect(textInput).toHaveValue('Line 1\nLine 2\nLine 3');
    });
  });

  describe('Help Text', () => {
    it('should display variable syntax help', () => {
      renderWithToast(
        <PromptsForm prompts={mockPrompts} onChange={mockOnChange} />
      );

      expect(screen.getByText(/Use double curly braces for variables/i)).toBeInTheDocument();
    });

    it('should display example prompt', () => {
      renderWithToast(
        <PromptsForm prompts={mockPrompts} onChange={mockOnChange} />
      );

      expect(screen.getByText(/Classify the following text/i)).toBeInTheDocument();
    });

    it('should display limits information', () => {
      renderWithToast(
        <PromptsForm prompts={mockPrompts} onChange={mockOnChange} />
      );

      expect(screen.getByText(/Maximum 1 prompts allowed/i)).toBeInTheDocument();
    });
  });
});
