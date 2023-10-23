import "https://deno.land/std@0.204.0/dotenv/load.ts";
import { LiveList, LiveVariableClient } from "../mod.ts";

const username = Deno.env.get("USERNAME")!;
const password = Deno.env.get("PASSWORD")!;
const client = new LiveVariableClient();

client.once("connect", async (variables) => {
  const v = variables.find((v): v is LiveList => v instanceof LiveList);
  if (!v) return;

  console.log(v);

  await v.appendValue("test").then(console.log);
  await v.insertValue(0, "entry").then(console.log);
  await v.replaceValue(0, "dutkyo").then(console.log);
  await v.deleteValue(1).then(console.log);
});

client.setCredentials(username, password)
  .connect("65350927e03937013c7cffdc");
