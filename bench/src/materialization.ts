import {strict as assert} from "node:assert"
import { performance } from "node:perf_hooks";

import { decomposeQueryTree } from "move-sparql-unions-to-top/src/index.js";
import { QueryTree } from "move-sparql-unions-to-top/src/query-tree/index.js";
import { moveUnionsToTop } from "move-sparql-unions-to-top/src/rewrite-unions/algorithm.js"
import { Algebra, toSparql, translate } from "sparqlalgebrajs";

import { executeQuery } from "./execute-query.js";
import { QueryResolver } from "./query-resolver.js";
import { areEquivalent } from "./query-tree/equivalence.js";
import { roughSizeOf } from "./utils.js";

import type { Bindings } from "@rdfjs/types";


export class QueryMaterialization extends QueryResolver {
    private readonly mViews: {query: Algebra.Project, answer: Awaited<ReturnType<typeof executeQuery>>[]}[] = []

    async _answerQuery(timings: {msg: string, value: number, isSummary: boolean}[], timeStop: (start: number, msg: string) => void, queryS: string): Promise<Bindings[]> {
        let start = performance.now();
        const query = translate(queryS);
        assert(query.type === Algebra.types.PROJECT);
        timeStop(start, "translate to query tree")

        start = performance.now();
        const query2 = QueryTree.translate(queryS);
        assert(query2.type === QueryTree.types.PROJECT);
        timeStop(start, "translate to rewrite query tree")
        
        start = performance.now();
        const rewrittenQuery = moveUnionsToTop(query2)
        timeStop(start, "rewrite query tree");

        start = performance.now();
        const subqueriesTrees = decomposeQueryTree(rewrittenQuery);
        timeStop(start, "decompose query tree")
        
        start = performance.now();
        const subqueries = subqueriesTrees.map(QueryTree.toSparql);
        timeStop(start, "translate to query strings from rewrite trees")

        if (subqueries.length === 1) {
            assert(subqueries[0] === toSparql(query));
        }

        let timeTakenTranslateSq = 0;
        let timeTakenToCheck = 0;
        let timeTakenSolveSq = 0;
        const subqueriesAnswers = await Promise.all(
            subqueries.map(async subquery => {
                let sqStart = performance.now();
                const subqueryTree = translate(subquery);
                assert(subqueryTree.type === Algebra.types.PROJECT);
                timeTakenTranslateSq += performance.now() - sqStart;

                sqStart = performance.now();
                const q = this.mViews.find(({query: materializedQuery}) => areEquivalent(materializedQuery, subqueryTree));
                timeTakenToCheck += performance.now() - sqStart;

                sqStart = performance.now();
                if (q !== undefined) {
                    // hitCount + 1 or cached size + q[1].size ??
                    console.log("AVOIDED in bytes:", roughSizeOf(q.answer))
                    timeTakenSolveSq += performance.now() - sqStart;
                    return Promise.resolve(q.answer);
                } else {
                    const subqueryAnswer = await executeQuery(subquery).then(x => [x]);
                    this.mViews.push({query: subqueryTree, answer: subqueryAnswer});
                    timeTakenSolveSq += performance.now() - sqStart;
                    return subqueryAnswer;
                }
            }) 
        );
        timings.push(
            {msg: "Total time taken to translate subquery string to tree", value: timeTakenTranslateSq, isSummary: false}, 
            {msg: "Total time taken to check if an existing materialized view can be used",value: timeTakenToCheck, isSummary: false}, 
            {msg: "Total time taken to compute and materialize answer to subquery trees",value: timeTakenSolveSq, isSummary: false},
            {msg: "Total time taken to compute and materialize answer to subquery", value: timeTakenTranslateSq + timeTakenToCheck + timeTakenSolveSq, isSummary: true}
        );

        start = performance.now();
        if (subqueries.length > 1) {
            this.mViews.push({
                query: query,
                answer: subqueriesAnswers.flat()
            });
        }
        timeStop(start, "materialize query");
        start = performance.now();
        const answer = subqueriesAnswers.flat(2);
        timeStop(start, "compute answer to query from subquery answers")

        return answer;
    }

    roughSizeOfMaterializedViews(): {queries: number, answers: number} {
        const ret = {queries: 0, answers: 0};

        const serializedQueries = new Set(this.mViews.map(x => x.query));
        for (const v of serializedQueries.values()) {
            ret.queries += roughSizeOf(v);
        }

        const serializedAnswers = new Set(this.mViews.flatMap(x => x.answer));
        for (const v of serializedAnswers) {
            ret.answers += roughSizeOf(v);
        }
        return ret;
    }
}
