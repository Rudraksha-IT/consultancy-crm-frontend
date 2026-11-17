import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import tseslint from "typescript-eslint";

import designTokens from "./eslint-rules/no-raw-style-values.mjs";

const MAX_COMPLEXITY = 5;
const MAX_DEPTH = 2;

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      complexity: ["error", MAX_COMPLEXITY],
      "max-depth": ["error", MAX_DEPTH],
      "no-console": "error",
      "no-var": "error",
      "prefer-const": "error",
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      // Props are `type`s (see coding standards); `interface` stays allowed for extendable shapes.
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
    },
  },
  {
    // Design-system rule 1: tokens only. Colours are written only in the theme module (and globals.css).
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["src/lib/theme/**", "tests/eslint/**"],
    plugins: { "design-tokens": designTokens },
    rules: { "design-tokens/no-raw-style-values": "error" },
  },
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
]);

export default eslintConfig;
