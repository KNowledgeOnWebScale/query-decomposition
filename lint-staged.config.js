export default {
    // format top level config files
    "./*.(ts|js|json)": "prettier --write",
    "(test|src)/**/*.ts": ["bash -c tsc --noEmit", "prettier --write", "eslint --cache --fix"],
};
