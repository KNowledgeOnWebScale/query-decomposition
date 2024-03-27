export default {
    // format top level config files
    "./*.(ts|js|json)": "prettier --write",
    "(src|tests)/**/*.ts": ["bash -c tsc --noEmit", "eslint --cache --fix", "prettier --write"],
};
