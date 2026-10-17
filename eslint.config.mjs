import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "node_modules/**", "playwright-report/**", "test-results/**", "coverage/**", "next-env.d.ts"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-restricted-imports": "off",
    },
  },
  {
    // Architectural guardrail (PRD §9.3): services must never import React or UI.
    files: ["src/services/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["react", "react-dom", "next/*"], message: "services/ must stay framework-agnostic (PRD §9.3)." },
            { group: ["@/components/*", "@/features/*", "@/hooks/*", "@/store/*"], message: "services/ must not depend on UI or stores." },
          ],
        },
      ],
    },
  },
];

export default config;
