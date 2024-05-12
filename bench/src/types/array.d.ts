// Declaration merging
declare interface ReadonlyArray<T> {
    includes(arg: unknown, fromIndex?: number): arg is T;
}

declare interface Array<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): { [K in keyof this]: U };
}
