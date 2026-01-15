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
      "@typescript-eslint": tseslint.plugin,
      obsidianmd: obsidianmd
    },
    languageOptions:{
      globals: globals.node,
      parser: tsparser,
      parserOptions: { 
        project: "./tsconfig.json",
        ecmaVersion: 2022,
        sourceType: "module"
      },
    },
    rules: {
      // DESACTIVAR la regla base de ESLint para evitar conflictos
      "no-unused-vars": "off",
      
      // USAR solo la versión de TypeScript que respeta los patrones
      "@typescript-eslint/no-unused-vars": [
        "error",
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
