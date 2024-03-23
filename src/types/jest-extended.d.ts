declare module "expect" {
    type JestExtendedMatchers<R> = CustomMatchers<R>;

    // eslint-disable-next-line  @typescript-eslint/no-empty-interface, @typescript-eslint/no-explicit-any
    export interface AsymmetricMatchers extends JestExtendedMatchers<any> {}

    // eslint-disable-next-line  @typescript-eslint/no-empty-interface
    export interface Matchers<R> extends JestExtendedMatchers<R> {}
}
