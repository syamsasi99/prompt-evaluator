import { z } from 'zod';

// Provider schema
export const ProviderSchema = z.object({
  id: z.string(),
  providerId: z.string().min(1, 'Provider ID is required'),
  config: z.record(z.any()).optional(),
});

// Prompt schema with validation
export const PromptLabelSchema = z
  .string()
  .min(1, 'Label is required')
  .max(100, 'Label must be less than 100 characters')
  .refine((label) => label.trim().length > 0, {
    message: 'Label cannot be only whitespace',
  });

export const PromptTextSchema = z
  .string()
  .min(1, 'Prompt text is required')
  .max(10000, 'Prompt text must be less than 10000 characters')
  .refine((text) => text.trim().length > 0, {
    message: 'Prompt text cannot be only whitespace',
  });

export const PromptSchema = z.object({
  id: z.string(),
  label: PromptLabelSchema,
  text: PromptTextSchema,
});

// Dataset schema
export const DatasetRowSchema = z.record(z.any());

export const DatasetSchema = z.object({
  name: z.string().min(1, 'Dataset name is required'),
  rows: z.array(DatasetRowSchema),
});

// Assertion schema
export const AssertionSchema = z.object({
  id: z.string(),
  type: z.string().min(1, 'Assertion type is required'),
  value: z.union([z.string(), z.number()]).optional(),
  threshold: z.number().min(0).max(1).optional(),
  metric: z.string().optional(),
  rubric: z.string().optional(),
  provider: z.string().optional(),
  weight: z.number().optional(),
  transform: z.string().optional(),
});

// Output path validation
export const HtmlOutputPathSchema = z
  .string()
  .min(1, 'HTML output path is required')
  .max(255, 'Path must be less than 255 characters')
  .refine(
    (path) => path.trim().length > 0,
    'Path cannot be only whitespace'
  )
  .refine(
    (path) => path.endsWith('.html') || path.endsWith('.htm'),
    'HTML output path must end with .html or .htm'
  )
  .refine(
    (path) => !path.includes('..'),
    'Path traversal is not allowed'
  )
  .refine(
    (path) => {
      // Extract filename from path
      const filename = path.split('/').pop() || '';
      // Only allow: letters, numbers, underscores, hyphens, dots, and the file extension
      const validPattern = /^[a-zA-Z0-9_\-\.]+$/;
      return validPattern.test(filename);
    },
    'Filename can only contain letters, numbers, underscores (_), hyphens (-), and dots (.)'
  )
  .refine(
    (path) => {
      // Extract filename from path
      const filename = path.split('/').pop() || '';
      // Remove extension
      const nameWithoutExt = filename.replace(/\.(html|htm)$/, '');
      // Check if filename (without extension) is not empty
      return nameWithoutExt.length > 0;
    },
    'Filename cannot be empty'
  )
  .refine(
    (path) => {
      // Check for multiple consecutive slashes
      return !path.includes('//');
    },
    'Path cannot contain consecutive slashes'
  );

export const JsonOutputPathSchema = z
  .string()
  .min(1, 'JSON output path is required')
  .max(255, 'Path must be less than 255 characters')
  .refine(
    (path) => path.trim().length > 0,
    'Path cannot be only whitespace'
  )
  .refine(
    (path) => path.endsWith('.json'),
    'JSON output path must end with .json'
  )
  .refine(
    (path) => !path.includes('..'),
    'Path traversal is not allowed'
  )
  .refine(
    (path) => {
      // Extract filename from path
      const filename = path.split('/').pop() || '';
      // Only allow: letters, numbers, underscores, hyphens, dots, and the file extension
      const validPattern = /^[a-zA-Z0-9_\-\.]+$/;
      return validPattern.test(filename);
    },
    'Filename can only contain letters, numbers, underscores (_), hyphens (-), and dots (.)'
  )
  .refine(
    (path) => {
      // Extract filename from path
      const filename = path.split('/').pop() || '';
      // Remove extension
      const nameWithoutExt = filename.replace(/\.json$/, '');
      // Check if filename (without extension) is not empty
      return nameWithoutExt.length > 0;
    },
    'Filename cannot be empty'
  )
  .refine(
    (path) => {
      // Check for multiple consecutive slashes
      return !path.includes('//');
    },
    'Path cannot contain consecutive slashes'
  );

// Project options schema
export const ProjectOptionsSchema = z.object({
  outputPath: z.string().optional(),
  jsonOutputPath: z.string().optional(),
  maxConcurrency: z.number().int().positive().optional(),
  sharing: z
    .union([
      z.boolean(),
      z.object({
        apiBaseUrl: z.string().optional(),
        appBaseUrl: z.string().optional(),
      }),
    ])
    .optional(),
  cache: z.boolean().optional(),
});

// Project name validation
export const ProjectNameSchema = z
  .string()
  .min(1, 'Project name is required')
  .max(100, 'Project name must be less than 100 characters')
  .regex(
    /^[a-zA-Z0-9\s\-_\.]+$/,
    'Project name can only contain letters, numbers, spaces, hyphens, underscores, and periods'
  )
  .refine((name) => name.trim().length > 0, {
    message: 'Project name cannot be only whitespace',
  });

// Main project schema
export const ProjectSchema = z.object({
  name: ProjectNameSchema,
  providers: z.array(ProviderSchema).min(1, 'At least one provider is required'),
  prompts: z.array(PromptSchema).min(1, 'At least one prompt is required'),
  dataset: DatasetSchema.optional(),
  assertions: z.array(AssertionSchema),
  options: ProjectOptionsSchema.optional(),
});

export type ProjectType = z.infer<typeof ProjectSchema>;
export type ProviderType = z.infer<typeof ProviderSchema>;
export type PromptType = z.infer<typeof PromptSchema>;
export type DatasetType = z.infer<typeof DatasetSchema>;
export type AssertionType = z.infer<typeof AssertionSchema>;
