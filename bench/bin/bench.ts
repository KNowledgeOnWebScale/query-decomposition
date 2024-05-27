import path from "node:path";

import minimist from "minimist";

import { BENCHMARK_NAMES, main } from "../src/index.js";

const args = minimist(process.argv.slice(2));

if (
    args.h === true ||
    args.help === true ||
    args._.length > 1 ||
    args._[0] === undefined ||
    !BENCHMARK_NAMES.includes(args._[0])
) {
    if (args._[0] === undefined) {
        console.log("Data source option is required\n");
    } else if (!BENCHMARK_NAMES.includes(args.data_source)) {
        console.log("Invalid data source\n");
    }
    console.error(`Usage: ${path.basename(process.argv[1]!, path.extname(process.argv[1]!))} DATA_SOURCE`);
    console.error("Options:");
    console.error(`  DATA_SOURCE    Data source for dataset and queries [${BENCHMARK_NAMES.join(", ")}]`);
    console.error("  -h --help      Show this output.");
    process.exit(args.h === true || args.help === true ? 0 : 1);
}

await main(args._[0]);
