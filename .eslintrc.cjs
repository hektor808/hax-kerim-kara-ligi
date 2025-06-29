// .eslintrc.cjs
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "prettier" // ESLint ve Prettier'in çakışmasını engeller
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Buraya gelecekte özel kurallar ekleyebilirsiniz
  },
};