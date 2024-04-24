import * as RDF from "@rdfjs/types";
import hash from "object-hash";
import { Util } from "sparqlalgebrajs";

import * as Algebra from "./algebra.js";
import { reverseTranslate } from "./translate.js";

export function inScopeVariables(op: Algebra.Operation): RDF.Variable[] {
    return Util.inScopeVariables(reverseTranslate(op));
}

export type Hashable = hash.NotUndefined;
