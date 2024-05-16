import type { Timings } from "../timings.js";
import type { Bindings } from "@rdfjs/types";

export interface QueryResolver {
    answerQuery(queryS: string): Promise<[Bindings[], Timings]>;
    roughSizeOfMaterializedViews(): { queries: number; answers: number };
}
