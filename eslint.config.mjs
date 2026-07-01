// Flat config (ESLint 9). Run with `npm run lint` after `npm install`.
import js from '@eslint/js';
import globals from 'globals';

export default [
    { ignores: ['build/**', 'vendor/**', 'node_modules/**'] },

    js.configs.recommended,

    // Extension source runs in the browser (+ web-extension APIs).
    {
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            globals: { ...globals.browser, ...globals.webextensions, cloneInto: 'readonly' },
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        },
    },

    // Classic scripts in the page (MAIN) world — not ES modules. controller.js
    // is ALSO loaded as CommonJS in Node/tests, so it legitimately touches
    // `module`/`exports`; those globals are harmless for inject.js, which ignores them.
    {
        files: ['inject.js', 'engine/controller.js'],
        languageOptions: {
            sourceType: 'script',
            globals: { ...globals.browser, ...globals.commonjs, ZeroDelay: 'writable' },
        },
    },

    // Node-side tooling and tests.
    {
        files: ['scripts/**', 'test/**'],
        languageOptions: { sourceType: 'module', globals: globals.node },
    },
];
