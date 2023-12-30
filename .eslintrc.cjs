module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    "no-console": 0,
    "no-param-reassign": [
      "error",
      {
        "props": false,
      }
    ],
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        js: "always",
        jsx: "always",
        ts: "always",
        tsx: "always",
        mjs: "always",
      }
    ]
  },
};
