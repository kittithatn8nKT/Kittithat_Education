// One-shot migration runner. Reads supabase/migrations/*.sql in order and
// applies them to the target database via a direct Postgres connection.
//
// Usage:
//   PGURL='postgresql://...' node scripts/apply-migrations.mjs
//
// The script is idempotent — each migration uses "if not exists"/"or replace"
// so re-running is safe.

import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "supabase", "migrations");

const url = process.env.PGURL;
if (!url) {
  console.error("PGURL env var required");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("Connected to", url.replace(/:[^:@]+@/, ":***@"));

const files = (await readdir(migrationsDir))
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  const sql = await readFile(join(migrationsDir, file), "utf8");
  process.stdout.write(`Applying ${file} ... `);
  try {
    await client.query(sql);
    console.log("✓");
  } catch (err) {
    console.log("✗");
    console.error(err.message);
    process.exit(1);
  }
}

console.log("\nAll migrations applied.");

// Verify
const { rows: tables } = await client.query(`
  select tablename, rowsecurity
  from pg_tables
  where schemaname = 'public'
  order by tablename
`);
console.log("\nPublic tables:");
for (const t of tables) {
  console.log(`  ${t.tablename.padEnd(28)} RLS=${t.rowsecurity}`);
}

await client.end();
