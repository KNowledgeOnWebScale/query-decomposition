// import { strict as assert } from "assert";

// import { describe, expect, it, test } from "@jest/globals";
// import { moveUnionsToTop } from "../src/lift-operator/union.js";
// import { areEqualOps } from "../src/query-tree/compare.js";
// import { toSparql, translate } from "../src/query-tree/translate.js";
// import { Algebra } from "../src/query-tree/index.js";



// function checkQueryDecomposition(input: string, expected: string) {
//     const query = translate(input);
//     assert(query.type === Algebra.types.PROJECT);

//     console.log("=============================")
//     const tq = moveUnionsToTop(query);
//     const expected_ = translate(expected);

//     console.log(tq);
//     console.log(toSparql(expected_))

//     if (!areEqualOps(tq, expected_)) {
//         // This comparison is order sensitive, while the above one is (correctly) not...
//         // Therefore, this output might be slightly misleading, but is better then nothing...
//         expect(toSparql(tq)).toEqual(toSparql(expected_));
//     }
// }

// function checkUnmodifiedQueryDecomposition(input: string) {
//     checkQueryDecomposition(input, input);
// }

// it("Does not modify a query with no union operations", () =>
//     checkQueryDecomposition(
//         `
//     PREFIX : <http://example.com/ns#>

//     SELECT * WHERE { 
//         { ?s :labelA ?label } OPTIONAL { ?s :labelB ?label }
//     }`,
//         `
//     PREFIX : <http://example.com/ns#>

//     SELECT * WHERE { 
//         { ?s :labelA ?label } OPTIONAL { ?s :labelB ?label }
//     }`,
//     ));

// it("Does not modify query with unsupported orderBy operator", () =>
//     checkUnmodifiedQueryDecomposition(
//         `
//     PREFIX : <http://example.com/ns#>

//     SELECT * WHERE { 
//         { ?s :labelA ?label } UNION { ?s :labelB ?label }
//     }
//     ORDER BY ?s`,
//     ));

// it("Lifts a union node with 2 operands above a projection", () =>
//     checkQueryDecomposition(
//         `
//         PREFIX : <http://example.com/ns#>

//         SELECT * WHERE { 
//             { ?s :labelA ?label } UNION { ?s :labelB ?label }
//         }`,
//         `
//         PREFIX : <http://example.com/ns#>

//         SELECT ?label ?s WHERE {
//             { SELECT ?label ?s WHERE { ?s :labelA ?label. } }
//             UNION
//             { SELECT ?label ?s WHERE { ?s :labelB ?label. } }
//         }`,
//     ));

// it("Lifts a union with 3 operands above a projection", () =>
//     checkQueryDecomposition(
//         `
//         PREFIX : <http://example.com/ns#>

//         SELECT * WHERE { 
//             { ?s :labelA ?label } UNION { ?s :labelB ?label } UNION {?s :labelC ?label }
//         }`,
//         `
//         PREFIX : <http://example.com/ns#>

//         SELECT ?label ?s WHERE {
//             { SELECT ?label ?s WHERE { ?s :labelA ?label. } }
//             UNION
//             { SELECT ?label ?s WHERE { ?s :labelB ?label. } }
//             UNION
//             { SELECT ?label ?s WHERE { ?s :labelC ?label. } }
//         }`,
//     ));

// it("Lifts a union over final projection and filter", () =>
//     checkQueryDecomposition(
//         `
//     PREFIX : <http://example.com/ns#>

//     SELECT * WHERE { 
//         { ?s :labelA ?label } UNION { ?s :labelB ?label }   
//         FILTER(STRLEN(?label) > 0)
//     }`,
//         `
//     PREFIX : <http://example.com/ns#>

//     SELECT * WHERE {
//         {
//             SELECT * WHERE {
//                 ?s :labelA ?label.
//                 FILTER((STRLEN(?label)) > 0 )
//             }
//         }
//         UNION
//         {
//             SELECT * WHERE {
//                 ?s :labelB ?label.
//                 FILTER((STRLEN(?label)) > 0 )
//             }
//         }
//     }`,
//     ));

// describe("Lifts a left-hand side union over final projection and", () => {
//     function checkBinaryOpQueryDecomposition(op: string) {
//         checkQueryDecomposition(
//             `
//             PREFIX : <http://example.com/ns#>

//             SELECT * WHERE {
//                 {{ ?s :labelA ?labelA } UNION { ?s :labelB ?labelB }}
//                 ${op} { ?s :label ?label }
//             }`,
//             `
//             PREFIX : <http://example.com/ns#>

//             SELECT * WHERE {
//                 {
//                     SELECT ?label ?labelA ?labelB ?s WHERE {
//                         { ?s :labelA ?labelA } ${op} { ?s :label ?label }
//                     }
//                 }
//                 UNION
//                 {
//                     SELECT ?label ?labelA ?labelB ?s WHERE {
//                         { ?s :labelB ?labelB } ${op} { ?s :label ?label }
//                     }
//                 }
//             }`,
//         );
//     }

//     test("join", () => checkBinaryOpQueryDecomposition("."));
//     test("left join", () => checkBinaryOpQueryDecomposition("OPTIONAL"));
//     test("minus", () =>
//         checkQueryDecomposition(
//             `
//         PREFIX : <http://example.com/ns#>

//         SELECT * WHERE {
//             {{ ?s :labelA ?labelA } UNION { ?s :labelB ?labelB }}
//             MINUS { ?s :label ?label }
//         }`,
//             `
//         PREFIX : <http://example.com/ns#>

