import js from '@eslint/js';
import ts from 'typescript-eslint';
import jsdoc from 'eslint-plugin-jsdoc';
import prettier from 'eslint-plugin-prettier/recommended';
import jest from 'eslint-plugin-jest';

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
    files: ['**/*.ts'],
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
   * single config with jest recommended rules
   */
  {
    files: ['**/test/**/*.ts'],
    ...jest.configs['flat/recommended'],
  },

  /**
   * list of ignores:
   */
  {
    // TODO: update ignores
    ignores: [],
  },

  /**
   * language options
   * please define globals or parser options here
   */
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      // TODO: update globals
      globals: {},
    },
  },

  /**
   * typescript specific rules:
   */
  {
    files: ['**/*.ts'],
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
   * Other rules:
   */
  {
    // TODO: update this list
    rules: {},
  },
];
