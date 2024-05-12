module.exports = {
    ...require("../.eslintrc.cjs"),
    parserOptions: {
        project: "tsconfig.json",
        tsconfigRootDir: __dirname,
        sourceType: "module",
    },
}