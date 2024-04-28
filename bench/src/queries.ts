import * as path from "node:path"
import { getContentsOfFilesInDir, type Path } from "./utils.js";

import { parse as parseCsv } from 'csv-parse/sync'
import { strict as assert } from "node:assert";
import { fixupQueryTemplate } from "./fixup-query.js";

export async function getQueries(templates_dir: Path, substitutions_dir: Path) {
    const templates = await getContentsOfFilesInDir(templates_dir, (filePath) => {
        const filename = path.basename(filePath);
        //const prefixes = ["interactive-complex-", "interactive-short-"]
        //return prefixes.some(prefix => filename.startsWith(prefix));
        return filename === "interactive-short-3.sparql";
    });

    const allSubstitutions = new Map((await getContentsOfFilesInDir(substitutions_dir)).map(([filePath, contents]) => [
        path.basename(filePath).replace("_param.txt", ""),
        parseCsv(contents, {delimiter: "|", columns: true}) as {[key: string]: string}[],
    ]));


    const queries = [];
    for (let [filePath, template] of templates) {
        // if (!queryS.includes("UNION")) {
        //     continue;
        // }

        template = fixupQueryTemplate(template);
        
        const name = path.basename(filePath).replace(new RegExp("-(complex|short)"), "").replace("-", "_").replace(new RegExp("([0-9+])(-[a-z\-]+)?\.sparql"), "$1")
        const substitutions = allSubstitutions.get(name);
        assert(substitutions !== undefined);

        const CREATE_TEMPLATE_VAR_RE = (name: string) => new RegExp(`\\$${name}\\b`, "g")

        const queryInstStrings = []
        substitutions.length = 1; // maybe more?
        for (const substitution of substitutions) {
            let query = structuredClone(template)
            for (const [k, v] of Object.entries(substitution)) {
                //console.log(`REPLACE ${k} with ${v}`)
                query = query.replaceAll(`$${k}`, v);
            }
            assert(
                !CREATE_TEMPLATE_VAR_RE("[a-zA-Z]+").test(query),
                `Substitutions for query '${filePath}' with name '${name}' is missing variables`
            )

            queries.push(query);
        }
    }
    return queries;
}