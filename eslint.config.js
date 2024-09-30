import js from '@eslint/js';
import ts from 'typescript-eslint';
import jsdoc from 'eslint-plugin-jsdoc';
import prettier from 'eslint-plugin-prettier/recommended';
import vitest from 'eslint-plugin-vitest';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unicorn from 'eslint-plugin-unicorn';

/**
 * most of the configurations are glob-based,
 * use https://globster.xyz/ to test your glob pattern
 */

/**
 * We export an array of different config chunks.
 * Eslint will merge them into a single object.
 */
export default [
  /**
   * single config with eslint recommended rules.
   */
  js.configs.recommended,

  /**
   * ts.config.recommended is array of the configs:
   * [0] is typescript-eslint/base
   * [1] is typescript-eslint/eslint-recommended
   * [2] is typescript-eslint/strict
   *
   * We want to make sure that we apply these rules only for typescript files.
   */
  ...ts.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),

  /**
   * single config with jsdoc recommended rules.
   */
  jsdoc.configs['flat/recommended-typescript'],

  /**
   * single config with prettier recommended rules.
   */
  prettier,

  /**
   * single config with vitest recommended rules
   */
  {
    files: ['**/test/**/*.ts'],
    plugins: {
      vitest,
    },
    rules: {
      // you can also use vitest.configs.all.rules to enable all rules
      ...vitest.configs.recommended.rules,
    },
  },

  /**
   * list of ignores:
   */
  {
    ignores: [
      'node_modules/**',
      '**/node_modules/**',
      '**/rollup.config.js',
      '**/dist/**',
      '**/dist-api-reference/**',
      '**/dist-demo/**',
      '**/coverage/**',
    ],
  },

  /**
   * language options
   * please define globals or parser options here
   */
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        ecmaFeatures: {
          jsx: true,
        },
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  /**
   * typescript specific rules:
   */
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/explicit-member-accessibility': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/array-type': ['error', { default: 'generic' }],
      '@typescript-eslint/consistent-generic-constructors': 'error',
      '@typescript-eslint/consistent-indexed-object-style': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/prefer-function-type': 'error',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }],
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'memberLike',
          modifiers: ['private'],
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          trailingUnderscore: 'require',
        },
        {
          selector: 'memberLike',
          modifiers: ['protected'],
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          trailingUnderscore: 'require',
        },
      ],
    },
  },

  /**
   * TSX rules
   * mainly for demo pages
   */
  {
    files: ['**/*.tsx'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  /**
   * Other rules:
   */
  {
    rules: {
      'no-console': 'error',
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
      'jsdoc/require-returns': 'off',
    },
  },

  {
    files: ['**/*.{ts,js}'],
    plugins: {
      unicorn,
    },

    rules: {
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
        },
      ],
    },
  },
];
