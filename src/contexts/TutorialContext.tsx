import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { logger } from '../lib/logger';

export type TutorialStep =
  | 'welcome'
  | 'select-providers'
  | 'configure-provider'
  | 'add-prompt'
  | 'add-dataset'
  | 'add-assertions'
  | 'view-options'
  | 'view-yaml'
  | 'run-eval'
  | 'view-results'
  | 'results-tabs'
  | 'ai-analysis'
  | 'history-comparison'
  | 'complete';

export interface TutorialStepConfig {
  step: TutorialStep;
  title: string;
  description: string;
  targetTab?: 'providers' | 'prompts' | 'dataset' | 'assertions' | 'settings' | 'results' | 'history';
  targetElement?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    type: 'navigate' | 'interact' | 'wait';
    payload?: any;
  };
  canSkip?: boolean;
  showNext?: boolean;
  showBack?: boolean;
  autoAdvance?: boolean;
  completionCriteria?: string;
}

interface TutorialContextType {
  isActive: boolean;
  currentStep: TutorialStep;
  currentStepIndex: number;
  totalSteps: number;
  startTutorial: () => void;
  endTutorial: () => void;
  skipTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: TutorialStep) => void;
  completeTutorial: () => void;
  getCurrentStepConfig: () => TutorialStepConfig | undefined;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const TUTORIAL_STORAGE_KEY = 'promptfoo-tutorial-completed';

