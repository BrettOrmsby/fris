/** @type {import('ts-jest').JestConfigWithTsJest} */
const settings = {
  preset: "ts-jest/presets/default-esm",
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
  testEnvironment: "node",
  modulePathIgnorePatterns: ["./dist/", "./node_modules/"],
};

export default settings;
