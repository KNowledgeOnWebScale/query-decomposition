import { Algebra } from "sparqlalgebrajs";

import hash from "object-hash"
import { strict as assert } from "assert";

function haveEqualOpType<A extends Algebra.Operation>(a: A, b: Algebra.Operation): b is A {
    return a.type == b.type;
}

export function areEqualOps<T1 extends Algebra.Operation, T2 extends Algebra.Operation>(a: T1, b_: T2): boolean {
    if (!haveEqualOpType(a, b_)) {
        return false;
    }

    const areOpsUnorderedEqual = (inp1: Algebra.Operation[], inp2: Algebra.Operation[]) => inp1.length === inp2.length && inp1.every(x => inp2.some(y => areEqualOps(y, x)));
    const areOpsOrderedEqual = (inp1: Algebra.Operation[], inp2: Algebra.Operation[]) => inp1.length === inp2.length && inp1.every((x, idx) => areEqualOps(x, inp2[idx]));

    // Objects which have to match exactly (possibly because it doesn't matter) are treated like boxes and compared using object hashes
    const hashOrUndefined = (x: hash.NotUndefined | undefined) => x !== undefined ? hash(x) : x; 

    // Type narrowing doesn't currently affect the shared generic
    switch (a.type) {
        case Algebra.types.PROJECT: {
            const b = b_ as Algebra.Project;

            return a.variables.every(x => b.variables.some(y => y.value === x.value)) && areEqualOps(a.input, b.input);
        }
        case Algebra.types.FILTER: {
            const b = b_ as Algebra.Filter;

            return (hash(a.expression) === hash(b.expression)) && areEqualOps(a.input, b.input);
        }
        // TODO Minus and leftjoin associative and or commutivity!
        case Algebra.types.UNION: case Algebra.types.JOIN: {
            const b = b_ as (Algebra.Union | Algebra.Join);

            return areOpsUnorderedEqual(a.input, b.input);
        }
        case Algebra.types.LEFT_JOIN: {
            const b = b_ as Algebra.LeftJoin;

            return (hashOrUndefined(a.expression) === hashOrUndefined(b.expression)) && areOpsOrderedEqual(a.input, b.input);
        }
        case Algebra.types.MINUS: {
            const b = b_ as Algebra.Minus;
            
            //return areEqualOps(b.input[0], a.input[0]) && areEqualOps(b.input[1], a.input[1]); // TODO why does making the second one (b.input[1], a.input[1]) cause a Quad to not have any methods?!

            return areOpsOrderedEqual(a.input, b.input);
        }
        case Algebra.types.BGP: {
            const b = b_ as Algebra.Bgp;


        
            // TODO why does y.equals not work one in a million, how does y not have the equals method?!

            try {
                return a.patterns.every(x => b.patterns.find(y => {
                    if (x.equals === undefined) {
                        console.log("X Undefined!")
                        assert(false)
                    } else if (y.equals === undefined) {
                        console.log("Y undefined!")
                    }
                    // A hack since the quads that won't effect scope (=left side of minus and left join operators) apparently have no methods but all the values of quads still?!
                    return x.equals === undefined ? y.equals(x) : x.equals(y);
                    //y.equals(x)
                }));
            } catch (err) {
                const e = 1;
                throw err;
            }
        }
        default: {
            return hash(a) == hash(b_);
        }
    }
}
