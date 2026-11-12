// Browser-test server: the built store (`npm run build` first) on :3457 against
// the throwaway <db>_e2e database, with a fake mail server. Emails never leave
// the machine: they are kept in memory and listed at http://127.0.0.1:2526/messages.
import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import { createRequire } from "node:module";

if (existsSync(".env")) process.loadEnvFile(".env");
const require = createRequire(import.meta.url);
const { MongoClient } = require("mongodb");

const base = process.env.MONGODB_E2E_URI || process.env.MONGODB_URI;
const m = base?.match(/^(mongodb(?:\+srv)?:\/\/[^/]+)\/([^?]*)(\?.*)?$/);
if (!m) throw new Error("Set MONGODB_URI (in .env) or MONGODB_E2E_URI.");
const name = m[2] || "footwear";
const uri = `${m[1]}/${name.endsWith("_e2e") ? name : name + "_e2e"}${m[3] ?? ""}`;

// Start every run from an empty test database.
const client = new MongoClient(uri);
await client.connect();
const db = client.db();
if (!db.databaseName.endsWith("_e2e")) throw new Error("refusing: not an _e2e database");
await db.dropDatabase();
await client.close();

/* ---------- Fake SMTP server (accepts everything) ---------- */
const inbox = [];
function decode(raw) {
  const body = raw.replace(/\r\n\.\./g, "\r\n."); // undo SMTP dot-stuffing
  const parts = body.split(/\r\n\r\n/);
  let text = parts.slice(1).join("\n\n");
  text = text.replace(/Content-Transfer-Encoding: base64\r?\n(?:[^\r\n]+\r?\n)*\r?\n([A-Za-z0-9+/=\r\n]+)/g, (_, b) => Buffer.from(b.replace(/\s/g, ""), "base64").toString("utf8"));
  text = text.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const to = raw.match(/^To: (.*)$/m)?.[1]?.match(/[^\s<>]+@[^\s<>]+/)?.[0]?.toLowerCase() ?? "";
  const subject = raw.match(/^Subject: (.*)$/m)?.[1] ?? "";
  const code = text.match(/(?:^|\n)(\d{6})\r?\n/)?.[1] ?? null;
  const links = [...text.matchAll(/https?:\/\/[^\s"<>]+/g)].map((x) => x[0]);
  return { to, subject, code, links, at: Date.now() };
}
net
  .createServer((sock) => {
    let data = false, buf = "", authStep = 0;
    const say = (l) => sock.write(l + "\r\n");
    say("220 test-sink ready");
    sock.on("data", (chunk) => {
      buf += chunk.toString("latin1");
      let i;
      while (data ? (i = buf.indexOf("\r\n.\r\n")) >= 0 : (i = buf.indexOf("\r\n")) >= 0) {
        if (data) { inbox.push(decode(buf.slice(0, i))); buf = buf.slice(i + 5); data = false; say("250 queued"); continue; }
        const line = buf.slice(0, i); buf = buf.slice(i + 2);
        const cmd = line.toUpperCase();
        if (authStep === 1) { authStep = 2; say("334 UGFzc3dvcmQ6"); continue; }
        if (authStep === 2) { authStep = 0; say("235 ok"); continue; }
        if (cmd.startsWith("EHLO")) { say("250-test-sink"); say("250 AUTH PLAIN LOGIN"); }
        else if (cmd.startsWith("AUTH PLAIN")) say("235 ok");
        else if (cmd.startsWith("AUTH LOGIN")) { authStep = 1; say("334 VXNlcm5hbWU6"); }
        else if (cmd.startsWith("DATA")) { data = true; say("354 go"); }
        else if (cmd.startsWith("QUIT")) { say("221 bye"); sock.end(); }
        else say("250 ok");
      }
    });
  })
  .listen(2525, "127.0.0.1");
http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const to = url.searchParams.get("to")?.toLowerCase();
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(to ? inbox.filter((x) => x.to === to) : inbox));
  })
  .listen(2526, "127.0.0.1");

/* ---------- The store ---------- */
const clean = () => rmSync(".next/server/route-cache", { recursive: true, force: true });
clean();
const child = spawn("node_modules/.bin/next", ["start", "-p", "3457"], {
  stdio: "inherit",
  env: {
    ...process.env,
    MONGODB_URI: uri,
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: "2525",
    SMTP_USER: "test",
    SMTP_PASS: "test",
    MAIL_FROM: "Ŕose Atelier <shop@example.com>",
    SITE_URL: "http://localhost:3457",
    ADMIN_SECRET: "e2e-admin-door-secret",
    CRON_SECRET: "",
  },
});
const stop = () => { child.kill("SIGTERM"); clean(); process.exit(0); };
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
child.on("exit", (code) => { clean(); process.exit(code ?? 0); });
