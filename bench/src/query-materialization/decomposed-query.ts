import { strict as assert } from "node:assert";
import { performance } from "node:perf_hooks";

import { decomposeQueryTree } from "move-sparql-unions-to-top/src/index.js";
import { QueryTree } from "move-sparql-unions-to-top/src/query-tree/index.js";
import { moveUnionsToTop } from "move-sparql-unions-to-top/src/rewrite-unions/algorithm.js";
import { Algebra, toSparql, translate } from "sparqlalgebrajs";

import { executeQuery } from "../execute-query.js";
import { areEquivalent } from "../query-tree/equivalence.js";
import { addTimingB, computeTotalB, createRawDQMTimings, DQMTimingK, type DQMTimings } from "../timings.js";
import { roughSizeOf } from "../utils.js";

import { QueryResolver } from "./query-resolver.js";

import type { Bindings } from "@rdfjs/types";

export class DQMaterialization implements QueryResolver {
    private readonly mViews: { query: Algebra.Project; answer: Awaited<ReturnType<typeof executeQuery>>[] }[] = [];

    async answerQuery(queryS: string): Promise<[Bindings[], DQMTimings]> {
        const timings = createRawDQMTimings();

        let start = performance.now();
        const query = translate(queryS);
        assert(query.type === Algebra.types.PROJECT);
        addTimingB(timings, DQMTimingK.TRANSLATE_TO_TREE, start);

        start = performance.now();
        const answer2 = this.mViews.find(({ query: materializedQuery2 }) =>
            areEquivalent(materializedQuery2, query),
        )?.answer;
        addTimingB(timings, DQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW, start);
        if (answer2 !== undefined) {
            return [answer2.flat(), computeTotalB(timings)];
        }

        start = performance.now();
        const query2 = QueryTree.translate(queryS);
        assert(query2.type === QueryTree.types.PROJECT);
        addTimingB(timings, DQMTimingK.TRANSLATE_TO_REWRITE_TREE, start);

        start = performance.now();
        const rewrittenQuery = moveUnionsToTop(query2);
        addTimingB(timings, DQMTimingK.REWRITE_TREE, start);

        start = performance.now();
        const subqueriesTrees = decomposeQueryTree(rewrittenQuery);
        addTimingB(timings, DQMTimingK.DECOMPOSE_TREE, start);

        start = performance.now();
        // add explicit datatypes, since virtuoso doesn't handle simply string literals correctly: https://github.com/openlink/virtuoso-opensource/issues/728
        const subqueries = subqueriesTrees.map(x => QueryTree.toSparql(x, {explicitDatatype: true})); 
        addTimingB(timings, DQMTimingK.TRANSLATE_SQS_TO_REWRITE_TREES, start);

        if (subqueries.length === 1) {
            assert(subqueries[0] === toSparql(query));
        }

        let timeTakenTranslateSq = 0;
        let timeTakenToCheck = 0;
        let timeTakenAnswerSq = 0;
        let timeTakenMaterializeSq = 0;
        const subqueriesAnswers = await Promise.all(
            subqueries.map(async subquery => {
                let sqStart = performance.now();
                const subqueryTree = translate(subquery);
                assert(subqueryTree.type === Algebra.types.PROJECT);
                timeTakenTranslateSq += performance.now() - sqStart;

                sqStart = performance.now();
                const q = this.mViews.find(({ query: materializedQuery }) =>
                    areEquivalent(materializedQuery, subqueryTree),
                );
                timeTakenToCheck += performance.now() - sqStart;

                sqStart = performance.now();
                if (q !== undefined) {
                    console.log("AVOIDED in bytes:", roughSizeOf(q.answer));
                    timeTakenAnswerSq += performance.now() - sqStart;
                    return Promise.resolve(q.answer);
                } else {
                    const subqueryAnswer = await executeQuery(subquery).then(x => [x]);
                    timeTakenAnswerSq += performance.now() - sqStart;
                    sqStart = performance.now();
                    this.mViews.push({ query: subqueryTree, answer: subqueryAnswer });
                    timeTakenMaterializeSq += performance.now() - sqStart;
                    return subqueryAnswer;
                }
            }),
        );
        timings[DQMTimingK.TRANSLATE_SQS_TO_TREE] = { ms: timeTakenTranslateSq, isSummary: false };
        timings[DQMTimingK.CHECK_EXISTING_MATERIALIZED_SQ_VIEW] = { ms: timeTakenTranslateSq, isSummary: false };
        timings[DQMTimingK.ANSWER_SQS] = { ms: timeTakenAnswerSq, isSummary: false };
        timings[DQMTimingK.MATERIALIZE_SQS] = { ms: timeTakenMaterializeSq, isSummary: false };
        timings[DQMTimingK.MATERIALIZE_AND_ANSWER_SQS] = {
            ms: timeTakenTranslateSq + timeTakenToCheck + timeTakenAnswerSq,
            isSummary: true,
        };

        start = performance.now();
        if (subqueries.length > 1) {
            this.mViews.push({
                query: query,
                answer: subqueriesAnswers.flat(),
            });
        }
        addTimingB(timings, DQMTimingK.MATERIALIZE_QUERY, start);

        start = performance.now();
        const answer = subqueriesAnswers.flat(2);
        addTimingB(timings, DQMTimingK.ANSWER_QUERY_FROM_SQS, start);

        return [answer, computeTotalB(timings)];
    }

    roughSizeOfMaterializedViews(): { queries: number; answers: number } {
        const ret = { queries: 0, answers: 0 };

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
