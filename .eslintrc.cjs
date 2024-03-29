module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['airbnb-base'],
  overrides: [
    {
      env: {
        node: true,
      },
      files: [
        '.eslintrc.{js,cjs}',
      ],
      parserOptions: {
        sourceType: 'script',
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'import/extensions': ['error', 'ignorePackages', {
      js: 'always',
    }],
    'linebreak-style': 0,
    'no-underscore-dangle': ['error', { allow: ['_id', '__dirname'] }],
    'no-console': 'off',
    'max-len': 'off',
  },
};
