import { strict as assert } from "node:assert";

import { Algebra, toSparql, translate } from "sparqlalgebrajs";

export function getQueryStringScenarios(queryS: string): {fq: string, changeOne: string[], onlyOne: string[]} {
    const q = translate(queryS);
    assert(q.type === Algebra.types.PROJECT);

    const union = findFirstOfType(Algebra.types.UNION, q);
    assert(union !== null);

    const ret: ReturnType<typeof getQueryStringScenarios> = {fq: toSparql(q), changeOne: [], onlyOne: []}
    for (let i = 0; i < union.input.length; i++) {
        const qC = structuredClone(q);
        const union2 = findFirstOfType(Algebra.types.UNION, qC);
        assert(union2 !== null && union2.input.length >= 2);

        ret.onlyOne.push(toSparql({...q, input: structuredClone(union2.input[i]!) }))

        changeFirstBGP(union2.input[i]!);
        ret.changeOne.push(toSparql(qC))
    }
    return ret;
}

function findFirstOfType<K extends Algebra.Operation["type"]>(type: K, node: Algebra.Operation): Algebra.TypedOperation<K> | null {
    if (node.type === type) {
        return node as Algebra.TypedOperation<K>;
    }

    if (!("input" in node)) {
        return null;
    }

    if (Array.isArray(node.input)) {
        for (const inp of node.input) {
            const ret = findFirstOfType(type, inp);
            if (ret !== null) {
                return ret;
            }
        }
        return null;
    } else {
        return findFirstOfType(type, node.input)
    }
}

function changeFirstBGP(node: Algebra.Operation) {
    const bgp = findFirstOfType(Algebra.types.BGP, node);
    assert(bgp !== null && bgp.patterns.length > 0);
    bgp.patterns[0]!.predicate.value += '2';
}