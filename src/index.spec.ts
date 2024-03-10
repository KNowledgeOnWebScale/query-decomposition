import { strict as assert } from "assert";

import { describe, expect, it, test } from "@jest/globals";
import { Algebra, toSparql, translate } from "sparqlalgebrajs";

import { moveUnionsToTop } from "./lift-operator/union.js";

function checkQueryDecomposition(
    decomposeCb: (query: Algebra.Project) => Algebra.Project,
    input: string,
    expected: string,
) {
    const QUERY = translate(input);
    assert(QUERY.type === Algebra.types.PROJECT);

    const q = decomposeCb(structuredClone(QUERY));

    console.log(toSparql(q));
    //console.log("=============================")
    //console.log(toSparql(translate(expected)))
    expect(toSparql(decomposeCb(QUERY))).toEqual(toSparql(translate(expected)));
}

describe("union decomposition", () => {
    it("Should lift a union node with 2 children above a projection", () =>
        checkQueryDecomposition(
            moveUnionsToTop,
            `
        PREFIX : <http://example.com/ns#>

        SELECT * WHERE { 
            { ?s :labelA ?label } UNION { ?s :labelB ?label }
        }`,
            `
        PREFIX : <http://example.com/ns#>

        SELECT ?label ?s WHERE {
            { SELECT ?label ?s WHERE { ?s :labelA ?label. } }
            UNION
            { SELECT ?label ?s WHERE { ?s :labelB ?label. } }
        }`,
        ));
    it("Should lift a union node with 3 children above a projection", () =>
        checkQueryDecomposition(
            moveUnionsToTop,
            `
        PREFIX : <http://example.com/ns#>

        SELECT * WHERE { 
            { ?s :labelA ?label } UNION { ?s :labelB ?label } UNION {?s :labelC ?label }
        }`,
            `
        PREFIX : <http://example.com/ns#>

        SELECT ?label ?s WHERE {
            { SELECT ?label ?s WHERE { ?s :labelA ?label. } }
            UNION
            { SELECT ?label ?s WHERE { ?s :labelB ?label. } }
            UNION
            { SELECT ?label ?s WHERE { ?s :labelC ?label. } }
        }`,
        ));
    describe("Should lift a union over final projection and a", () => {
        test("filter", () =>
            checkQueryDecomposition(
                moveUnionsToTop,
                `
            PREFIX : <http://example.com/ns#>

            SELECT * WHERE { 
                { ?s :labelA ?label } UNION { ?s :labelB ?label }   
                FILTER(STRLEN(?label) > 0)
            }`,
                `
            PREFIX : <http://example.com/ns#>

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
            ));
        it("join", () =>
            checkQueryDecomposition(
                moveUnionsToTop,
                `
            PREFIX : <http://example.com/ns#>

            SELECT * WHERE {
                ?s :label ?pLabel .
                { ?s :labelA ?label } 
                UNION
                { ?s :labelB ?label }
            }`,
                `
            PREFIX : <http://example.com/ns#>

            SELECT ?label ?pLabel ?s WHERE {
                {
                  SELECT ?label ?pLabel ?s WHERE {
                    ?s :label ?pLabel;
                       :labelA ?label.
                  }
                }
                UNION
                {
                  SELECT ?label ?pLabel ?s WHERE {
                    ?s :label ?pLabel;
                       :labelB ?label.
                    }
                }
            }`,
            ));
    });
    it("Should lift and flatten 2 unions above the final projection and join", () =>
        checkQueryDecomposition(
            moveUnionsToTop,
            `
        PREFIX : <http://example.com/ns#>

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
        PREFIX : <http://example.com/ns#>

        SELECT * WHERE {
            {SELECT * WHERE { 
                ?s :labelA ?pLabel; 
                   :labelC ?label 
            }}
            UNION
            {SELECT * WHERE { 
                ?s :labelA ?pLabel;
                   :labelD ?label 
            }}
            UNION
            {SELECT * WHERE { 
                ?s :labelB ?pLabel; 
                   :labelC ?label 
            }}
            UNION
            {SELECT * WHERE { 
                ?s :labelB ?pLabel; 
                   :labelD ?label 
            }}
        }`,
        ));
    it("Should lift a union node with 3 children over the final projection and a join", () =>
        checkQueryDecomposition(
            moveUnionsToTop,
            `
                PREFIX : <http://example.com/ns#>
    
                SELECT * WHERE {
                    ?s :label ?label1 .
                    {{ ?s :labelA ?label } 
                    UNION
                    { ?s :labelB ?label }
                    UNION
                    { ?s :labelC ?label }}
                }`,
            `
                PREFIX : <http://example.com/ns#>
    
                SELECT * WHERE {
                    {
                      SELECT * WHERE {
                        ?s :label ?label1;
                           :labelA ?label.
                      }
                    }
                    UNION
                    {
                      SELECT * WHERE {
                        ?s :label ?label1;
                           :labelB ?label.
                        }
                    }
                    UNION
                    {
                      SELECT * WHERE {
                        ?s :label ?label1;
                           :labelC ?label.
                        }
                    }
                }`,
        ));
    it("Should lift a union node over the final projection and an associative operator node with 3 children", () =>
        checkQueryDecomposition(
            moveUnionsToTop,
            `
                PREFIX : <http://example.com/ns#>

                SELECT * WHERE {
                    ?s :label1 ?label1 .
                    { ?s :label2 ?label2 . FILTER(strlen(?label2) > 0) }
                    {{ ?s :labelA ?label } 
                    UNION
                    { ?s :labelB ?label }}
                }`,
            `
                PREFIX : <http://example.com/ns#>
    
                SELECT * WHERE {
                    {
                        SELECT * WHERE {
                            ?s :label1 ?label1.
                            { ?s :label2 ?label2 . FILTER(strlen(?label2) > 0) }
                            ?s :labelA ?label
                        }
                    }
                    UNION
                    {
                        SELECT * WHERE {
                            ?s :label1 ?label1.
                            { ?s :label2 ?label2 . FILTER(strlen(?label2) > 0) }
                            ?s :labelB ?label
                        }
                    }
                }`,
        ));
});
