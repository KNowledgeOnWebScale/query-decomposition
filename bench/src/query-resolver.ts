import type { Bindings } from "@rdfjs/types";

export abstract class QueryResolver {
    async answerQuery(queryS: string): Promise<Bindings[]> {
        const timings: {msg: string, value: number, isSummary: boolean}[] = []
        
        const timeStop = (start: number, msg: string) => {
            timings.push({msg: `Time taken to ${msg}`, value: performance.now() - start, isSummary: false})
            //console.log(`Time taken to ${msg}: ${timings.at(-1)} ms`)
        }

        const ret = await this._answerQuery(timings, timeStop, queryS);

        const total = timings.filter(x => !x.isSummary).map(x => x.value).reduce((acc, e) => acc + e, 0)
        console.log(`Total time taken to materialize and compute answer to query: ${total.toFixed(3)} ms`);
        console.group()
        for (const t of timings) {
            console.log(`${t.msg}: ${(t.value / total * 100).toFixed(3)} % / ${t.value.toFixed(3)} ms`)
        }
        console.groupEnd()

        return ret;
    }
    abstract _answerQuery(timings: {msg: string, value: number, isSummary: boolean}[], timeStop: (start: number, msg: string) => void, queryS: string): Promise<Bindings[]>;
    abstract roughSizeOfMaterializedViews(): { queries: number, answers: number }
}