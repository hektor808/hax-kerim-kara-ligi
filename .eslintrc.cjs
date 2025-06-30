module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended', // React için önerilen kurallar
    'prettier', // Prettier ile çakışan kuralları devre dışı bırakır
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react'],
  settings: {
    react: {
      version: 'detect', // Yüklü React versiyonunu otomatik algılar
    },
  },
  rules: {
    // Proje ilerledikçe buraya kendi özel kurallarınızı ekleyebilirsiniz.
    // Örnek: 'no-console': 'warn', // console.log kullanımında uyarır.
  },
  // Vitest test dosyaları için global değişkenleri tanımlar
  globals: {
    describe: 'readonly',
    it: 'readonly',
    expect: 'readonly',
  },
};