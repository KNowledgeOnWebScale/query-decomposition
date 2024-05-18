import { strict as assert } from "node:assert";
import { performance } from "node:perf_hooks";

import { Algebra, translate } from "sparqlalgebrajs";

import { executeQuery } from "../execute-query.js";
import { areEquivalent } from "../query-tree/equivalence.js";
import { addTimingA, computeTotalA, createRawFQMTimings, FQMTimingK, type FQMTimings } from "../timings.js";
import { roughSizeOf } from "../utils.js";

import { QueryResolver } from "./query-resolver.js";

import type { Bindings } from "@rdfjs/types";

export class FQMaterialization implements QueryResolver {
    mViews: { query: Algebra.Project; answer: Awaited<ReturnType<typeof executeQuery>> }[] = [];

    async answerQuery(queryS: string): Promise<[Bindings[], FQMTimings]> {
        const timings = createRawFQMTimings();

        let start = performance.now();
        const query = translate(queryS);
        assert(query.type === Algebra.types.PROJECT);
        addTimingA(timings, FQMTimingK.TRANSLATE_TO_TREE, start);

        start = performance.now();
        let answer = this.mViews.find(({ query: materializedQuery2 }) =>
            areEquivalent(materializedQuery2, query),
        )?.answer;
        addTimingA(timings, FQMTimingK.CHECK_EXISTING_MATERIALIZED_VIEW, start);

        start = performance.now();
        if (answer !== undefined) {
            //console.log("FQM AVOIDED in bytes:", roughSizeOf(answer));
            addTimingA(timings, FQMTimingK.COMPUTE_ANSWER_TO_QUERY, start);
        } else {
            answer = await executeQuery(queryS);
            addTimingA(timings, FQMTimingK.COMPUTE_ANSWER_TO_QUERY, start);
            start = performance.now()
            this.mViews.push({ query, answer });
            addTimingA(timings, FQMTimingK.MATERIALIZE_ANSWER_TO_QUERY, start);
        }

        return [answer, computeTotalA(timings)];
    }

    roughSizeOfMaterializedViews(): { queries: number; answers: number } {
        const ret = { queries: 0, answers: 0 };

        const serializedQueries = new Set(this.mViews.map(x => x.query));
        for (const v of serializedQueries.values()) {
            ret.queries += roughSizeOf(v);
        }

        const serializedAnswers = new Set(this.mViews.map(x => x.answer));
        for (const v of serializedAnswers.values()) {
            ret.answers += roughSizeOf(v);
        }
        return ret;
    }
}
