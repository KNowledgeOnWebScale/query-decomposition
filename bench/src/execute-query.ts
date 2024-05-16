import { QueryEngine } from '@comunica/query-sparql';

import type { Bindings } from "@rdfjs/types";

const queryEngine = new QueryEngine();

export async function executeQuery(query: string): Promise<Bindings[]> {
    //const res = await queryEngine.query(query, { sources: ["http://localhost:3000/sparql"] });
    //const t2 = await queryEngine.resultToString(res, "text/turtle");
    // console.log(query)
    return (await queryEngine.queryBindings(query, { sources: [{type: "sparql", value: "http://localhost:8890/sparql"}] })).toArray()
}