export const tutorialSteps: TutorialStepConfig[] = [
  {
    step: 'welcome',
    title: 'Welcome to Prompt Evaluator!',
    description: 'Let\'s take a quick tour to help you get started with building your first LLM evaluation. This tutorial will guide you through creating a complete evaluation project step by step.',
    position: 'center',
    canSkip: true,
    showNext: true,
    showBack: false,
  },
  {
    step: 'add-prompt',
    title: 'Step 1: Add a Prompt',
    description: 'First, let\'s create a prompt to test. Navigate to the Prompts tab and add a sample prompt. Use variables like {{question}} to make your prompt dynamic. For example: "You are a helpful assistant. Answer: {{question}}"',
    targetTab: 'prompts',
    targetElement: '.prompts-form',
    position: 'right',
    canSkip: false,
    showNext: true,
    showBack: true,
    autoAdvance: true,
    completionCriteria: 'prompt-added',
  },
  {
    step: 'select-providers',
    title: 'Step 2: Select Providers',
    description: 'Now let\'s add AI providers to test. Click "Add Provider" and select two different providers (e.g., Google Gemini and Anthropic Claude). Providers are the AI models you want to compare. Don\'t worry about API keys yet - we\'ll handle that next!',
    targetTab: 'providers',
    targetElement: '.providers-form',
    position: 'right',
    canSkip: false,
    showNext: true,
    showBack: true,
    autoAdvance: true,
    completionCriteria: 'providers-added',
  },
  {
    step: 'configure-provider',
    title: 'Step 3: Configure API Keys (Important!)',
    description: 'You\'ll notice a yellow warning if your API key isn\'t configured. This is normal for first-time users! You have two options: 1) Add your API key directly in the "API Key (Optional)" field, or 2) Add it to your .env file. For this tutorial, you can proceed without API keys (evaluations won\'t run until you add them).',
    targetTab: 'providers',
    targetElement: '.provider-item',
    position: 'right',
    canSkip: false,
    showNext: true,
    showBack: true,
  },
  {
    step: 'add-dataset',
    title: 'Step 4: Add Test Data',
    description: 'Next, add test data in the Dataset tab. Create rows with variables that match your prompt (e.g., "question"). You can add multiple test cases to evaluate how your providers handle different inputs. Pro tip: Use the "Create with AI" button to automatically generate test data based on your prompts!',
    targetTab: 'dataset',
    targetElement: '.dataset-form',
    position: 'right',
    canSkip: false,
    showNext: true,
    showBack: true,
    autoAdvance: true,
    completionCriteria: 'dataset-added',
  },
  {
    step: 'add-assertions',
    title: 'Step 5: Add Assertions',
    description: 'Assertions help you validate the quality of responses. Add two assertions to check if the outputs meet your expectations. Try "contains", "not-contains", or "llm-rubric" assertions. Pro tip: Use the "Create with AI" button to automatically generate relevant assertions based on your prompts and dataset!',
    targetTab: 'assertions',
    targetElement: '.assertions-form',
    position: 'right',
    canSkip: false,
    showNext: true,
    showBack: true,
    autoAdvance: true,
    completionCriteria: 'assertions-added',
  },
  {
    step: 'view-options',
    title: 'Step 6: Explore Settings',
    description: 'Click the Settings button in the top bar to configure advanced settings like output paths, concurrency, AI models, and more. You can keep the defaults for now or customize as needed.',
    targetElement: '.settings-button',
    position: 'bottom',
    canSkip: false,
    showNext: true,
    showBack: true,
  },
  {
    step: 'view-yaml',
    title: 'Step 7: Preview YAML Configuration',
    description: 'You can preview the YAML configuration file by clicking the "Preview YAML" button in the top toolbar. This shows what Promptfoo will use to run your evaluation. You can also copy this for CLI usage!',
    targetElement: '.preview-yaml-button',
    position: 'bottom',
    canSkip: false,
    showNext: true,
    showBack: true,
  },
  {
    step: 'run-eval',
    title: 'Step 8: Run Your Evaluation',
    description: 'Now you\'re ready to run your first evaluation! Click the "Run Evaluation" button in the top toolbar. You\'ll see real-time logs as the evaluation executes.',
    targetElement: '.run-eval-button',
    position: 'bottom',
    canSkip: false,
    showNext: true,
    showBack: true,
  },
  {
    step: 'view-results',
    title: 'Step 9: View Results',
    description: 'Excellent! Your evaluation is complete. The Results tab shows a comprehensive view of how each provider performed across all test cases. You can see pass/fail rates, scores, and detailed outputs.',
    targetTab: 'results',
    targetElement: '.results-view',
    position: 'right',
    canSkip: false,
    showNext: true,
    showBack: true,
  },
  {
    step: 'results-tabs',
    title: 'Step 10: Explore Result Tabs',
    description: 'The results page has multiple tabs: Overview (summary stats), Details (individual test results), and Analysis (AI-powered insights). Click through each tab to explore different views of your data.',
    targetTab: 'results',
    targetElement: '.results-tabs',
    position: 'top',
    canSkip: false,
    showNext: true,
    showBack: true,
  },
  {
    step: 'ai-analysis',
    title: 'Step 11: Try AI Analysis',
    description: 'Click "Generate AI Analysis" to get AI-powered insights about your evaluation results. The analysis will identify patterns, suggest improvements, and provide actionable recommendations.',
    targetTab: 'results',
    targetElement: '.ai-analysis-button',
    position: 'bottom',
    canSkip: false,
    showNext: true,
    showBack: true,
  },
  {
    step: 'history-comparison',
    title: 'Step 12: History & Compare Results',
    description: 'All your evaluation results are automatically saved in the History tab. Click the History icon in the sidebar to view all past evaluations. In the History tab, you can select any two evaluation results and click the "Compare" button to see a detailed side-by-side comparison, highlighting differences in performance, outputs, and scores across runs.',
    targetTab: 'history',
    targetElement: '.history-nav',
    position: 'right',
    canSkip: false,
    showNext: true,
    showBack: true,
  },
  {
    step: 'complete',
    title: 'Tutorial Complete!',
    description: 'Congratulations! You\'ve learned how to create, run, and analyze LLM evaluations with Prompt Evaluator. You\'re now ready to build your own evaluation projects. Happy testing!',
    position: 'center',
    canSkip: false,
    showNext: false,
    showBack: false,
  },
];

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Auto-start tutorial for first-time users
  useEffect(() => {
    const completed = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    console.log('Tutorial check - completed status:', completed);

    if (!completed) {
      // Wait for the app to fully load before starting tutorial
      const timer = setTimeout(() => {
        console.log('Auto-starting tutorial for first-time user');
        setIsActive(true);
      }, 1500); // 1.5 seconds - wait for loader + initial render
      return () => clearTimeout(timer);
    } else {
      console.log('Tutorial already completed or skipped, not auto-starting');
    }
  }, []);

  const startTutorial = useCallback(() => {
    logger.info('tutorial', 'Tutorial started');
    setIsActive(true);
    setCurrentStepIndex(0);
  }, []);

  const endTutorial = useCallback(() => {
    logger.info('tutorial', 'Tutorial ended');
    setIsActive(false);
    setCurrentStepIndex(0);
  }, []);

  const skipTutorial = useCallback(() => {
    logger.info('tutorial', 'Tutorial skipped by user');
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'skipped');
    setIsActive(false);
    setCurrentStepIndex(0);
  }, []);

  const completeTutorial = useCallback(() => {
    logger.info('tutorial', 'Tutorial completed successfully');
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'completed');
    setIsActive(false);
    setCurrentStepIndex(0);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < tutorialSteps.length - 1) {
      const nextStepName = tutorialSteps[currentStepIndex + 1].step;
      logger.debug('tutorial', 'Moving to next step', { from: tutorialSteps[currentStepIndex].step, to: nextStepName });
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      completeTutorial();
    }
  }, [currentStepIndex, completeTutorial]);

  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevStepName = tutorialSteps[currentStepIndex - 1].step;
      logger.debug('tutorial', 'Moving to previous step', { from: tutorialSteps[currentStepIndex].step, to: prevStepName });
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const goToStep = useCallback((step: TutorialStep) => {
    const index = tutorialSteps.findIndex((s) => s.step === step);
    if (index !== -1) {
      logger.debug('tutorial', 'Jumping to specific step', { step, index });
      setCurrentStepIndex(index);
    }
  }, []);

  const getCurrentStepConfig = useCallback(() => {
    return tutorialSteps[currentStepIndex];
  }, [currentStepIndex]);

  const currentStep = tutorialSteps[currentStepIndex]?.step || 'welcome';

  const value: TutorialContextType = {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps: tutorialSteps.length,
    startTutorial,
    endTutorial,
    skipTutorial,
    nextStep,
    previousStep,
    goToStep,
    completeTutorial,
    getCurrentStepConfig,
  };

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
