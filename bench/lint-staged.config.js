export default {
    // format top level config files
    "./*.(ts|js|json)": "prettier --write",
    "(src|bin)/**/*.ts": ["bash -c tsc --noEmit", "eslint --cache --fix", "prettier --write"],
};
