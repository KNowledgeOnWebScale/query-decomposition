import { strict as assert } from "node:assert";
import * as path from "node:path"


import { parse as parseCsv } from 'csv-parse/sync'
import { Algebra, toSparql, translate } from "sparqlalgebrajs";

import { fixupQueryTemplate } from "./fixup-query.js";
import { getContentsOfFilesInDir, type Path } from "./utils.js";

export async function getQueryStrings(templates_dir: Path, substitutions_dir: Path): Promise<string[]> {
    const templates = await getContentsOfFilesInDir(templates_dir, (filePath) => {
        const filename = path.basename(filePath);
        //const prefixes = ["interactive-complex-", "interactive-short-"]
        //return prefixes.some(prefix => filename.startsWith(prefix));
        //return filename === "bi-8.sparql";
        //return filename === "interactive-2complex-1.sparql";
        return true;
    });

    const allSubstitutions = new Map((await getContentsOfFilesInDir(substitutions_dir)).map(([filePath, contents]) => [
        path.basename(filePath).replace("_param.txt", ""),
        parseCsv(contents, {delimiter: "|", columns: true}) as Record<string, string>[],
    ]));


    const queries: string[] = [];
    for (let [filePath, template] of templates) {
        // if (!queryS.includes("UNION")) {
        //     continue;
        // }

        template = fixupQueryTemplate(template);
        
        const name = path.basename(filePath).replace(new RegExp("-(2?complex|short)"), "").replace("-", "_").replace(new RegExp("([0-9+])(-[a-z\-]+)?\.sparql"), "$1")
        const substitutions = allSubstitutions.get(name);
        assert(substitutions !== undefined);
        //console.log(name)

        const CREATE_TEMPLATE_VAR_RE = (name: string) => new RegExp(`\\$${name}\\b`, "g")

        const queryInstStrings = []
        substitutions.length = 1; // TODO: add all
        //console.log(substitutions); // TODO: what if subsition should've been long not string?
        for (const substitution of substitutions) {
            let query = structuredClone(template)
            for (const [k, v] of Object.entries(substitution)) {
                //console.log(`REPLACE ${k} with ${v}`)
                //console.log(v, Number.isInteger(v));
                if (/^\d+$/.test(v)) {
                    query = query.replaceAll(`$${k}`, `"${v}"^^xsd:long`);
                } else {
                    query = query.replaceAll(`$${k}`, `"${v}"`);
                }
            }
            //console.log(!CREATE_TEMPLATE_VAR_RE("[a-zA-Z]+").test(query))
            assert(
                !CREATE_TEMPLATE_VAR_RE("[a-zA-Z]+").test(query),
                `Substitutions for query '${filePath}' with name '${name}' is missing variables`
            )

            queries.push(...g(query).map(x => toSparql(x)));
        }
    }
    return queries;
}

function g(queryS: string) {
    const q = translate(queryS);

    const union = findUnion(q);
    assert(union !== null);

    const ret = [q]
    for (let i = 0; i < union.input.length; i++) {
        const qC = structuredClone(q);
        const union2 = findUnion(qC);
        assert(union2 !== null);
        union2.input.splice(i, 1)
        ret.push(qC)
    }
    return ret;
}

function findUnion(node: Algebra.Operation): Algebra.Union | null {
    if (node.type === Algebra.types.UNION) {
        return node;
    }

    if (!("input" in node)) {
        return null;
    }

    if (Array.isArray(node.input)) {
        for (const inp of node.input) {
            const ret = findUnion(inp);
            if (ret !== null) {
                return ret;
            }
        }
        return null;
    } else {
        return findUnion(node.input)
    }
}