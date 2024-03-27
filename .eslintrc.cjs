module.exports = {
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: "tsconfig.json",
        tsconfigRootDir: __dirname,
        sourceType: "module",
    },
    plugins: [
        "import",
        "jest",
        "no-autofix",
        "unused-imports",
        "@typescript-eslint/eslint-plugin",
    ],
    settings: {
        "import/resolver": {
            typescript: {
                alwaysTryTypes: true,
            },
        },
    },
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:@typescript-eslint/strict",
        "plugin:import/recommended",
        "plugin:jest/recommended",
        "plugin:jest/style",
        "prettier",
    ],
    root: true,
    env: {
        node: true,
        jest: true,
    },
    rules: {
        "guard-for-in": "error",
        eqeqeq: "error",
        "no-param-reassign": "error",
        "no-return-await": "error",
        "prefer-const": "error",
        "no-constant-condition": ["error", { checkLoops: false }],
        "jest/expect-expect": "off",
        //"no-autofix/prefer-const": "error",
        "unused-imports/no-unused-imports": "error",
        //"no-autofix/unused-imports/no-unused-imports": "error",
        "@typescript-eslint/no-unused-vars": [
            "warn",
            { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" },
        ],
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-unnecessary-condition": ["error", { allowConstantLoopConditions: true }],
        "@typescript-eslint/prefer-readonly": "error",
        "@typescript-eslint/strict-boolean-expressions": "error",
        "@typescript-eslint/unbound-method": [ "error", { "ignoreStatic": true }],
        "import/order": [
            "error",
            {
                groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
                "newlines-between": "always",
                alphabetize: {
                    order: "asc",
                    caseInsensitive: true,
                },
            },
        ],
    },
};
