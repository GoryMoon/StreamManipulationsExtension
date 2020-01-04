module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
  },
  extends: [
    'plugin:vue/base',
    'plugin:vue/essential',
    '@vue/airbnb',
  ],
  rules: {
    'no-console': [process.env.NODE_ENV === 'production' ? 'error' : 'off', { allow: ['warn', 'error'] }],
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-return-assign': ['error', 'except-parens'],
    'no-else-return': ['error', { allowElseIf: true }],
  },
  parserOptions: {
    parser: 'babel-eslint',
  },
};
