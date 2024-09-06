// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';


export default tseslint.config(
    {
        ignores: [
            'dist/*',
            'dashboard/*',
            'eslint.config.mjs'
        ]
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    prettierConfig,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            }
        },
        rules: {
            "@typescript-eslint/no-misused-promises": 'off'
        }
    }
);