//         SELECT * WHERE {
//             {
//                 SELECT ?labelA ?labelB ?s WHERE { 
//                     { ?s :labelA ?labelA } MINUS { ?s :label ?label } 
//                 }
//             }
//             UNION
//             {
//                 SELECT ?labelA ?labelB ?s WHERE {
//                     { ?s :labelB ?labelB } MINUS { ?s :label ?label }
//                 }
//             }
//         }`,
//         ));
// });

// describe("Lifts a right-hand side union over final projection and", () => {
//     function checkBinaryOpQueryDecomposition(op: string) {
//         checkQueryDecomposition(
//             `
//             PREFIX : <http://example.com/ns#>

//             SELECT * WHERE {
//                 ?s :label ?label
//                 ${op} {{ ?s :labelA ?labelA } UNION { ?s :labelB ?labelB }}
//             }`,
//             `
//             PREFIX : <http://example.com/ns#>

//             SELECT * WHERE {
//                 {
//                     SELECT ?label ?labelA ?labelB ?s WHERE { 
//                         ?s :label ?label ${op} { ?s :labelA ?labelA }
//                     }
//                 }
//                 UNION
//                 {
//                     SELECT ?label ?labelA ?labelB ?s WHERE {
//                         ?s :label ?label ${op} { ?s :labelB ?labelB }
//                     }
//                 }
//             }`,
//         );
//     }

//     test("join", () => checkBinaryOpQueryDecomposition("."));
// });

// describe("Does not lift a right-hand side union over final projection and", () => {
//     test("left join", () =>
//         checkUnmodifiedQueryDecomposition(
//             `
//         PREFIX : <http://example.com/ns#>
    
//         SELECT * WHERE {
//             { ?s :label ?label }
//             OPTIONAL {{ ?s :labelA ?labelA } UNION { ?s :labelB ?labelB }}
//         }`,
//         ));
//     test("minus", () =>
//         checkUnmodifiedQueryDecomposition(
//             `
//         PREFIX : <http://example.com/ns#>
    
//         SELECT * WHERE {
//             { ?s :label ?label }
//             MINUS {{ ?s :labelA ?labelA } UNION { ?s :labelB ?labelB }}
//         }`,
//         ));
// });

// it("Should lift and flatten 2 unions above the final projection and join", () =>
//     checkQueryDecomposition(
//         `
//         PREFIX : <http://example.com/ns#>

//         SELECT * WHERE {
//             {
//                 { ?s :labelA ?pLabel } 
//                 UNION
//                 { ?s :labelB ?pLabel }
//             }
//             {
//                 { ?s :labelC ?label } 
//                 UNION
//                 { ?s :labelD ?label }
//             }
//         }`,
//         `
//         PREFIX : <http://example.com/ns#>

//         SELECT * WHERE {
//             {SELECT * WHERE { 
//                 ?s :labelA ?pLabel; 
//                     :labelC ?label 
//             }}
//             UNION
//             {SELECT * WHERE { 
//                 ?s :labelB ?pLabel; 
//                     :labelC ?label 
//             }}
//             UNION
//             {SELECT * WHERE { 
//                 ?s :labelA ?pLabel;
//                     :labelD ?label 
//             }}
//             UNION
//             {SELECT * WHERE { 
//                 ?s :labelB ?pLabel; 
//                     :labelD ?label 
//             }}
//         }`,
//     ));

// it("Should lift a union with 3 operands over the final projection and a join", () =>
//     checkQueryDecomposition(
//         `
//         PREFIX : <http://example.com/ns#>

//         SELECT * WHERE {
//             ?s :label ?label1 .
//             {{ ?s :labelA ?label } 
//             UNION
//             { ?s :labelB ?label }
//             UNION
//             { ?s :labelC ?label }}
//         }`,
//         `
//         PREFIX : <http://example.com/ns#>

//         SELECT * WHERE {
//             {
//                 SELECT * WHERE {
//                 ?s :label ?label1;
//                     :labelA ?label.
//                 }
//             }
//             UNION
//             {
//                 SELECT * WHERE {
//                 ?s :label ?label1;
//                     :labelB ?label.
//                 }
//             }
//             UNION
//             {
//                 SELECT * WHERE {
//                 ?s :label ?label1;
//                     :labelC ?label.
//                 }
//             }
//         }`,
//     ));

// it("Should lift a union over the final projection and an associative operator with 3 operands", () =>
//     checkQueryDecomposition(
//         `
//         PREFIX : <http://example.com/ns#>

//         SELECT * WHERE {
//             ?s :label1 ?label1 .
//             { ?s :label2 ?label2 . FILTER(strlen(?label2) > 0) }
//             {{ ?s :labelA ?label } 
//             UNION
//             { ?s :labelB ?label }}
//         }`,
//         `
//         PREFIX : <http://example.com/ns#>

//         SELECT * WHERE {
//             {
//                 SELECT * WHERE {
//                     ?s :label1 ?label1.
//                     { ?s :label2 ?label2 . FILTER(strlen(?label2) > 0) }
//                     ?s :labelA ?label
//                 }
//             }
//             UNION
//             {
//                 SELECT * WHERE {
//                     ?s :label1 ?label1.
//                     { ?s :label2 ?label2 . FILTER(strlen(?label2) > 0) }
//                     ?s :labelB ?label
//                 }
//             }
//         }`,
//     ));

// // eslint-disable-next-line jest/no-commented-out-tests
// // it("Flattens joins when created during decomposition", () => {
// //     `
// //     PREFIX : <http://example.com/ns#>

// //     SELECT * WHERE {
// //         {
// //             {{?s :l1 ?l1} . {?s :l2 ?l2}}
// //             UNION
// //             {{?s :l3 ?l3} . {?s :l4 ?l4}}
// //         } . { ?s :l5 ?l5 }
// //     }`
// // })