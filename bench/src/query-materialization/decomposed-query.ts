import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

import { BindingsFactory } from "@comunica/bindings-factory";
import { QueryTree } from "rewrite-sparql-unions-to-top/src/query-tree/index.js";
import { rewriteUnionsToTop } from "rewrite-sparql-unions-to-top/src/rewrite-unions/algorithm.js";
import { Algebra, translate } from "sparqlalgebrajs";

import { executeQuery } from "../execute-query.js";
import { areEquivalent } from "../query-tree/equivalence.js";
import { addTimingB, computeTotal, createRawDQMTimings, DQMTimingK, type DQMTimings } from "../timings.js";
import { algebraToSparql, roughSizeOf, queryTreeToSparql } from "../utils.js";

import { decomposeQuery } from "./decompose-query.js";

import type { MaterializedView } from "./types.js";
import type { Bindings } from "@rdfjs/types";

const BF = new BindingsFactory();

export type VirtualView = MaterializedView[];
type Views = { query: Algebra.Project; answer: VirtualView }[];

export class DQMaterialization {
    views: Views = [];

    async answerQuery(queryS: string, queryResultRowLimit: number): Promise<[Bindings[], DQMTimings]> {
        const timings = createRawDQMTimings();

        let start = performance.now();
        const query = translate(queryS);
        assert(query.type === Algebra.types.PROJECT);
        addTimingB(timings, DQMTimingK.TRANSLATE_TO_TREE, start);

        start = performance.now();
        const answer2 = this.views.find(({ query: mQuery }) => areEquivalent(mQuery, query))?.answer;
        addTimingB(timings, DQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW, start);
        if (answer2 !== undefined) {
            //console.log("DQM FQ AVOIDED in bytes:", roughSizeOf(answer2));
            return [answer2.flat(), computeTotal(timings)];
        }

        start = performance.now();

        const t1 = algebraToSparql(query);
        assert(t1 === algebraToSparql(query));

        const queryRT = QueryTree.translate(queryS);
        assert(queryRT.type === QueryTree.types.PROJECT);
        addTimingB(timings, DQMTimingK.TRANSLATE_TO_REWRITE_TREE, start);

        start = performance.now();
        const qVariables = queryRT.variables;
        let rewrittenQueryTree = rewriteUnionsToTop(queryRT);
        addTimingB(timings, DQMTimingK.REWRITE_TREE, start);

        start = performance.now();
        if (rewrittenQueryTree.type !== QueryTree.types.PROJECT) {
            rewrittenQueryTree = {
                type: QueryTree.types.PROJECT,
                variables: qVariables,
                input: rewrittenQueryTree,
            };
        }
        const rewrittenQuery = translate(queryTreeToSparql(rewrittenQueryTree));
        assert(rewrittenQuery.type === Algebra.types.PROJECT);
        addTimingB(timings, DQMTimingK.TRANSLATE_FROM_REWRITE_TREE_TO_TREE, start);

        start = performance.now();
        const subqueries = decomposeQuery(rewrittenQuery);
        addTimingB(timings, DQMTimingK.DECOMPOSE_TREE, start);

        if (subqueries.length === 1) {
            assert(algebraToSparql(subqueries[0]!) === algebraToSparql(query));
        }

        let timeTakenToCheck = 0;
        let timeTakenMaterializeSq = 0;
        const subqueriesAnswers = await Promise.all(
            subqueries.map(async subquery => {
                let sqStart = performance.now();
                const q = this.views.find(({ query: materializedQuery }) => areEquivalent(materializedQuery, subquery));

                if (q !== undefined) {
                    timeTakenToCheck += performance.now() - sqStart;
                    //console.log("DQM SQ AVOIDED in bytes:", roughSizeOf(q.answer));
                    return Promise.resolve(q.answer);
                } else {
                    timeTakenToCheck += performance.now() - sqStart;

                    sqStart = performance.now();
                    const subqueryS = algebraToSparql(subquery);
                    const timeToTranslateSqToS = performance.now() - sqStart;
                    const [subqueryAnswer, subqueryExecTime] = await executeQuery(subqueryS);
                    sqStart = performance.now();
                    this.views.push({ query: subquery, answer: [subqueryAnswer] });
                    timeTakenMaterializeSq += performance.now() - sqStart + timeToTranslateSqToS + subqueryExecTime;
                    return [subqueryAnswer];
                }
            }),
        );
        timings[DQMTimingK.CHECK_EXISTING_MATERIALIZED_SQ_VIEW] = { ms: timeTakenToCheck };
        timings[DQMTimingK.MATERIALIZE_SQS] = { ms: timeTakenMaterializeSq };

        start = performance.now();
        // If there is only a single subquery than it is equal to the query
        if (subqueries.length > 1) {
            this.views.push({
                query: query,
                answer: subqueriesAnswers.flat(),
            });
        }
        addTimingB(timings, DQMTimingK.MATERIALIZE_QUERY, start);

        start = performance.now();
        const answer = this.views.at(-1)!.answer.flat();
        addTimingB(timings, DQMTimingK.ANSWER_QUERY_FROM_SQS, start);
        assert(answer.length < queryResultRowLimit);

        return [answer, computeTotal(timings)];
    }

    roughSizeOfMaterializedViews(): { queryTrees: number; answers: number } {
        const ret = { queryTrees: 0, answers: 0 };

        ret.queryTrees += this.views
            .map(x => x.query)
            .map(queryTree => roughSizeOf(queryTree))
            .reduce((acc, e) => acc + e, 0);

        // Set of materialized views referred to by the virtual views
        const mViews = new Set(this.views.flatMap(x => x.answer));
        for (const mView of mViews) {
            ret.answers += mView.map(bindings => roughSizeOf([...bindings])).reduce((acc, e) => acc + e, 0);
        }
        // Virtual views
        ret.answers += this.views.map(x => x.answer.length).reduce((acc, e) => acc + e, 0) * 8;

        return ret;
    }

    static cloneViews(views: Views): Views {
        const oldToNewMView = new Map(
            views.flatMap(v => v.answer).map(oldMView => [oldMView, oldMView.map(b => BF.fromBindings(b))]),
        );

        const ret = views.map(({ query, answer }) => {
            const queryC = structuredClone(query);
            const answerC = answer.map(oldMView => oldToNewMView.get(oldMView)!);
            return { query: queryC, answer: answerC };
        });
        return ret;
    }
}
