import pg from "pg";

const url =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/semcache";
const local = /@(localhost|127\.0\.0\.1|db)[:/]/.test(url);

export const db = new pg.Pool({
  connectionString: url,
  max: 5,
  ssl: local ? undefined : { rejectUnauthorized: false },
});
