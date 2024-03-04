export default {
    // format top level config files
    "./*.(ts|js|json)": "prettier --write",
    "(test|src)/**/*.ts": ["tsc-files --noEmit", "eslint --cache --fix", "prettier --write"],
};
