import globals from 'globals';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';


/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
  },
  {
    languageOptions: { globals: globals.browser },
  },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      // #region Syntax
      '@typescript-eslint/consistent-type-definitions': ['off'],
      'eqeqeq': ['error', 'always'],
      'no-duplicate-imports': ['warn'],
      '@typescript-eslint/no-empty-interface': ['off'],
      'no-extra-boolean-cast': ['off'],
      'no-nested-ternary': ['error'],
      'no-multi-spaces': ['warn'],
      // Note: Disable base rule when using ts-eslint
      'no-redeclare': ['off'],
      '@typescript-eslint/no-redeclare': ['error'],
      'no-trailing-spaces': ['error'],
      // Note: Disable base rule when using ts-eslint
      'no-unused-vars': ['off'],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'after-used',
          ignoreRestSiblings: true,
        },
      ],
      // "unused-imports/no-unused-imports": "warn",

      // #endregion
      // #region Style

      'brace-style': ['error'],
      '@stylistic/comma-dangle': [
        'warn',
        {
          'arrays': 'always-multiline',
          'objects': 'always-multiline',
          'imports': 'always-multiline',
          'exports': 'always-multiline',
          'functions': 'never',
          'importAttributes': 'always-multiline',
          'dynamicImports': 'always-multiline',
        },
      ],

      'comma-spacing': ['warn', { after: true }],
      'dot-location': ['error', 'property'],
      'eol-last': 2,
      'indent': ['warn', 2],
      'key-spacing': ['warn', { afterColon: true, mode: 'strict' }],
      'max-len': ['warn', { 'code': 80 }],
      'object-curly-spacing': ['warn', 'always'],
      'operator-linebreak': ['error', 'before'],
      'quotes': ['warn', 'single'],
      'semi': ['warn', 'always'],
      'space-in-parens': ['warn', 'never'],
      'spaced-comment': ['warn', 'always', { 'markers': ['/'] }],

      // #endregion
    },
  },
];
