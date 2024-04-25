import * as path from "node:path"
import * as fs from "node:fs/promises"
import { fileURLToPath } from 'node:url';
import { translate } from "../../src/query-tree/translate.js";
import type { PathLike } from "node:fs";
import { getContentsOfFilesInDir, PROJECT_DIR, type Path } from "./utils.js";

import { parse as parseCsv } from 'csv-parse/sync'
import { strict as assert } from "node:assert";
import { exit } from "node:process";
import { UnsupportedAlgebraElement } from "../../src/query-tree/unsupported-element-error.js";
import { fixupQuery } from "./t/fixup-query.js";
import { maximallyDecomposeQuery } from "../../src/index.js";
import { executeQuery } from "./t/execute-query.js";

const QUERIES_DIR = path.join(PROJECT_DIR, "./queries-templated");
const QUERY_ID_FROM_FILENAME_RE = new RegExp("-([0-9]+).sparql$")

const QUERY_SUBSTITUTIONS_DIR = path.join(PROJECT_DIR, "./substitution_parameters");
const SUBSTITUTION_ID_FROM_FILENAME_RE = new RegExp("^interactive_([0-9]+)_param.txt$");

export async function run() {
    const queryStrings = await getContentsOfFilesInDir(QUERIES_DIR, (filePath) => {
        const filename = path.basename(filePath);
        //const prefixes = ["interactive-complex-", "interactive-short-"]
        //return prefixes.some(prefix => filename.startsWith(prefix));
        return filename === "interactive-short-3.sparql";
    });

    const querySubstitutions = new Map((await getContentsOfFilesInDir(QUERY_SUBSTITUTIONS_DIR)).map(([filePath, contents]) => [
        path.basename(filePath).replace("_param.txt", ""),
        parseCsv(contents, {delimiter: "|", columns: true}) as {[key: string]: string}[],
    ]));
    //console.log(querySubstitutions.keys());

    const queries = []
    let bad = 0;
    let good = 0;
    for (let [queryFilePath, queryS] of queryStrings) {
        // if (!queryS.includes("UNION")) {
        //     continue;
        // }

        queryS = fixupQuery(queryS);
        
        const queryName = path.basename(queryFilePath).replace(new RegExp("-(complex|short)"), "").replace("-", "_").replace(new RegExp("([0-9+])(-[a-z\-]+)?\.sparql"), "$1")
        const substitutions = querySubstitutions.get(queryName);
        assert(substitutions !== undefined);

        substitutions.length = 1;

        // const GLOBAL_LIMIT_RE = new RegExp("^LIMIT (\\d+)$", "m");

        // const limitCountMatch = GLOBAL_LIMIT_RE.exec(queryS);
        // const limitCount = limitCountMatch !== null ? limitCountMatch[1]! : null;
        // queryS = queryS.replace(GLOBAL_LIMIT_RE, "");

        const CREATE_TEMPLATE_VAR_RE = (name: string) => new RegExp(`\\$${name}\\b`, "g")

        const queryInstStrings = []
        for (const substitution of substitutions) {
            let querySInst = structuredClone(queryS)
            for (const [k, v] of Object.entries(substitution)) {
                //console.log(`REPLACE ${k} with ${v}`)
                querySInst = querySInst.replaceAll(`$${k}`, v);
            }
            try {
                assert(!CREATE_TEMPLATE_VAR_RE("[a-zA-Z]+").test(querySInst));
            } catch (e) {
                //console.log("FAILED");
                console.log(queryFilePath)
                console.log(querySInst)
                exit(1)
            }
            if (querySInst.includes("$messageId")) {
                const i =2;
            }

            //console.log(queryFilePath, new RegExp("\$").exec(querySInst));
            queryInstStrings.push(querySInst)
        }
        //console.log(queryInstStrings)
        //console.log(substitutions)

        //console.log(queryInstStrings);

        // if (queryS.includes("UNION")) {
        //     console.log(queryS);
        // }
        const subqueries = maximallyDecomposeQuery(queryS).map(x => x + "\nLIMIT 2");
        // console.log(subqueries);

        //const subqueriesResults = await Promise.all(subqueries.map(executeQuery));
        console.log("EXECUTING", subqueries[0]);
        const q = `
            SELECT ?personId ?p2 WHERE {
            ?rootPerson <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Person>;
              <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/id> ?personId.
            }
            LIMIT 2
        `

        console.log((await executeQuery(subqueries[0])).map(bind => bind.toString()));

        // try {
        //     const query = translate(queryS);
        //     good += 1;
        // } catch (err) {
        //     if (!(err instanceof UnsupportedAlgebraElement)) {
        //         bad += 1;
        //         //throw err;
        //     } else {
        //         console.log(err.message)
        //     }
        // }
    }
    // console.log("GOT GOOD", good);
    // console.log("GOT BAD", bad);
}

function getIdFromString(re: RegExp, s: string): number {
    const idMatch = re.exec(path.basename(s));
    if (idMatch == null || idMatch[1] === undefined) {
        throw Error(`Failed to extract ID from string: ${s}`);
    }
    return parseInt(idMatch[1]);
}