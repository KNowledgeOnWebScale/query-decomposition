import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import * as RDF from "@rdfjs/types";
import hash from "object-hash";
import sizeof from "object-sizeof";
import { QueryTree } from "rewrite-sparql-unions-to-top/src/query-tree/index.js";
import { Algebra, toSparql } from "sparqlalgebrajs";

import type objectHash from "object-hash";

export type Path = string;

const FILENAME = fileURLToPath(import.meta.url);
export const PROJECT_DIR = path.dirname(path.dirname(FILENAME));

export async function getContentsOfFilesInDir(
    dir: Path,
    filesFilter: (filename: string) => boolean = () => true,
): Promise<(readonly [Path, string])[]> {
    try {
        const filenames = await fs.readdir(dir);
        return Promise.all(
            filenames
                .map(filename => path.join(dir, filename))
                .filter(filePath => filesFilter(path.basename(filePath, path.extname(filePath))))
                .map(async filePath => {
                    try {
                        const content = await fs.readFile(filePath, "utf-8");
                        return [filePath, content] as const;
                    } catch (err) {
                        throw new Error(`Reading query file: ${new String(err).toString()}`);
                    }
                }),
        );
    } catch (err) {
        throw new Error(`Reading query directory: ${new String(err).toString()}`);
    }
}

export function roughSizeOf(a: unknown): number {
    return sizeof(a);
}

export type KeysOfUnion<T> = T extends T ? keyof T : never;
export type ValuesOfUnion<T> = T[KeysOfUnion<T>];
// https://stackoverflow.com/questions/49401866/all-possible-keys-of-an-union-type

export function notNull<T>(value: T | null): value is T {
    return value !== null;
}
// https://stackoverflow.com/questions/43118692/typescript-filter-out-nulls-from-an-array

export function sortOnHash<T extends objectHash.NotUndefined>(arr: T[]): T[] {
    const hashed = arr.map((x, i) => {
        return { hash: hash(x, { unorderedObjects: true }), idx: i };
    });
    hashed.sort((a, b) => a.hash.localeCompare(b.hash));
    return hashed.map(x => arr[x.idx]!);
}

// Add explicit datatypes, since virtuoso doesn't handle simply string literals correctly (as per RDF 1.1): https://github.com/openlink/virtuoso-opensource/issues/728
export function queryTreeToSparql(q: QueryTree.Project): string {
    return QueryTree.toSparql(q, { explicitDatatype: true });
}
export function algebraToSparql(q: Algebra.Project): string {
    return toSparql(q, { explicitDatatype: true });
}

export function areEqualTerms(term1: RDF.Term, term2: RDF.Term): boolean {
    if (term1.termType !== term2.termType) {
        return false;
    }
    switch (term1.termType) {
        case "Literal": {
            const term2_ = term2 as RDF.Literal;
            return (
                term1.value === term2.value &&
                term1.language === term2_.language &&
                areEqualTerms(term1.datatype, term2_.datatype)
            );
        }
        case "Quad": {
            const term2_ = term2 as RDF.Quad;
            return (
                areEqualTerms(term1.subject, term2_.subject) &&
                areEqualTerms(term1.predicate, term2_.predicate) &&
                areEqualTerms(term1.object, term2_.object) &&
                areEqualTerms(term1.graph, term2_.graph)
            );
        }
        default: {
            return term1.value === term2.value;
        }
    }
} // https://github.com/RubenVerborgh/SPARQL.js/blob/ebde86c4bbc52ee1356f10f9c539a30441c8af1d/lib/SparqlGenerator.js#L414-L436

export function objectFromEntries<const T extends readonly (readonly [PropertyKey, unknown])[]>(
    entries: T,
): { [K in T[number] as K[0]]: K[1] } {
    return Object.fromEntries(entries) as { [K in T[number] as K[0]]: K[1] };
} // https://stackoverflow.com/questions/69019873/how-can-i-get-typed-object-entries-and-object-fromentries-in-typescript/76176570#76176570

export function toFixedS(n: number, decimalPlaces: number): string {
    let s = n.toFixed(decimalPlaces);
    if (s.match(/\./)) {
        s = s.replace(/\.?0+$/, "");
    }
    return s;
} // https://stackoverflow.com/questions/3612744/remove-insignificant-trailing-zeros-from-a-number#answer-20439411
