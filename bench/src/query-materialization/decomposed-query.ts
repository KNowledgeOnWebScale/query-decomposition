import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

import { BindingsFactory } from "@comunica/bindings-factory";
import { QueryTree } from "move-sparql-unions-to-top/src/query-tree/index.js";
import { moveUnionsToTop } from "move-sparql-unions-to-top/src/rewrite-unions/algorithm.js";
import { Algebra, translate } from "sparqlalgebrajs";

import { executeQuery } from "../execute-query.js";
import { areEquivalent } from "../query-tree/equivalence.js";
import { addTimingB, computeTotal, createRawDQMTimings, DQMTimingK, type DQMTimings } from "../timings.js";
import { algebraToSparql, roughSizeOf, queryTreeToSparql } from "../utils.js";

import { decomposeQuery } from "./decompose-query.js";

import type { Bindings } from "@rdfjs/types";

const BF = new BindingsFactory();

type MViews = { query: Algebra.Project; answer: Bindings[][] }[];

export class DQMaterialization {
    mViews: MViews = [];

    async answerQuery(queryS: string, subqueryLimit: number): Promise<[Bindings[], DQMTimings]> {
        const timings = createRawDQMTimings();

        let start = performance.now();
        const query = translate(queryS);
        assert(query.type === Algebra.types.PROJECT);
        addTimingB(timings, DQMTimingK.TRANSLATE_TO_TREE, start);

        start = performance.now();
        const answer2 = this.mViews.find(({ query: mQuery }) => areEquivalent(mQuery, query))?.answer;
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
        const rewrittenQueryS = moveUnionsToTop(queryRT);
        addTimingB(timings, DQMTimingK.REWRITE_TREE, start);

        start = performance.now();
        const rewrittenQuery = translate(queryTreeToSparql(rewrittenQueryS));
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
                const q = this.mViews.find(({ query: materializedQuery }) =>
                    areEquivalent(materializedQuery, subquery),
                );

                //sqStart = performance.now();
                if (q !== undefined) {
                    timeTakenToCheck += performance.now() - sqStart;
                    //console.log("DQM SQ AVOIDED in bytes:", roughSizeOf(q.answer));
                    return Promise.resolve(q.answer);
                } else {
                    timeTakenToCheck += performance.now() - sqStart;

                    sqStart = performance.now();
                    const subqueryS = algebraToSparql(subquery);
                    const t = performance.now() - sqStart;
                    const [subqueryAnswer, subqueryExecTime] = await executeQuery(
                        subqueryS + `\nLIMIT ${subqueryLimit}`,
                    );
                    this.mViews.push({ query: subquery, answer: [subqueryAnswer] });
                    timeTakenMaterializeSq += t + subqueryExecTime;
                    return [subqueryAnswer];
                }
            }),
        );
        timings[DQMTimingK.CHECK_EXISTING_MATERIALIZED_SQ_VIEW] = { ms: timeTakenToCheck };
        timings[DQMTimingK.MATERIALIZE_SQS] = { ms: timeTakenMaterializeSq };

        start = performance.now();
        // If there is only a single subquery than it is equal to the query
        if (subqueries.length > 1) {
            this.mViews.push({
                query: query,
                answer: subqueriesAnswers.flat(),
            });
        }
        addTimingB(timings, DQMTimingK.MATERIALIZE_QUERY, start);

        start = performance.now();
        const answer = this.mViews.at(-1)!.answer.flat();
        addTimingB(timings, DQMTimingK.ANSWER_QUERY_FROM_SQS, start);

        return [answer, computeTotal(timings)];
    }

    roughSizeOfMaterializedViews(): { queryTrees: number; answers: number } {
        const ret = { queryTrees: 0, answers: 0 };

        ret.queryTrees += this.mViews
            .map(x => x.query)
            .map(queryTree => roughSizeOf(queryTree))
            .reduce((acc, e) => acc + e, 0);

        // Set of materialized views referred to by the virtual views
        const mViews = new Set(this.mViews.flatMap(x => x.answer));
        for (const v of mViews) {
            ret.answers += roughSizeOf(v);
        }
        // Virtual views
        ret.answers += this.mViews.map(x => x.answer.length).reduce((acc, e) => acc + e, 0) * 8;

        return ret;
    }

    static cloneMViews(mViews: MViews): MViews {
        return mViews.map(({ query, answer }) => {
            const queryC = structuredClone(query);
            const answerC = answer.map(x => {
                return x.map(y => BF.fromBindings(y));
            });
            return { query: queryC, answer: answerC };
        });
    }
}
