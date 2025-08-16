// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      "node_modules/",
      "dist/",
      "coverage/",
      "**/*.d.ts",
    ],
  },
  // Base JS rules
  js.configs.recommended,
  // TypeScript recommended (flat config)
  ...tseslint.configs.recommended,
  // Server overrides
  {
    files: ["server/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly",
      },
    },
    rules: {},
  },
  // Client overrides
  {
    files: ["client/**/*.ts", "client/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        WebSocket: "readonly",
        location: "readonly",
        addEventListener: "readonly",
        setInterval: "readonly",
        requestAnimationFrame: "readonly",
        performance: "readonly",
      },
    },
    plugins: {
      import: (await import("eslint-plugin-import")).default,
      promise: (await import("eslint-plugin-promise")).default,
      n: (await import("eslint-plugin-n")).default,
      "unused-imports": (await import("eslint-plugin-unused-imports")).default,
    },
    rules: {
      // Core
      "no-unused-vars": "off", // handled by TS + unused-imports
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { vars: "all", args: "after-used", argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Imports hygiene
      "import/first": "error",
      "import/newline-after-import": "error",
      "import/no-duplicates": "error",

      // Promises
      "promise/catch-or-return": "off",
      "promise/no-return-wrap": "error",

      // Node
      "n/no-missing-import": "off", // TS will resolve
      "n/no-unsupported-features/es-syntax": "off",

      // Style-ish
      eqeqeq: ["error", "smart"],
      curly: ["error", "multi-line"],
    },
  },
];

