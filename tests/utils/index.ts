import * as RDF from "@rdfjs/types";
import { Util as externalAlgebraUtil } from "sparqlalgebrajs";

import { Algebra } from "../../src/query-tree/index.js";

export function inScopeVariables(op: Algebra.Operand): RDF.Variable[] {
    return externalAlgebraUtil.inScopeVariables(Algebra.reverseTranslate(op));
}
