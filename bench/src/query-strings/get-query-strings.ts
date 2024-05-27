import { strict as assert } from "node:assert";
import * as path from "node:path";

import { parse as parseCsv } from "csv-parse/sync";

import { getContentsOfFilesInDir, type Path } from "../utils.js";

export async function getQueryStrings(queriesDir: Path): Promise<{ name: string; value: string }[]> {
    const queries = await getRawQueriesStrings(queriesDir);
    return queries.map(([filePath, queryS]) => {
        return { name: path.basename(filePath).replace(".sparql", ""), value: queryS };
    });
}

export async function getQueryStringsFromTemplates(
    templatesDir: Path,
    substitutionsDir: Path,
): Promise<{ name: string; queries: string[] }[]> {
    const templates = await getRawQueriesStrings(templatesDir);
    const allSubstitutions = new Map(
        (await getContentsOfFilesInDir(substitutionsDir)).map(([filePath, contents]) => [
            path.basename(filePath).replace("_param.txt", ""),
            parseCsv(contents, { delimiter: "|", columns: true }) as Record<string, string>[],
        ]),
    );

    const ret: { name: string; queries: string[] }[] = [];
    for (const [filePath, template] of templates) {
        //template = fixupQueryTemplate(template);

        const subName = path
            .basename(filePath)
            .replace(/-(complex|short)/, "")
            .replace("-", "_")
            .replace(/([0-9+])(-[a-z-]+)?/, "$1")
            .replace(/(_[a-z])?\.sparql$/, "");
        const substitutions = allSubstitutions.get(subName);
        assert(substitutions !== undefined);

        const CREATE_TEMPLATE_VAR_RE = (name: string) => new RegExp(`\\$${name}\\b`, "g");

        const queryInsts: { name: string; queries: string[] } = {
            name: path.basename(filePath).replace(/.sparql$/, ""),
            queries: [],
        };
        for (const substitution of substitutions) {
            let queryS = structuredClone(template);
            for (const [k, v] of Object.entries(substitution)) {
                if (k.endsWith("IRI")) {
                    queryS = queryS.replaceAll(`$${k.replace(/IRI$/, "")}`, `<${v}>`);
                } else if (k.toLowerCase().includes("date")) {
                    const date = new Date(parseInt(v)).toISOString();
                    queryS = queryS.replaceAll(`$${k}`, `"${date}"^^xsd:dateTime`);
                } else if (/^\d+$/.test(v)) {
                    queryS = queryS.replaceAll(`$${k}`, `"${v}"^^xsd:long`);
                } else {
                    queryS = queryS.replaceAll(`$${k}`, `"${v}"`);
                }
            }
            assert(
                !CREATE_TEMPLATE_VAR_RE("[a-zA-Z]+").test(queryS),
                `Substitutions for query '${filePath}' with name '${subName}' is missing variables`,
            );

            queryInsts.queries.push(queryS);
        }
        ret.push(queryInsts);
    }
    return ret;
}

async function getRawQueriesStrings(queriesDir: Path) {
    return getContentsOfFilesInDir(queriesDir);
}
