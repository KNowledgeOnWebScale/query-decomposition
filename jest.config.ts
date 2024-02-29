import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["ts", "js", "json"],
  resolver: "ts-jest-resolver",
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true }],
  },
  //setupFilesAfterEnv: ["<rootDir>/../tests/setup-test-env.ts"],
  collectCoverageFrom: ["<rootDir>/**/*.ts"],
  //coverageDirectory: "../coverage",
  verbose: true,
};

export default config;
