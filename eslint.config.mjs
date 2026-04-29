import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        alert: "readonly",
        confirm: "readonly",
        fetch: "readonly",
        supabaseClient: "readonly",
        Math: "readonly",
        Date: "readonly",
        JSON: "readonly",
        parseFloat: "readonly",
        parseInt: "readonly",
        navigator: "readonly",
        Promise: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn",
      "no-console": "off"
    }
  }
];
