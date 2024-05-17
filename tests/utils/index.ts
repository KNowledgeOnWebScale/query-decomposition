export function areUnorderedEqual<T>(a: readonly T[], b: readonly T[], areEqual: (x: T, y: T) => boolean): boolean {
    if (a.length !== b.length) {
        return false;
    }

    const b_ = b.slice();
    for (const x of a) {
        let found = false;

        for (const [idx, y] of b_.entries()) {
            if (areEqual(x, y)) {
                found = true;
                b_.splice(idx, 1);
                break;
            }
        }

        if (!found) {
            return false;
        }
    }

    return true;
}

export function areOrderedEqual<T>(a: readonly T[], b: readonly T[], areEqual: (x: T, y: T) => boolean): boolean {
    return a.length === b.length && a.every((x, idx) => areEqual(x, b[idx]!));
}
