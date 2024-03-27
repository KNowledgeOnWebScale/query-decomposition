import { Util } from "sparqlalgebrajs";

import * as Algebra from "./algebra.js";
import { reverseTranslate } from "./translate.js";

export function inScopeVariables(op: Algebra.Operation) {
    return Util.inScopeVariables(reverseTranslate(op));
}
