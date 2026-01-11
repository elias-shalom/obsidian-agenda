import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  //...obsidianmd.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions:{
      globals: globals.browser,
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
    },
    
  },
  //tseslint.configs.recommended,
]);
