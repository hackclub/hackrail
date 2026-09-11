import Database from "better-sqlite3";
import fs from "fs";
import crypto from "crypto";

const db = new Database(process.env.DB_PATH ?? "/app/data/sqlite.db");

db.exec(`CREATE TABLE IF NOT EXISTS __drizzle_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hash TEXT NOT NULL,
  created_at NUMERIC
)`);

const alreadyBaselined = db
  .prepare(`SELECT count(*) as c FROM __drizzle_migrations`)
  .get().c;

if (alreadyBaselined === 0) {
  const journal = JSON.parse(
    fs.readFileSync("./drizzle/meta/_journal.json", "utf8"),
  );
  const insert = db.prepare(
    `INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)`,
  );
  for (const entry of journal.entries) {
    const sql = fs.readFileSync(`./drizzle/${entry.tag}.sql`, "utf8");
    const hash = crypto.createHash("sha256").update(sql).digest("hex");
    insert.run(hash, entry.when);
  }
  console.log(
    `Baselined ${journal.entries.length} migration(s) as already applied.`,
  );
} else {
  console.log("Already baselined, skipping.");
}
