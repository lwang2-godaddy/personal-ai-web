'use client';

import { useState, useEffect } from 'react';
import { MigrationDefinition, MigrationOptionSchema, MigrationRunOptions } from '@/lib/models/Migration';

interface MigrationOptionsFormProps {
  migration: MigrationDefinition;
  initialOptions?: Partial<MigrationRunOptions>;
  onChange: (options: MigrationRunOptions) => void;
  disabled?: boolean;
}

/**
 * Dynamic form for configuring migration options
 * Generates form fields based on migration option schema
 */
export default function MigrationOptionsForm({
  migration,
  initialOptions,
  onChange,
  disabled = false,
}: MigrationOptionsFormProps) {
  // Initialize options with defaults
  const [options, setOptions] = useState<MigrationRunOptions>(() => {
    const defaults: MigrationRunOptions = {
      dryRun: true,
      batchSize: 100,
    };

    // Apply schema defaults
    migration.options.forEach((opt) => {
      if (opt.default !== undefined) {
        (defaults as any)[opt.key] = opt.default;
      }
    });

    // Apply initial options
    return { ...defaults, ...initialOptions };
  });

  // Notify parent of changes
  useEffect(() => {
    onChange(options);
  }, [options, onChange]);

  const handleChange = (key: string, value: boolean | number | string) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const renderField = (schema: MigrationOptionSchema) => {
    const value = (options as any)[schema.key];

    switch (schema.type) {
      case 'boolean':
        return (
          <div key={schema.key} className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id={schema.key}
                type="checkbox"
                checked={value ?? schema.default ?? false}
                onChange={(e) => handleChange(schema.key, e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3">
              <label
                htmlFor={schema.key}
                className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}
              >
                {schema.label}
              </label>
              <p className="text-xs text-gray-500">{schema.description}</p>
            </div>
          </div>
        );

      case 'number':
        return (
          <div key={schema.key}>
            <label
              htmlFor={schema.key}
              className={`block text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}
            >
              {schema.label}
            </label>
            <p className="text-xs text-gray-500 mb-1">{schema.description}</p>
            <input
              id={schema.key}
              type="number"
              value={value ?? schema.default ?? 0}
              onChange={(e) => handleChange(schema.key, parseInt(e.target.value) || 0)}
              min={schema.min}
              max={schema.max}
              disabled={disabled}
              className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:text-gray-500"
            />
            {(schema.min !== undefined || schema.max !== undefined) && (
              <p className="text-xs text-gray-400 mt-1">
                Range: {schema.min ?? 'N/A'} - {schema.max ?? 'N/A'}
              </p>
            )}
          </div>
        );

      case 'string':
        return (
          <div key={schema.key}>
            <label
              htmlFor={schema.key}
              className={`block text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}
            >
              {schema.label}
            </label>
            <p className="text-xs text-gray-500 mb-1">{schema.description}</p>
            <input
              id={schema.key}
              type="text"
              value={value ?? schema.default ?? ''}
              onChange={(e) => handleChange(schema.key, e.target.value)}
              placeholder={`Enter ${schema.label.toLowerCase()}`}
              disabled={disabled}
              className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
        );

      case 'select':
        return (
          <div key={schema.key}>
            <label
              htmlFor={schema.key}
              className={`block text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}
            >
              {schema.label}
            </label>
            <p className="text-xs text-gray-500 mb-1">{schema.description}</p>
            <select
              id={schema.key}
              value={value ?? schema.default ?? ''}
              onChange={(e) => handleChange(schema.key, e.target.value)}
              disabled={disabled}
              className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:text-gray-500"
            >
              {schema.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-900">Migration Options</h4>
      <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
        {migration.options.map(renderField)}
      </div>

      {/* Summary */}
      <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-md">
        <p className="font-medium text-blue-800 mb-1">Configuration Summary:</p>
        <ul className="space-y-0.5">
          {options.dryRun && <li>Mode: Dry run (no changes will be made)</li>}
          {!options.dryRun && <li className="text-orange-600 font-medium">Mode: Live (changes will be applied)</li>}
          <li>Batch size: {options.batchSize} users per batch</li>
          {options.startAfterUserId && (
            <li>Resuming from: {options.startAfterUserId}</li>
          )}
        </ul>
      </div>
    </div>
  );
}
