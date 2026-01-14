import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  {
    ignores: ["dist/", "documentation/", "node_modules/", "screenshots/", "**/generated/**/*"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...obsidianmd.configs.recommended,
  {
    //files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    files: ["**/*.ts"],
    plugins: {
      js,
      "@typescript-eslint": tseslint.plugin,
      obsidianmd: obsidianmd
    },
    extends: ["js/recommended"],
    languageOptions:{
      globals: globals.node,
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
    },
    rules: {
      // Añadir reglas específicas si las necesitas
      // Configurar para parámetros de constructor TypeScript
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "args": "after-used",
          "ignoreRestSiblings": true
        }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    }
  },
]);
