// Aplica as migrações SQL da pasta /migrations que ainda não foram aplicadas.
// Corre no arranque do serviço (o plano gratuito do Render não tem "pre-deploy command").
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL não está definida.");
  process.exit(1);
}

const needsSsl = /render\.com|sslmode=require/.test(url);
const client = new pg.Client({
  connectionString: url,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");

async function main() {
  await client.connect();
  // Um único processo de cada vez aplica migrações.
  await client.query("SELECT pg_advisory_lock(727272)");
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         nome text PRIMARY KEY,
         aplicada_em timestamptz NOT NULL DEFAULT now()
       )`
    );
    const { rows } = await client.query("SELECT nome FROM schema_migrations");
    const aplicadas = new Set(rows.map((r) => r.nome));
    const ficheiros = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

    for (const f of ficheiros) {
      if (aplicadas.has(f)) continue;
      const sql = await readFile(path.join(dir, f), "utf8");
      console.log(`[migrate] a aplicar ${f}`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (nome) VALUES ($1)", [f]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
    console.log("[migrate] base de dados atualizada.");
  } finally {
    await client.query("SELECT pg_advisory_unlock(727272)");
    await client.end();
  }
}

main().catch((err) => {
  console.error("[migrate] erro:", err);
  process.exit(1);
});
