import { strict as assert } from "node:assert";

import { maximallyDecomposeSelectQuery } from "rewrite-sparql-unions-to-top/src/index.js";
import { Algebra, translate } from "sparqlalgebrajs";

import { algebraToSparql as algebraToSparql } from "../utils.js";

export function getQueryStringScenarios(queryS: string): { changeOne: string[]; onlyOne: string[] } {
    assert(isUnionRewritable(queryS), "Union is not rewritable: " + queryS);

    const q = translate(queryS);
    assert(q.type === Algebra.types.PROJECT);

    const union = findFirstOfType(Algebra.types.UNION, q);
    assert(union !== null);

    const cloneQueryAndFindUnion = () => {
        const qC = structuredClone(q);
        const unionC = findFirstOfType(Algebra.types.UNION, qC);
        assert(unionC !== null && unionC.input.length >= 2);
        return [qC, unionC] as const;
    };

    const ret: ReturnType<typeof getQueryStringScenarios> = { changeOne: [], onlyOne: [] };
    for (let i = 0; i < union.input.length; i++) {
        {
            const [qC, unionC] = cloneQueryAndFindUnion();
            unionC.input = [unionC.input[i]!];
            // Roundtrip to ensure that the union is fully replaced by its operand
            ret.onlyOne.push(algebraToSparql(translate(algebraToSparql(qC)) as Algebra.Project));
        }
        {
            const [qC, unionC] = cloneQueryAndFindUnion();
            changeFirstBGP(unionC.input[i]!);
            ret.changeOne.push(algebraToSparql(qC));
        }
    }
    return ret;
}

function findFirstOfType<K extends Algebra.Operation["type"]>(
    type: K,
    node: Algebra.Operation,
): Algebra.TypedOperation<K> | null {
    if (node.type === type) {
        return node as Algebra.TypedOperation<K>;
    }

    if (!("input" in node)) {
        return null;
    }

    if (Array.isArray(node.input)) {
        for (const inp of node.input as Algebra.Operation[]) {
            const ret = findFirstOfType(type, inp);
            if (ret !== null) {
                return ret;
            }
        }
        return null;
    } else {
        return findFirstOfType(type, node.input as Algebra.Operation);
    }
}

function changeFirstBGP(node: Algebra.Operation) {
    const bgp = findFirstOfType(Algebra.types.BGP, node);
    assert(bgp !== null && bgp.patterns.length > 0);
    bgp.patterns[0]!.predicate.value += "2";
}

function isUnionRewritable(queryS: string): boolean {
    return maximallyDecomposeSelectQuery(queryS).length > 1;
}
