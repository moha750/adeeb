import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("/Users/m7_almattar/adeeb/v2/apps/web/.env.local","utf8")
  .split("\n").filter(l=>l.includes("=")&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(), l.slice(i+1).trim()];}));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data } = await sb.from("radio_episodes").select("number,title,transcript,summary").order("number");
fs.writeFileSync("/tmp/eps.json", JSON.stringify(data));
console.log("حلقات:", data.length);
