#!/usr/bin/env node
// خادم التطوير: تشغيلٌ منفصلٌ عن الطرفيّة، وإيقافٌ رفيقٌ لا عنيف.
//
// لماذا هذا الملفّ موجود؟ لأنّ سقوط الخادم كان له سببان متشابكان:
//   ١) تشغيلُه كمهمّةٍ خلفيّة تابعةٍ لطرفيّةٍ أو لجلسةِ وكيل، فيُقتل بانتهائها.
//   ٢) والقتلُ العنيف (SIGKILL) أثناء كتابة ذاكرة Turbopack يفسدها، فيسقط
//      كلّ تشغيلٍ تالٍ بـ«Failed to restore task data (corrupted database)».
// فهنا: spawn منفصل (detached + unref) لا يموت بموت أبيه، وإيقافٌ يبدأ
// بـSIGINT ويمهل الخادم ليُغلق دفاتره قبل أن يتصاعد.
//
// الاستعمال: pnpm dev:start | dev:stop | dev:restart | dev:status | dev:logs
// وحارسُ الفساد الثالث في next.config.ts: turbopackFileSystemCacheForDev = false

import { spawn } from "node:child_process";
import { openSync, existsSync, readFileSync, writeFileSync, unlinkSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "apps", "web");
const LOG = path.join(WEB, "dev-server.log");
const PID_FILE = path.join(WEB, ".dev-server.pid");
const PORT = Number(process.env.PORT ?? 3000);
const URL = `http://localhost:${PORT}/`;
const IS_WIN = process.platform === "win32";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** مالكُ المنفذ: الحقيقةُ الوحيدة عن «هل الخادم حيّ؟» — ملفّ الـPID قد يكذب. */
function portOwner() {
  try {
    if (IS_WIN) {
      const out = execFileSync("netstat", ["-ano", "-p", "TCP"], { encoding: "utf8" });
      const line = out.split(/\r?\n/).find((l) => /LISTENING/.test(l) && new RegExp(`:${PORT}\\s`).test(l));
      const pid = line?.trim().split(/\s+/).pop();
      return pid ? Number(pid) : null;
    }
    const out = execFileSync("lsof", ["-nP", `-iTCP:${PORT}`, "-sTCP:LISTEN", "-t"], { encoding: "utf8" });
    const pid = out.trim().split(/\s+/)[0];
    return pid ? Number(pid) : null;
  } catch {
    return null; // lsof/netstat يخرج بـ1 حين لا مُنصِت
  }
}

function alive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function responds(timeoutMs = 3000) {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), timeoutMs);
    const res = await fetch(URL, { signal: c.signal, redirect: "manual" });
    clearTimeout(t);
    return res.status;
  } catch {
    return null;
  }
}

function tailLog(n = 12) {
  if (!existsSync(LOG)) return "(لا سجلّ بعد)";
  const lines = readFileSync(LOG, "utf8").trimEnd().split("\n");
  return lines.slice(-n).join("\n");
}

async function start() {
  const owner = portOwner();
  if (owner) {
    const status = await responds();
    console.log(`الخادم يعمل أصلًا · PID ${owner} · ${URL}${status ? ` · ردّ ${status}` : " · لا يجيب بعدُ"}`);
    if (!status) console.log("إن كان لا يجيب فأوقفه وأعِده: pnpm dev:restart");
    return 0;
  }

  const fd = openSync(LOG, "w"); // سجلٌّ جديدٌ لكلّ تشغيل: أوّلُ الذعر يُقرأ ولا يُدفن
  const child = spawn(
    process.execPath,
    [path.join(WEB, "node_modules", "next", "dist", "bin", "next"), "dev"],
    { cwd: WEB, detached: true, stdio: ["ignore", fd, fd], windowsHide: true, env: process.env },
  );
  child.unref(); // ينفصل عن هذه العمليّة: لا يموت بموتها
  writeFileSync(PID_FILE, String(child.pid));
  console.log(`أُقلع منفصلًا · PID ${child.pid} · السجلّ: ${path.relative(process.cwd(), LOG)}`);

  for (let i = 0; i < 60; i++) {
    await sleep(1000);
    const status = await responds();
    if (status) {
      console.log(`جاهز بعد ~${i + 1}ث · ${URL} · ردّ ${status}`);
      return 0;
    }
    if (!alive(child.pid) && !portOwner()) {
      console.error("سقط قبل أن يجيب. آخرُ السجلّ:\n" + tailLog(20));
      return 1;
    }
  }
  console.error("مضت ٦٠ث ولم يُجب. آخرُ السجلّ:\n" + tailLog(20));
  return 1;
}

/** إيقافٌ متدرّج: SIGINT ثمّ SIGTERM ثمّ SIGKILL — والإمهالُ هو المقصود، فبه تُغلق الذاكرة دفاترها. */
async function stop() {
  const pid = portOwner() ?? (existsSync(PID_FILE) ? Number(readFileSync(PID_FILE, "utf8")) : null);
  if (!alive(pid)) {
    if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
    console.log("لا خادم يعمل.");
    return 0;
  }

  for (const [signal, graceSec] of [["SIGINT", 15], ["SIGTERM", 8], ["SIGKILL", 3]]) {
    try {
      if (IS_WIN && signal === "SIGKILL") execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"]);
      else process.kill(pid, signal);
    } catch {
      break;
    }
    console.log(`أُرسل ${signal} إلى ${pid} · إمهالٌ ${graceSec}ث`);
    for (let i = 0; i < graceSec; i++) {
      await sleep(1000);
      if (!alive(pid)) break;
    }
    if (!alive(pid)) break;
    if (signal === "SIGKILL") {
      console.error(`عصى ${pid} حتّى SIGKILL.`);
      return 1;
    }
    console.log(`لم يستجب لـ${signal} · تصعيد`);
  }

  if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
  console.log("توقّف.");
  return 0;
}

async function status() {
  const pid = portOwner();
  if (!pid) {
    console.log(`لا مُنصِت على ${PORT}.`);
    console.log("آخرُ السجلّ:\n" + tailLog(8));
    return 1;
  }
  const code = await responds(10000);
  const since = existsSync(PID_FILE) ? statSync(PID_FILE).mtime.toLocaleTimeString("ar-SA") : "؟";
  console.log(`حيّ · PID ${pid} · منذ ${since} · ${URL} · ${code ? `ردّ ${code}` : "لا يجيب (متجمّد؟ جرّب dev:restart)"}`);
  return code ? 0 : 1;
}

const cmd = process.argv[2] ?? "start";
const run = {
  start,
  stop,
  status,
  restart: async () => ((await stop()), await start()),
  logs: async () => (console.log(tailLog(80)), 0),
}[cmd];

if (!run) {
  console.error("الأوامر: start | stop | restart | status | logs");
  process.exit(2);
}
process.exit(await run());
