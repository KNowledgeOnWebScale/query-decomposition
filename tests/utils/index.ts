import * as RDF from "@rdfjs/types";
import { Util as externalAlgebraUtil } from "sparqlalgebrajs";

import { QueryTree } from "../../src/query-tree/index.js";

export function inScopeVariables(op: QueryTree.Operand): RDF.Variable[] {
    return externalAlgebraUtil.inScopeVariables(QueryTree.reverseTranslate(op));
}
