/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  rules: {
    // Enforce CSS variable usage for colors
    'color-named': 'never',
    'color-no-hex': true,
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla'],

    // Allow Tailwind/PostCSS at-rules
    'at-rule-no-unknown': [true, { ignoreAtRules: ['theme', 'apply', 'reference', 'tailwind'] }],

    // Disable formatting rules (handled by prettier/personal preference)
    'import-notation': null,
    'no-descending-specificity': null,
    'selector-class-pattern': null,
    'declaration-empty-line-before': null,
    'rule-empty-line-before': null,
    'at-rule-empty-line-before': null,
    'alpha-value-notation': null,
    'color-hex-length': null,
    'color-function-notation': null,
    'color-function-alias-notation': null,
    'media-feature-range-notation': null,
    'declaration-block-single-line-max-declarations': null,
  },
  overrides: [
    {
      files: ['src/styles.css'],
      rules: {
        'color-no-hex': null,
        'function-disallowed-list': null,
      },
    },
  ],
  ignoreFiles: ['dist/**'],
};
