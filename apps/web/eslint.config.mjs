import nextPlugin from "@next/eslint-plugin-next";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooksPlugin from "eslint-plugin-react-hooks";

const nextRules = {
  ...nextPlugin.configs.recommended.rules,
  ...nextPlugin.configs["core-web-vitals"].rules,
};

const eslintConfig = [
  {
    ignores: [".next/**", ".next-build/**", "out/**", "build/**", "next-env.d.ts"],
  },
  ...tsPlugin.configs["flat/recommended"],
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...nextRules,

      // --- Performance guardrails ---
      // Catch missing/incorrect hook deps (causes stale closures & infinite loops)
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Prevent accidental large re-renders from spreading unknown props
      "no-restricted-syntax": [
        "warn",
        {
          selector: "JSXSpreadAttribute",
          message:
            "Avoid spreading props in JSX — it bypasses memo() comparisons and can pass unexpected attributes. Destructure and pass explicitly.",
        },
      ],
    },
  },
];

export default eslintConfig;
