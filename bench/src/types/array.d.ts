// Declaration merging
declare interface ReadonlyArray<T> {
    includes(arg: unknown, fromIndex?: number): arg is T;
}

/**
 * Make sure T is at least assignable to U
 */
type Cast<T, U> = T extends U ? T : U;

declare interface Array<T> {
    map<U, This = undefined>(
        callbackfn: (this: This, value: T, index: number, array: this) => U,
        thisArg?: This,
    ): Cast<{ [P in keyof this]: U }, U[]>;
}
