import type { Config } from "jest";

const config: Config = {
    moduleFileExtensions: ["ts", "js", "json"],
    resolver: "ts-jest-resolver",
    roots: ["<rootDir>/src/", "<rootDir>/tests/"],
    testRegex: ".*\\.spec\\.ts$",
    transform: {
        "^.+\\.ts$": ["ts-jest", { useESM: true }],
    },
    setupFilesAfterEnv: ["jest-extended/all"],
    collectCoverageFrom: ["<rootDir>/**/*.ts"],
    //coverageDirectory: "../coverage",
    verbose: true,
};

export default config;
