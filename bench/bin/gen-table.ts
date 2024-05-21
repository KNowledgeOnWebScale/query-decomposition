import path from "node:path";

import minimist from "minimist";

import { printTable } from "../src/table/print-table.js";

const args = minimist(process.argv.slice(2), {
    boolean: ["latex", "plain"],
});

if (args.h === true || args.help === true || args._.length > 1) {
    console.error(`Usage: ${path.basename(process.argv[1]!, path.extname(process.argv[1]!))} [OPTION]...`);
    console.error("Options:");
    console.error("  -h --help  Show this output.");
    console.error("  --latex    Output table as LaTeX");
    console.error("  --plain    Output table as plain text");
    process.exit(args.h === true || args.help === true ? 0 : 1);
}

await printTable(args.latex as boolean);
