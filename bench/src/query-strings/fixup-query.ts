
export function fixupQueryTemplate(query: string): string {
    const queryTransformers: ((query: string) => string)[] = [
        removeTopLevelOrderBy, 
        replaceSimpleBinds
    ];

    return queryTransformers.reduce((queryS, cb) => cb(queryS), query);
}

function removeTopLevelOrderBy(query: string): string {
    return query.replaceAll(new RegExp("^ORDER BY.*$", "gm"), "")
}

const BIND_RE = /^\s*BIND ?\( ?(\$[a-zA-Z]+) AS (\?[a-zA-Z]+) ?\)/gm
function replaceSimpleBinds(query_: string) {
    let query = structuredClone(query_);
    const bindMatches = query.matchAll(BIND_RE);
    for (const bindMatch of bindMatches) {
        const templ_var = bindMatch[1]!;
        const sparql_var = bindMatch[2]!;
        query = query.replaceAll(sparql_var, templ_var);
        query = query.replace(bindMatch[0].replace(sparql_var, templ_var) + "\n", "");
    }
    return query;
}