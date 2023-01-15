module.exports = {
    root: true,
    env: {
        browser: true,
        es6: true
    },
    extends: [
        'plugin:vue/vue3-essential',
        '@vue/standard'
    ],
    parserOptions: {
        parser: 'babel-eslint'
    },
    rules: {
        indent: ['error', 4],
        'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        'no-return-assign': ['error', 'except-parens'],
        'no-else-return': ['error', { allowElseIf: true }]
    }
}
