import type { Config } from "jest";
import { compilerOptions } from "./tsconfig.json";
import { pathsToModuleNameMapper } from "ts-jest";

const config: Config = {
    testEnvironment: "node",
    moduleFileExtensions: ["ts", "js", "json"],
    resolver: "ts-jest-resolver",
    roots: ["<rootDir>/src/", "<rootDir>/tests/"],
    testRegex: ".*\\.spec\\.ts$",
    transform: {
        "^.+\\.ts$": ["ts-jest", { useESM: true }],
    },
    collectCoverageFrom: ["<rootDir>/**/*.ts"],
    verbose: true,
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { useESM: true }),
};

export default config;
