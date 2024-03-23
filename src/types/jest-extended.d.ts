import * as matchers from "jest-extended";

declare module "expect" {
    type JestExtendedMatchers = typeof matchers;

    // eslint-disable-next-line  @typescript-eslint/no-empty-interface, @typescript-eslint/no-explicit-any
    export interface AsymmetricMatchers extends JestExtendedMatchers {}

    // eslint-disable-next-line  @typescript-eslint/no-empty-interface
    export interface Matchers extends JestExtendedMatchers {}
}
