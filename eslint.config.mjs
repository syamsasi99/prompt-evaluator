import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'dist-electron/**',
      'release/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      '*.config.js',
      '*.config.ts',
      '*.config.mjs',
      'build/**',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...typescript.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Disable prop-types as we use TypeScript
      'react/prop-types': 'off',
      // React 17+ JSX transform - don't require React import
      'react/react-in-jsx-scope': 'off',
      // Allow unescaped entities in JSX (quotes, apostrophes)
      'react/no-unescaped-entities': 'off',
      // Allow unused vars that start with underscore
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Allow explicit any types (warn instead of error)
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow require() in electron main process
      '@typescript-eslint/no-require-imports': 'off',
      // Allow console logs (can be removed in production build)
      'no-console': 'off',
      // Allow useless escape in regex (common in complex patterns)
      'no-useless-escape': 'warn',
      // Disable ban-ts-comment to allow @ts-ignore when needed
      '@typescript-eslint/ban-ts-comment': 'warn',
      // Disable no-undef as TypeScript handles this
      'no-undef': 'off',
    },
  },
];
