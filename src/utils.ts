export function prettyPrintJSON(value: unknown) {
    console.debug(JSON.stringify(value, null, 2));
}
