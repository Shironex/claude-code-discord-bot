const typescriptEslintEslintPlugin = require("@typescript-eslint/eslint-plugin");
const globals = require("globals");
const tsParser = require("@typescript-eslint/parser");
const js = require("@eslint/js");
const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = [
    // Configuration for source files
    ...compat.extends(
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
        "prettier",
    ).map(config => ({
        ...config,
        files: ["src/**/*.ts"]
    })),
    {
        files: ["src/**/*.ts"],
        plugins: {
            "@typescript-eslint": typescriptEslintEslintPlugin,
        },

        languageOptions: {
            globals: {
                ...globals.node,
            },

            parser: tsParser,
            ecmaVersion: 5,
            sourceType: "module",

            parserOptions: {
                project: "./tsconfig.json",
            },
        },

        rules: {
            "@typescript-eslint/interface-name-prefix": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/ban-types": "off",
        },
    },
    // Configuration for test files
    ...compat.extends(
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
        "prettier",
    ).map(config => ({
        ...config,
        files: ["tests/**/*.ts", "jest.setup.ts"]
    })),
    {
        files: ["tests/**/*.ts", "jest.setup.ts"],
        plugins: {
            "@typescript-eslint": typescriptEslintEslintPlugin,
        },

        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },

            parser: tsParser,
            ecmaVersion: 5,
            sourceType: "module",

            parserOptions: {
                project: "./tsconfig.json",
            },
        },

        rules: {
            "@typescript-eslint/interface-name-prefix": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/ban-types": "off",
            "@typescript-eslint/no-empty-function": "off",
        },
    },
    {
        ignores: ["*.config.js", "dist/**", "coverage/**", "node_modules/**"]
    }
];