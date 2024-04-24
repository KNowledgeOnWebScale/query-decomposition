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
        "eqeqeq": "error",
        "guard-for-in": "error",
        "no-constant-condition": ["error", { checkLoops: false }],
        "no-param-reassign": "error",
        "no-return-await": "error",
        "prefer-const": "error",
        "jest/expect-expect": "off",
        "unused-imports/no-unused-imports": "error",
        "@typescript-eslint/no-unused-vars": [
            "warn",
            { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" },
        ],
        "@typescript-eslint/explicit-module-boundary-types": "error",
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-unnecessary-condition": ["error", { allowConstantLoopConditions: true }],
        "@typescript-eslint/prefer-readonly": "error",
        "@typescript-eslint/strict-boolean-expressions": "error",
        "@typescript-eslint/unbound-method": [ "error", { "ignoreStatic": true }],
        "import/order": [
            "error",
            {
                groups: ["builtin", "external", "internal", "parent", "sibling", "index", "object", "type"],
                "newlines-between": "always",
                alphabetize: {
                    order: "asc",
                    caseInsensitive: true,
                },
            },
        ],
    },
};
