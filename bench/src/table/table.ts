import { table } from "table";

import { objectFromEntries } from "../utils.js";

// Number of numbers after decimal point
const CAD = 2;

export class Table<ColLegend extends { name: string; unit: Unit }[]> {
    rows: { [K in Row]: { [K in ColLegend[number]["name"]]: { fQM: number | null; dQM: number | null } } };

    private readonly colNameToIdx;

    constructor(private readonly colLegend: ColLegend) {
        this.colNameToIdx = new Map(colLegend.map((x, i) => [x.name, i]));

        const y = objectFromEntries(colLegend.map(x => [x.name, { fQM: null, dQM: null }])) as unknown as {
            [K in ColLegend[number]["name"]]: { fQM: number | null; dQM: number | null };
        };

        this.rows = objectFromEntries(Object.values(Row).map(rowS => [rowS, structuredClone(y)]));
    }

    print(outputAsLatex: boolean): void {
        //type K = Entries<{[K in ColLegend[number]["name"]]: {[K in RowLegend[number]]?: {fQM: number, dQM: number}}}>

        const r = [["", ...this.colLegend.map(x => x.name + ` (${x.unit})`)]];
        for (const [situation, colValues] of Object.entries(this.rows)) {
            const values = [];
            for (const [k2, v2_] of Object.entries(colValues)) {
                const v2 = v2_ as { fQM: number | null; dQM: number | null };
                values[this.colNameToIdx.get(k2)!] =
                    (v2.fQM?.toFixed(CAD) ?? "-") + " / " + (v2.dQM?.toFixed(CAD) ?? "-");
            }

            r.push([situation, ...values]);
        }

        console.log(table(r));
        console.log("HERE?");
        // //console.log(`Time taken \\ Benchmark name \t\t\t${benchName}`)
        // console.log(`\t\t\t\t\t\tfq (ms)|mfq (ms)|onlyOne (ms)|changeOne (ms)`)
        // console.log("Sizeof Materialized query answers\t\t", rows.mViewsSize.join(" | "))
        // console.log("Sizeof Materialized query trees\t\t\t", rows.mQueriesSize.join(" | "))
        // console.log(`Total\t\t\t\t\t\t`, rows.total.join(" | "))
        // //console.log(`Translate to query tree\t\t\t\t`, rows.translateToTree.join(" | "))
        // console.log(`Check if an e materialized view can be used\t`, rows.checkExistingMv.join(" | "))
        //console.log("Materialize query\t\t\t\t", rows.materializeQ.join(" | "))
    }
}

export enum Row {
    FQ = "Full Query",
    MFQ = "Materialized Full Query",
    ONLY_ONE = "Only one",
    CHANGE_ONE = "Change one",
}

type Unit = "ms" | "bytes";
