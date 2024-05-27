import path from "node:path";

import minimist from "minimist";

import { printTable } from "../src/results-table/print-tables.js";

const args = minimist(process.argv.slice(2), {
    boolean: ["std-devs"],
});

if (args.h === true || args.help === true || args._.length > 0) {
    console.error(`Usage: ${path.basename(process.argv[1]!, path.extname(process.argv[1]!))} [OPTION]...`);
    console.error("Options:");
    console.error("  -h --help  Show this output.");
    console.error("  --std-devs    Output standard deviations");
    process.exit(args.h === true || args.help === true ? 0 : 1);
}

await printTable(args["std-devs"] as boolean);
