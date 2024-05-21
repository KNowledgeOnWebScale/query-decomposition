import type { executeQuery } from "../execute-query.js";

export type MaterializedView = Awaited<ReturnType<typeof executeQuery>>[0];
