/**
 * Service Layer
 *
 * This module provides a clean separation between business logic and UI components.
 * Services handle validation, evaluation, and history management.
 */

export { ValidationService } from './ValidationService';
export type { ValidationResult } from './ValidationService';

export { EvaluationService } from './EvaluationService';
export type { EvaluationOptions, EvaluationResult } from './EvaluationService';

export { HistoryService } from './HistoryService';
export type { HistoryStats } from './HistoryService';
