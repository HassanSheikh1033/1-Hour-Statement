import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (run with: node --env-file=.env.local scripts/migrate.mjs)");
  process.exit(1);
}
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query(readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8"));
const { rows } = await client.query("select tablename, rowsecurity from pg_tables where schemaname='public' and tablename in ('posts','settings')");
console.log(rows);
await client.end();
