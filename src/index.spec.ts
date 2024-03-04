import { moveUnionsToTop } from "./lift-operator/union.js";
import { Algebra, toSparql, translate } from "sparqlalgebrajs";

import { describe, expect, it, test } from '@jest/globals';
import { strict as assert } from 'assert';

function checkQueryDecomposition(decomposeCb: (query: Algebra.Project) => Algebra.Project, input: string, expected: string) {
    let QUERY = translate(input);
    assert(QUERY.type == Algebra.types.PROJECT)

    const q = decomposeCb(structuredClone(QUERY))
    assert(q !== null)

    console.log(toSparql(q))
    //console.log("=============================")
    //console.log(toSparql(translate(expected)))
    expect(toSparql(decomposeCb(QUERY))).toEqual(toSparql(translate(expected)));
}

describe("union decomposition", () => {
    it("Should lift a union above a projection", () => checkQueryDecomposition(
        moveUnionsToTop,
        `
        PREFIX : <http://example.com>

        SELECT * WHERE { 
            { ?s :labelA ?label } UNION { ?s :labelB ?label }
        }`,
        `
        PREFIX : <http://example.com>

        SELECT ?label ?s WHERE {
            { SELECT ?label ?s WHERE { ?s :labelA ?label. } }
            UNION
            { SELECT ?label ?s WHERE { ?s :labelB ?label. } }
        }`,
    ))

    describe("Lift union over final projection and", () => {
        test("filter", () => checkQueryDecomposition(
            moveUnionsToTop,
            `
            PREFIX : <http://example.com>

            SELECT * WHERE { 
                { ?s :labelA ?label } UNION { ?s :labelB ?label }   
                FILTER(STRLEN(?label) > 0)
            }`,
            `
            PREFIX : <http://example.com>

            SELECT ?label ?s WHERE {
                {
                SELECT ?label ?s WHERE {
                    ?s :labelA ?label.
                    FILTER((STRLEN(?label)) > 0 )
                }
                }
                UNION
                {
                SELECT ?label ?s WHERE {
                    ?s :labelB ?label.
                    FILTER((STRLEN(?label)) > 0 )
                }
                }
            }`,
        ))

        it("join", () => checkQueryDecomposition(
            moveUnionsToTop,
            `
            PREFIX : <http://example.com>

            SELECT * WHERE {
                ?s :label ?pLabel .
                { ?s :labelA ?label } 
                UNION
                { ?s :labelB ?label }
            }`,
            `
            PREFIX : <http://example.com>

            SELECT ?label ?pLabel ?s WHERE {
                {
                  SELECT ?label ?pLabel ?s WHERE {
                    ?s :labelA ?label;
                      :label ?pLabel.
                  }
                }
                UNION
                {
                  SELECT ?label ?pLabel ?s WHERE {
                    ?s :labelB ?label;
                      :label ?pLabel.
                    }
                }
            }`,
        ))
    })
    it("Should lift 2 unions above the final projection and join", () => checkQueryDecomposition(
        moveUnionsToTop,
        `
        PREFIX : <http://example.com>

        SELECT * WHERE {
            {
                { ?s :labelA ?pLabel } 
                UNION
                { ?s :labelB ?pLabel }
            }
            {
                { ?s :labelC ?label } 
                UNION
                { ?s :labelD ?label }
            }
        }`,
        `
        PREFIX : <http://example.com>

        SELECT * WHERE {
            {SELECT * WHERE { 
                ?s :labelA ?pLabel ; 
                   :labelC ?label 
            }}
            UNION
            {SELECT * WHERE { 
                ?s :labelA ?pLabel ; 
                   :labelD ?label 
            }}
            UNION
            {SELECT * WHERE { 
                ?s :labelB ?pLabel ; 
                   :labelC ?label 
            }}
            UNION
            {SELECT * WHERE { 
                ?s :labelB ?pLabel ; 
                   :labelD ?label 
            }}
        }`,
    ))
})