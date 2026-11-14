import pg from "pg";
import { config } from "./config";

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 });

// Migrations run in order at startup; each runs once and is recorded in schema_migrations.
const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: "001_init",
    sql: `
      create table devices (
        id uuid primary key,
        created_at timestamptz not null default now(),
        banned_until timestamptz
      );

      create table chats (
        id uuid primary key,
        device_a uuid not null references devices(id) on delete cascade,
        device_b uuid not null references devices(id) on delete cascade,
        started_at timestamptz not null default now(),
        ended_at timestamptz,
        end_reason text,
        extensions int not null default 0
      );
      create index chats_started_at on chats(started_at);

      create table messages (
        id uuid primary key,
        chat_id uuid not null references chats(id) on delete cascade,
        sender uuid not null references devices(id) on delete cascade,
        body text not null,
        created_at timestamptz not null default now()
      );
      create index messages_created_at on messages(created_at);
      create index messages_chat on messages(chat_id);

      create table reports (
        id bigserial primary key,
        chat_id uuid not null references chats(id) on delete cascade,
        reporter uuid not null references devices(id) on delete cascade,
        reported uuid not null references devices(id) on delete cascade,
        reason text not null,
        created_at timestamptz not null default now(),
        unique (chat_id, reporter)
      );
      create index reports_reported on reports(reported, created_at);
      create index reports_pair on reports(reporter, reported);
    `,
  },
];

export async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("create table if not exists schema_migrations (id text primary key, applied_at timestamptz not null default now())");
    const { rows } = await client.query<{ id: string }>("select id from schema_migrations");
    const done = new Set(rows.map((r) => r.id));
    for (const m of MIGRATIONS) {
      if (done.has(m.id)) continue;
      await client.query("begin");
      try {
        await client.query(m.sql);
        await client.query("insert into schema_migrations(id) values ($1)", [m.id]);
        await client.query("commit");
        console.log(`[db] migration ${m.id} uygulandı`);
      } catch (e) {
        await client.query("rollback");
        throw e;
      }
    }
  } finally {
    client.release();
  }
}

/** Deletes message text past the retention window and old chat records. */
export async function cleanup(): Promise<void> {
  const m = await pool.query("delete from messages where created_at < now() - make_interval(hours => $1)", [config.messageRetentionHours]);
  const c = await pool.query("delete from chats where started_at < now() - make_interval(days => $1)", [config.recordRetentionDays]);
  if (m.rowCount || c.rowCount) console.log(`[db] temizlik: ${m.rowCount} mesaj, ${c.rowCount} sohbet kaydı silindi`);
}
