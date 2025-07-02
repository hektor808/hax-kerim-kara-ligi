// @ts-check

import js from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import globals from "globals";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    plugins: { react: pluginReact },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off", // Vanilla JS projesinde prop-types gereksiz
      "no-unused-vars": "warn", // Hata yerine uyarı olarak gösterelim
    },
    settings: { react: { version: "detect" } },
  },
  {
    files: ['src/**/*.test.js'],
    languageOptions: {
        globals: {
            ...globals.node,
            describe: 'readonly',
            it: 'readonly',
            expect: 'readonly',
        }
    }
  },
  {
    // YENİ IGNORES BÖLÜMÜ
    ignores: [
      "dist/",
      "node_modules/",
      "*.config.js",
      "*.config.cjs",
      ".*rc.cjs",
      "src/tests/*.disabled.js",
      // Backend dosyalarını görmezden gel
      "src/app.js",
      "src/controllers/",
      "src/middleware/",
      "src/utils/errorResponse.js",
      "src/validators/"
    ],
  },
];