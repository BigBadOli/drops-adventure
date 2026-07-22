import { DurableObject } from "cloudflare:workers";
export class App extends DurableObject {}
export default { fetch() { return new Response("static app", { status: 404 }); } };
