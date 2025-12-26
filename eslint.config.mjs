import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Security: Prevent API key exposure in client code
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["app/api/**", "**/*.server.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/api/*/client", "@/lib/api/*/client.*"],
              message:
                "🔒 SECURITY: Do not import API clients (OpenAI, Pinecone, etc.) in client code. " +
                "This exposes API keys to the browser! Use API routes instead (app/api/**/route.ts).",
            },
            {
              group: ["openai", "openai/*"],
              message:
                "🔒 SECURITY: Do not import OpenAI SDK directly in client code. " +
                "This would expose your API key! Use API routes that call OpenAIService on the server.",
            },
            {
              group: ["@pinecone-database/*"],
              message:
                "🔒 SECURITY: Do not import Pinecone SDK in client code. " +
                "This would expose your API key! Use API routes that call PineconeService on the server.",
            },
            {
              group: ["firebase-admin", "firebase-admin/*"],
              message:
                "🔒 SECURITY: Do not import firebase-admin in client code. " +
                "Use regular firebase SDK for client, firebase-admin for server only (API routes).",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
