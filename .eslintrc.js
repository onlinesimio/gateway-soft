module.exports = {
  root: true,
  parser: 'babel-eslint',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 8,
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
      jsx: true
    },
  },
  extends: "eslint:recommended",
  env: {
    browser: false,
    node: true
  },
  globals: {
    __static: true
  },
  plugins: [
    'html'
  ],
  rules: {
    'arrow-parens': 0,
    'generator-star-spacing': 0,
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    'no-unused-labels': 0,
    'no-empty': 0,
    'no-console': 0,
    'no-undef': 0,
    'no-unused-vars': 0
  }
}