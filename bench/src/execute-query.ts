import { performance } from "node:perf_hooks";

import { QueryEngine } from "@comunica/query-sparql";
import { toSparql, translate } from "sparqlalgebrajs";

import type { Bindings } from "@rdfjs/types";

const queryEngine = new QueryEngine();

export async function executeQuery(query: string): Promise<[Bindings[], number]> {
    //const res = await queryEngine.query(query, { sources: ["http://localhost:3000/sparql"] });
    //const t2 = await queryEngine.resultToString(res, "text/turtle");
    //console.log(query)
    let start = performance.now();
    let ret = await (
        await queryEngine.queryBindings(query, { sources: [{ type: "sparql", value: "http://localhost:8890/sparql" }] })
    ).toArray();
    let time = performance.now() - start;
    if (ret.length === 0) {
        /// Hack: maybe the data was sorted with simple (string) literals rather than explicit strings
        // and since our sparql string to sparql algebra converts all RDF simple literals into string literals
        // or the other way around, with no option to keep the original...
        // so RDF 1.1/SPARQL 1.3 compliant but not SPARQL 1.2/RDF 1.0, which is what e.g. Virtuoso is...
        const query2 = toSparql(translate(query), { explicitDatatype: false });
        start = performance.now();
        ret = await (
            await queryEngine.queryBindings(query2, {
                sources: [{ type: "sparql", value: "http://localhost:8890/sparql" }],
            })
        ).toArray();
        time = performance.now() - start;
    }
    return [ret, time];
}
