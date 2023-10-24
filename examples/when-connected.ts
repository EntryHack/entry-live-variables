import "https://deno.land/std/dotenv/load.ts";
import { LiveVariableClient } from "https://deno.land/x/entry_live_variables/mod.ts";

const username = Deno.env.get("USERNAME")!;
const password = Deno.env.get("PASSWORD")!;
const client = await new LiveVariableClient().setCredentials(username, password)
  .connect("65350927e03937013c7cffdc");

await client.whenConnected();

console.log(client.variables, client.lists);
