//import { QueryEngine } from '@comunica/query-sparql-solid';
//import { QueryEngine } from '@comunica/query-sparql-file';
import { QueryEngine } from '@comunica/query-sparql-link-traversal-solid';


const myEngine = new QueryEngine();

const bindingsStream = await myEngine.queryBindings(`
  SELECT ?s ?p ?o WHERE {
    ?s ?p ?o.
    #FILTER strStarts(str(?s), "http://localhost:3000/a/")
}`, {
  sources: [
    'http://localhost:3000'
],
lenient: true,
});

bindingsStream.on('data', (bindings) => {
    const s = bindings.get("s").value;
    //const s = "<http://localhost:3000/a/>"
    const p = bindings.get("p").value;
    const o = bindings.get("o").value;

    console.log(`${s} -- ${p} -- ${o}`);
});
bindingsStream.on('error', (error) => {
    console.error(error);
});
bindingsStream.on('end', () => {
    console.log("Bindingsstream ended")
});