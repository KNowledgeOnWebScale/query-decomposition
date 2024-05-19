import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

import { BindingsFactory } from "@comunica/bindings-factory";
import { Algebra, translate } from "sparqlalgebrajs";

import { executeQuery } from "../execute-query.js";
import { areEquivalent } from "../query-tree/equivalence.js";
import { addTimingA, computeTotal, createRawFQMTimings, FQMTimingK, type FQMTimings } from "../timings.js";
import { roughSizeOf } from "../utils.js";

import type { Bindings } from "@rdfjs/types";

const BF = new BindingsFactory();

type MViews = { query: Algebra.Project; answer: Bindings[] }[];

export class FQMaterialization {
    mViews: MViews = [];

    async answerQuery(queryS: string, queryLimit: number): Promise<[Bindings[], FQMTimings]> {
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
        } else {
            const t = performance.now() - start;
            let queryExecTime: number;
            [answer, queryExecTime] = await executeQuery(queryS + `\nLIMIT ${queryLimit}`);
            start = performance.now();
            this.mViews.push({ query, answer });
            timings[FQMTimingK.MATERIALIZE_QUERY] = { ms: performance.now() - start + t + queryExecTime };
        }

        return [answer, computeTotal(timings)];
    }

    roughSizeOfMaterializedViews(): { queryTrees: number; answers: number } {
        const ret = { queryTrees: 0, answers: 0 };

        ret.queryTrees += this.mViews
            .map(x => x.query)
            .map(queryTree => roughSizeOf(queryTree))
            .reduce((acc, e) => acc + e, 0);

        const mViews = new Set(this.mViews.map(x => x.answer));
        for (const v of mViews) {
            ret.answers += roughSizeOf(v);
        }
        return ret;
    }

    static cloneMViews(mViews: MViews): MViews {
        return mViews.map(({ query, answer }) => {
            const queryC = structuredClone(query);
            const answerC = answer.map(y => BF.fromBindings(y));
            return { query: queryC, answer: answerC };
        });
    }
}
