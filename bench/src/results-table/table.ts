import assert from "node:assert/strict";

import { areOrderedEqual } from "move-sparql-unions-to-top/tests/utils/index.js";

import type { BenchmarkName } from "../index.js";
import type { Entries } from "type-fest";
import type { ObjectEntries } from "type-fest/source/entries.js";

const decimalPlaces = 2;

type QueryName = string;

export enum Col {
    FQ = "FQ",
    MFQ = "AMFQ",
    ONLY_ONE = "OOSQ",
    CHANGE_ONE = "COSQ",
}

export const BenchmarkDisplayNames: { [K in BenchmarkName]: { displayName: string; isAcronym: boolean } } = {
    bsbm: { displayName: "BSBM", isAcronym: true },
    ldbc: { displayName: "LDBC-SNB", isAcronym: true },
    sp2b: { displayName: "SP²Bench", isAcronym: false },
};

export class Table<RowHeaders extends { name: string; unit: Unit | null }[]> {
    private static readonly colHeaderSToIdx = new Map(Object.values(Col).map((x, i) => [x, i + 2])); // First column 2 columns are header
    private static readonly colCount = Object.values(Col).length;

    private readonly rowHeaderSToIdx;
    private readonly rowHeaderSToUnit;

    rows: {
        [K in QueryName]: {
            [K in Col]?: {
                [K in RowHeaders[number]["name"]]: { fQM: number | null; dQM: number | null };
            };
        };
    };

    private readonly title;
    constructor(
        benchName: BenchmarkName,
        readonly rowHeaders: RowHeaders,
        private readonly textWidth?: string,
    ) {
        this.title = BenchmarkDisplayNames[benchName];
        this.rowHeaderSToIdx = new Map(rowHeaders.map((x, i) => [x.name, i]));
        this.rowHeaderSToUnit = new Map(rowHeaders.map(x => [x.name, x.unit]));
        this.rows = {};
    }

    toLaTeX(): string {
        const s = [];
        s.push(
            `\\resizebox{${this.textWidth ?? ""}\\textwidth}{!}{%`,
            `\\subcaptionbox{${this.title.isAcronym ? `\\gls{${this.title.displayName}}` : this.title.displayName}}{`,
            `\\begin{tabular}{l${"c".repeat(1 + Table.colCount)}}`,
            "\\toprule",
            `& Step & \\multicolumn{${Table.colCount}}{c}{Scenario} \\\\`,
            `\\cmidrule{3-${3 + Table.colCount - 1}}`,
            "&& " +
                Object.values(Col)
                    .map(v => `\\acrshort{${v}}`)
                    .join(" & ") +
                " \\\\",
            "\\midrule",
        );

        // Ensure queries are numbered in order
        assert(areOrderedEqual(Object.keys(this.rows), Object.keys(this.rows).sort(), (a, b) => a === b));
        const rowGroups: string[][][] = [];
        for (const [queryIdx, sits] of Object.values(this.rows).entries()) {
            rowGroups.push(
                Array(this.rowHeaders.length)
                    .fill(undefined)
                    .map(_item => structuredClone([])),
            );
            const rowGroup = rowGroups.at(-1)!;

            rowGroup[0]!.push(`\\multirow{${this.rowHeaders.length}}{*}{\\(Q_${queryIdx + 1}\\)}`);
            rowGroup.slice(1).forEach(x => (x[0] = ""));

            for (const [colHeaderS, v] of Object.entries(sits) as Entries<typeof sits>) {
                const colIdx = Table.colHeaderSToIdx.get(colHeaderS)!;
                for (const [rowHeaderS, v5] of Object.entries(v!) as ObjectEntries<NonNullable<typeof v>>) {
                    const rowIdx = this.rowHeaderSToIdx.get(rowHeaderS)!;
                    if (rowHeaderS.includes("\\\\")) {
                        rowGroups.at(-1)![rowIdx]![1] =
                            "\\makecell{" + rowHeaderS + " (" + this.rowHeaderSToUnit.get(rowHeaderS)! + ")}";
                    } else {
                        rowGroups.at(-1)![rowIdx]![1] =
                            rowHeaderS + " (" + this.rowHeaderSToUnit.get(rowHeaderS)! + ")";
                    }
                    rowGroups.at(-1)![rowIdx]![colIdx] =
                        "\\(\\sfrac{" +
                        (v5.fQM?.toFixed(decimalPlaces) ?? "-") +
                        "}{" +
                        (v5.dQM?.toFixed(decimalPlaces) ?? "-") +
                        "}\\)";
                }
            }
        }
        const rows =
            rowGroups
                .map(rowGroup => {
                    const rowsGroupS = rowGroup.map(rowParts => rowParts.join(" & ")).join(" \\\\\n");
                    return rowsGroupS;
                })
                .join(" \\\\\n\\cmidrule(l{1em}){1-6}\n") + " \\\\";
        s.push(rows);

        s.push("\\bottomrule", "\\end{tabular}", "}}");

        return s.join("\n");
    }
}

export type Unit = "ms" | "bytes";
