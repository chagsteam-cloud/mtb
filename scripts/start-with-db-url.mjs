import { spawn } from "node:child_process";

function fromNamedUrlEnv() {
  return (
    process.env.DATABASE_URL ||
    process.env.DATABASE_PRIVATE_URL ||
    process.env.DATABASE_PUBLIC_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRESQL_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.PRISMA_DATABASE_URL
  );
}

function fromParts(prefix = "") {
  const host = process.env[`${prefix}HOST`];
  const port = process.env[`${prefix}PORT`] || "5432";
  const user = process.env[`${prefix}USER`];
  const password = process.env[`${prefix}PASSWORD`];
  const database = process.env[`${prefix}DATABASE`];

  if (!host || !user || !password || !database) return undefined;

  const u = encodeURIComponent(user);
  const p = encodeURIComponent(password);
  return `postgresql://${u}:${p}@${host}:${port}/${database}?schema=public`;
}

function resolveDatabaseUrl() {
  return fromNamedUrlEnv() || fromParts("PG") || fromParts("POSTGRES_");
}

const databaseUrl = resolveDatabaseUrl();
if (!databaseUrl) {
  const seen = Object.keys(process.env)
    .filter((k) => /DATABASE|POSTGRES|^PG/.test(k))
    .sort();
  console.error("DATABASE_URL is not configured for runtime.");
  console.error("Set DATABASE_URL or PG*/POSTGRES_* variables in Railway.");
  console.error(`Visible related vars: ${seen.join(", ") || "none"}`);
  process.exit(1);
}

const child = spawn("npm", ["run", "start:core"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: databaseUrl },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});

