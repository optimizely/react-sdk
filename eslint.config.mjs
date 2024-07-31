import { fixupConfigRules } from '@eslint/compat';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  ...fixupConfigRules(
    compat.extends(
      'plugin:react-hooks/recommended',
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:prettier/recommended'
    )
  ),
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.mocha,
        ...globals.node,
      },

      ecmaVersion: 2015,
      sourceType: 'module',

      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    rules: {
      '@typescript-eslint/ban-ts-ignore': 'off',
      '@typescript-eslint/camelcase': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      'no-shadow': 'error',
    },
  },
];
