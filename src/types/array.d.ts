// Declaration merging
declare interface ReadonlyArray<T> {
    includes(arg: unknown, fromIndex?: number): arg is T;
}
