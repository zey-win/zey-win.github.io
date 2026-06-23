const apiBase = document.querySelector('meta[name="builder-api"]')?.content?.replace(/\/$/, "") || "https://zeywin-android-builder-api.vercel.app";
const operatorKey = document.querySelector('meta[name="builder-key"]')?.content?.trim() || "";
const op = (extra = {}) => ({ "Content-Type": "application/json", "x-builder-key": operatorKey, ...extra });
const $ = id => document.getElementById(id);
function ensureContainer(id) { return $(id) || (() => { const d = document.createElement("div"); d.id = id; d.style.cssText = "padding:0 16px 16px"; document.querySelector("header").after(d); return d; })(); }
const buildsContainer = ensureContainer("builds-container");
const activeContainer = ensureContainer("active-container");
const modal = $("modal");
const form = $("build-form");
const newBuildBtn = $("new-build");
const cancelBtn = $("modal-cancel");
const repoSelect = $("repo-select");
const branchSelect = $("branch-select");
const gameIcon = $("game-icon");
const iconSpinner = $("icon-spinner");
const iconFile = $("icon-file");
const firebaseFile = $("firebase-file");
const loading = $("loading");
const zBtn = $("z-btn");

const REPO_DEFAULTS = {};
function getDef(repo) { return REPO_DEFAULTS[repo] || {}; }
REPO_DEFAULTS["zey-win/plinko"] = { app_name: "Plinko Real Money", package_name: "com.socialapps.plinko", admob_android_app_id: "ca-app-pub-1585565865476548~5854522209", admob_android_banner_id: "ca-app-pub-1585565865476548/2893595529", admob_android_interstitial_id: "ca-app-pub-1585565865476548/2521834122", admob_android_rewarded_id: "ca-app-pub-1585565865476548/7091315351", zeywin_api_key: "zw_7b07dc24806408f6e655dcf0422e15c5e028d40d440b3e1a", firebase_url: "https://raw.githubusercontent.com/zey-win/plinko/main/Assets/Plugins/Android/google-services.json" };
REPO_DEFAULTS["zey-win/blackjack"] = { app_name: "Blackjack", package_name: "com.playmaxsolutions.blackjack" };
REPO_DEFAULTS["zey-win/roulette"] = { app_name: "Roulette", package_name: "com.playmaxsolutions.roulette" };
REPO_DEFAULTS["zey-win/dragon-tiger"] = { app_name: "Dragon Tiger", package_name: "com.playmaxsolutions.dragontiger" };
REPO_DEFAULTS["zey-win/baccarat-tiger"] = { app_name: "Baccarat", package_name: "com.playmaxsolutions.baccarattiger" };
REPO_DEFAULTS["zey-win/wheel-of-fortune"] = { app_name: "Wheel of Fortune", package_name: "com.playmaxsolutions.wheeloffortune" };
REPO_DEFAULTS["zey-win/Unstopable"] = { app_name: "Unstopable: Real Money", package_name: "com.playmaxsolutions.unstopable" };
REPO_DEFAULTS["zey-win/SlotSpot"] = { app_name: "SlotSpot", package_name: "com.playmaxsolutions.slotspot" };

const BRANCHES = { "zey-win/plinko": [{ ref: "main", label: "Plinko Falling" }, { ref: "app/plinko", label: "Plinko" }, { ref: "app/plinko-real-game", label: "Plinko Real Game" }, { ref: "app/plinko-real-money", label: "Plinko Real Money" }] };
const DEFAULT_BRANCHES = [{ ref: "main", label: "main" }];
const REPO_NAMES = { "zey-win/plinko": "plinko", "zey-win/blackjack": "blackjack", "zey-win/roulette": "roulette", "zey-win/dragon-tiger": "dragon tiger", "zey-win/baccarat-tiger": "baccarat", "zey-win/wheel-of-fortune": "lucky wheel", "zey-win/Unstopable": "unstopable", "zey-win/SlotSpot": "slotspot" };
const REPO_ICONS = {
  "zey-win/plinko": "https://raw.githubusercontent.com/zey-win/zey-win.github.io/main/repo-icons/plinko.png",
  "zey-win/plinko@app/plinko-real-money": "https://raw.githubusercontent.com/zey-win/zey-win.github.io/main/repo-icons/zey-win__plinkorm.png",
  "zey-win/plinko@app/plinko": "https://raw.githubusercontent.com/zey-win/zey-win.github.io/main/repo-icons/plinko.png",
  "zey-win/plinko@main": "https://raw.githubusercontent.com/zey-win/zey-win.github.io/main/repo-icons/zey-win__plinkofaling.png",
  "zey-win/blackjack": "https://raw.githubusercontent.com/zey-win/zey-win.github.io/main/repo-icons/zey-win__blackjack.png",
  "zey-win/roulette": "https://raw.githubusercontent.com/zey-win/zey-win.github.io/main/repo-icons/zey-win__roulette.png",
  "zey-win/dragon-tiger": "https://raw.githubusercontent.com/zey-win/zey-win.github.io/main/repo-icons/plinko.png",
  "zey-win/baccarat-tiger": "https://raw.githubusercontent.com/zey-win/zey-win.github.io/main/repo-icons/zey-win__baccarat-tiger.png",
  "zey-win/wheel-of-fortune": "https://raw.githubusercontent.com/zey-win/zey-win.github.io/main/repo-icons/zey-win__wheel-of-fortune.png",
  "zey-win/Unstopable": "https://raw.githubusercontent.com/zey-win/zey-win.github.io/main/repo-icons/zey-win__Unstopable.png",
  "zey-win/SlotSpot": "https://raw.githubusercontent.com/zey-win/zey-win.github.io/main/repo-icons/zey-win__SlotSpot.png"
};

let runMeta = {}, releases = [], firebaseJson = null, currentIconDataUrl = null, iconLoadedDeferred = null;
let runs = [];

function repoFromTitle(t) { const s = (t || "").toLowerCase().replace(/[^a-z0-9 ]/g, " "); for (const [repo, name] of Object.entries(REPO_NAMES)) if (s.includes(name)) return repo; return null; }
function parseTitle(title) { if (!title) return { app: "Build", pkg: "" }; const parts = title.replace(/^Android:\s*/i, "").split(" / ").map(p => p.trim()); return { app: parts[0] || "Build", pkg: parts[1] || "" }; }
function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

function showIconSpinner() { gameIcon.style.display = "none"; iconSpinner.style.display = "block"; }
function hideIconSpinner() { iconSpinner.style.display = "none"; }
function setIcon(src) { if (src) { gameIcon.src = src; gameIcon.style.display = "block"; } else gameIcon.style.display = "none"; hideIconSpinner(); }

async function getIconDataUrl(repo, ref) {
  const refStr = ref || "main"; showIconSpinner();
  try {
    const res = await fetch(`${apiBase}/api/icon?game_repository=${encodeURIComponent(repo)}&game_ref=${encodeURIComponent(refStr)}`, { headers: op() });
    if (!res.ok) { setIcon(null); return null; }
    const d = await res.json();
    if (d.ok && d.icon?.dataUrl) { setIcon(d.icon.dataUrl); return d.icon.dataUrl; }
    setIcon(null); return null;
  } catch { setIcon(null); return null; }
}

let audioCtx = null;
function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
function playFanfare() { try { const ctx = getAudioCtx(); [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.15); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.6); o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + i * 0.15); o.stop(ctx.currentTime + i * 0.15 + 0.6); }); } catch {} }
function playErrorSound() { try { const ctx = getAudioCtx(); const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "sawtooth"; o.frequency.value = 150; g.gain.setValueAtTime(0.1, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5); o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.5); } catch {} }

function fireConfetti(dur = 4000) {
  const canvas = document.createElement("canvas"); canvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:999"; canvas.width = innerWidth; canvas.height = innerHeight; document.body.appendChild(canvas); const ctx = canvas.getContext("2d");
  const p = []; const colors = ["#ffd700","#ff6347","#00ff7f","#ff69b4","#87ceeb","#ffa500"];
  for (let i = 0; i < 80; i++) p.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height * -1, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3 + 1, w: Math.random() * 8 + 4, h: Math.random() * 4 + 2, color: colors[Math.floor(Math.random() * colors.length)], alpha: 1, rot: Math.random() * 360 });
  const start = Date.now();
  function anim() { const elapsed = Date.now() - start; if (elapsed > dur) { canvas.remove(); return; } ctx.clearRect(0, 0, canvas.width, canvas.height); for (const pt of p) { pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.02; pt.rot += 2; pt.alpha = Math.max(0, 1 - elapsed / dur); ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.rot * Math.PI / 180); ctx.globalAlpha = pt.alpha; ctx.fillStyle = pt.color; ctx.fillRect(-pt.w / 2, -pt.h / 2, pt.w, pt.h); ctx.restore(); } requestAnimationFrame(anim); }
  anim();
}

async function loadReleases() {
  try { const res = await fetch("https://api.github.com/repos/zey-win/ci-cd/releases?per_page=50"); if (!res.ok) return; const data = await res.json(); releases.length = 0; for (const r of (data || [])) { const tag = r.tag_name || ""; const assets = (r.assets || []).map(a => ({ name: a.name, url: a.browser_download_url })); releases.push({ tag, name: r.name, assets }); } } catch {}
}
function findDownloads(pkg) {
  if (!pkg) return { apk: null, aab: null };
  const parts = pkg.toLowerCase().split(".").filter(Boolean);
  const lastPart = parts[parts.length - 1];
  if (!lastPart || lastPart.includes("*")) return { apk: null, aab: null };
  for (const rel of releases) {
    const searchIn = (rel.name || rel.tag || "").toLowerCase();
    if (!searchIn.includes(lastPart)) continue;
    const apk = rel.assets.find(a => a.name.endsWith(".apk") && a.name.toLowerCase().includes(lastPart));
    const aab = rel.assets.find(a => a.name.endsWith(".aab") && a.name.toLowerCase().includes(lastPart));
    if (apk || aab) return { apk: apk?.url || null, aab: aab?.url || null };
  }
  return { apk: null, aab: null };
}

function resolveIcon(r) {
  const meta = runMeta[r.id];
  if (meta?.icon) return meta.icon;
  const raw = r.displayTitle || r.name || "";
  const { app } = parseTitle(raw);
  const repo = repoFromTitle(raw);
  const appLower = (app || "").toLowerCase();
  let iconUrl = REPO_ICONS[repo] || null;
  if (repo === "zey-win/plinko") {
    if (appLower.includes("real money")) iconUrl = REPO_ICONS["zey-win/plinko@app/plinko-real-money"] || iconUrl;
    else if (appLower.includes("real game")) iconUrl = REPO_ICONS["zey-win/plinko@app/plinko"] || iconUrl;
    else if (appLower.includes("plinko") && !appLower.includes("falling")) iconUrl = REPO_ICONS["zey-win/plinko@app/plinko"] || iconUrl;
    else iconUrl = REPO_ICONS["zey-win/plinko@main"] || iconUrl;
  }
  return iconUrl;
}

function buildCardHTML(r, idx) {
  const raw = r.displayTitle || r.name || "";
  const { app, pkg } = parseTitle(raw);
  const concl = r.conclusion || "";
  const st = r.status || "unknown";
  const url = r.htmlUrl || "#";
  const meta = runMeta[r.id];
  const iconUrl = resolveIcon(r);
  const verStr = (meta?.ver) || String(r.runNumber || "");
  const codeStr = (meta?.code) || String(r.runAttempt || "1");
  const versionInfo = verStr ? `<span class="version-line">v${esc(verStr)} (code ${codeStr})</span>` : "";
  const downloads = concl === "success" ? findDownloads(pkg) : { apk: null, aab: null };
  let label, cls;
  if (concl === "success") { label = "✅ Готов"; cls = "status-success"; }
  else if (concl === "failure") { label = "❌ Ошибка"; cls = "status-failure"; }
  else if (["waiting","queued","pending"].includes(st)) { label = "⏳ В очереди"; cls = "status-pending"; }
  else if (st === "completed") { label = "❌ Ошибка"; cls = "status-failure"; }
  else { label = "🔄 " + st; cls = "status-pending"; }
  const isProgress = ["in_progress","pending","queued","waiting"].includes(st);
  const bgStyle = idx % 2 === 0 ? 'background:#1a202c' : 'background:#161b22';
  const iconBlock = iconUrl ? `<img class="card-icon" src="${iconUrl}" alt="" loading="lazy" onerror="this.onerror=null;this.alt='🎮'">` : `<div class="card-icon card-icon-placeholder">🎮</div>`;
  const timerId = `t-${r.id}`;
  const timerHtml = `<span class="timer" id="${timerId}" data-run="${r.id}" style="display:${st!=='completed'&&timers[r.id]?'inline':'none'};color:#ffd700">⏱ 00:00,00</span>`;
  return `<div class="build-card${isProgress?' in-progress':''}" style="${bgStyle}" data-id="${r.id}">${iconBlock}<div class="info"><div class="app-name">${esc(app)}</div><div class="meta">${esc(pkg)}${timerHtml}</div><div class="meta">${versionInfo}</div></div><div class="right-col"><div class="actions-col">${concl==="success"&&downloads.apk?`<a class="dl-btn" href="${downloads.apk}" download>APK</a>`:""}${concl==="success"&&downloads.aab?`<a class="dl-btn" href="${downloads.aab}" download>AAB</a>`:""}${concl!=="success"?`<a href="${esc(url)}" target="_blank" class="log-btn">Логи</a>`:""}</div><div class="actions-col"><span class="status ${cls} status-small">${label}</span><button class="del-btn" onclick="deleteRun(${r.id},event)" title="Удалить">✕</button></div></div></div>`;
}

function updateTimers() {
  const now = Date.now();
  for (const [id, t] of Object.entries(timers)) {
    const el = document.getElementById(`t-${id}`);
    if (!el) continue;
    const left = Math.max(0, t.total - (now - t.start));
    if (left <= 0) { el.style.display = "none"; delete timers[id]; continue; }
    const m = Math.floor(left / 60000);
    const s = Math.floor((left % 60000) / 1000);
    const cs = Math.floor((left % 1000) / 10);
    el.textContent = `⏱ ${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")},${String(cs).padStart(2,"0")}`;
  }
}

const timers = {};
function startTimerLoop() {
  let running = true;
  function tick() { if (!running) return; updateTimers(); requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
  return () => { running = false; };
}

function renderAll() {
  const active = runs.filter(r => r.status !== "completed");
  const done = runs.filter(r => r.status === "completed" && r.conclusion === "success");
  const fail = runs.filter(r => r.status === "completed" && r.conclusion !== "success");
  const allDone = [...done, ...fail].slice(0, 30);

  const activeHtml = active.length ? active.map((r, i) => buildCardHTML(r, i)).join("") : "";
  const doneHtml = allDone.length ? allDone.map((r, i) => buildCardHTML(r, i + active.length)).join("") : "";

  if (activeContainer.innerHTML !== activeHtml) activeContainer.innerHTML = activeHtml;
  if (buildsContainer.innerHTML !== doneHtml) buildsContainer.innerHTML = doneHtml;
  activeContainer.style.display = activeHtml ? "" : "none";
  buildsContainer.style.display = doneHtml ? "" : "none";

  let statsEl = document.getElementById("stats");
  if (!statsEl) {
    statsEl = document.createElement("div");
    statsEl.id = "stats";
    statsEl.style.cssText = "text-align:center;color:#8b949e;font-size:13px;padding:8px 0";
    buildsContainer.appendChild(statsEl);
  }
  statsEl.textContent = `Всего: ${runs.length} | Активные: ${active.length} | Успешно: ${done.length} | Ошибок: ${fail.length}`;
}

async function loadBuilds() {
  if (loading) loading.style.display = "inline-flex";
  try {
    const [runsRes] = await Promise.all([fetch(`${apiBase}/api/runs`), loadReleases()]);
    if (!runsRes.ok) { return; }
    const d = await runsRes.json();
    const oldRuns = runs;
    runs = Array.isArray(d.runs) ? d.runs : [];
    for (const r of runs) {
      let icon = r.iconUrl;
      if (!icon) {
        const title = `${r.displayTitle || ""} ${r.name || ""}`;
        const m = title.match(/builder-([a-z0-9]+)/);
        if (m) icon = `https://raw.githubusercontent.com/zey-win/ci-cd/main/builds/icons/${m[0]}.png`;
      }
      if (icon && !runMeta[r.id]) runMeta[r.id] = { icon };
    }
    for (const r of runs) {
      if (r.status !== "completed" && !timers[r.id]) {
        const created = r.createdAt ? new Date(r.createdAt).getTime() : Date.now();
        timers[r.id] = { start: created, total: (39 + (r.id % 12)) * 60 * 1000 };
      }
    }
    for (const r of runs) {
      const old = oldRuns.find(o => o.id === r.id);
      if (old && old.status !== "completed" && r.status === "completed") {
        if (r.conclusion === "success") { playFanfare(); fireConfetti(4000); }
        else playErrorSound();
      }
    }
    renderAll();
    if (loading) loading.style.display = "none";
  } catch { if (loading) loading.style.display = "none"; }
}

async function deleteRun(runId, e) {
  if (!confirm("Удалить эту сборку?")) return;
  const btn = e?.target; if (btn) btn.disabled = true;
  try {
    await fetch(`${apiBase}/api/delete`, { method: "POST", headers: op(), body: JSON.stringify({ run_id: runId }) });
    runs = runs.filter(r => r.id !== runId);
    delete runMeta[runId];
    delete timers[runId];
    renderAll();
  } catch (err) { alert("Ошибка удаления: " + err.message); }
  finally { if (btn) btn.disabled = false; }
}

function updateBranches() {
  const repo = repoSelect.value;
  const list = BRANCHES[repo] || DEFAULT_BRANCHES;
  branchSelect.innerHTML = list.map(b => `<option value="${b.ref}">${b.label}</option>`).join("");
  getIconDataUrl(repo, branchSelect.value);
}

zBtn.addEventListener("click", async () => {
  const repo = repoSelect.value; const def = getDef(repo);
  const fbStatus = document.getElementById("firebase-status");
  const fbBtn = document.getElementById("firebase-btn");
  document.querySelector('[name="app_name"]').value = def.app_name || "";
  document.querySelector('[name="package_name"]').value = def.package_name || "";
  document.querySelector('[name="zeywin_api_key"]').value = def.zeywin_api_key || "";
  document.querySelector('[name="admob_app_id"]').value = def.admob_android_app_id || "";
  document.querySelector('[name="admob_banner"]').value = def.admob_android_banner_id || "";
  document.querySelector('[name="admob_interstitial"]').value = def.admob_android_interstitial_id || "";
  document.querySelector('[name="admob_rewarded"]').value = def.admob_android_rewarded_id || "";
  const pkg = document.querySelector('[name="package_name"]').value || def.package_name || "";
  if (fbStatus) { fbStatus.textContent = "⏳ firebase..."; fbStatus.style.display = "inline"; }
  try {
    const fbUrl = `/firebase-cfg/${encodeURIComponent(pkg)}.json`;
    let res = await fetch(fbUrl);
    if (!res.ok && def.firebase_url) res = await fetch(def.firebase_url);
    if (res.ok) {
      const text = await res.text();
      firebaseJson = `data:application/json;base64,${btoa(text)}`;
      if (fbStatus) fbStatus.textContent = "✅ firebase загружен";
      if (fbBtn) fbBtn.textContent = "📁 Заменить файл";
    } else {
      if (fbStatus) { fbStatus.textContent = "❌ firebase не найден"; fbStatus.style.color = "#f85149"; }
    }
  } catch {
    if (fbStatus) { fbStatus.textContent = "❌ ошибка"; fbStatus.style.color = "#f85149"; }
  }
});

iconFile.addEventListener("change", e => {
  const f = e.target.files[0]; if (!f) return;
  if (f.type !== "image/png") { alert("Только PNG"); return; }
  const r = new FileReader();
  r.onload = () => { currentIconDataUrl = r.result; gameIcon.src = r.result; gameIcon.style.display = "block"; };
  r.readAsDataURL(f);
});
firebaseFile.addEventListener("change", e => {
  const f = e.target.files[0]; if (!f) return;
  if (f.type !== "application/json") { alert("Только JSON"); return; }
  const r = new FileReader();
  r.onload = () => { firebaseJson = r.result; };
  r.readAsDataURL(f);
});

repoSelect.addEventListener("change", () => { updateBranches(); });
branchSelect.addEventListener("change", () => {
  getIconDataUrl(repoSelect.value, branchSelect.value).then(url => { if (url) currentIconDataUrl = url; });
});

newBuildBtn.addEventListener("click", () => {
  currentIconDataUrl = null; firebaseJson = null;
  modal.classList.remove("hidden");
  updateBranches();
  iconLoadedDeferred = getIconDataUrl(repoSelect.value, branchSelect.value).then(url => { if (url) currentIconDataUrl = url; });
});
cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });

form.addEventListener("submit", async e => {
  e.preventDefault();
  const fd = new FormData(form);
  if (!currentIconDataUrl && iconLoadedDeferred) {
    try { const url = await iconLoadedDeferred; if (url) currentIconDataUrl = url; } catch {}
  }
  const iconData = currentIconDataUrl || "";
  const p = {
    game_repository: fd.get("game_repository") || "zey-win/plinko",
    game_ref: fd.get("game_ref") || "main",
    app_name: fd.get("app_name") || "",
    package_name: fd.get("package_name") || "",
    build_format: fd.get("build_format") || "apk",
    version_name: fd.get("version_name") || "",
    version_code: fd.get("version_code") || "",
    zeywin_api_key: fd.get("zeywin_api_key") || "",
    admob_android_app_id: fd.get("admob_app_id") || "",
    admob_android_banner_id: fd.get("admob_banner") || "",
    admob_android_interstitial_id: fd.get("admob_interstitial") || "",
    admob_android_rewarded_id: fd.get("admob_rewarded") || "",
    iconDataUrl: iconData,
    firebaseJsonBase64: firebaseJson || ""
  };
  modal.classList.add("hidden");
  try {
    const res = await fetch(`${apiBase}/api/build`, { method: "POST", headers: op(), body: JSON.stringify(p) });
    if (!res.ok) { alert("Ошибка: " + await res.text().catch(() => "")); return; }
    const d = await res.json();
    if (d.run) {
      const serverIconPath = d.icon?.path;
      const serverIconUrl = serverIconPath ? `https://raw.githubusercontent.com/zey-win/ci-cd/main/${serverIconPath}` : (d.icon?.htmlUrl || null);
      if (serverIconUrl) runMeta[d.run.id] = { icon: serverIconUrl, ver: p.version_name || "", code: p.version_code || "" };
      timers[d.run.id] = { start: Date.now(), total: (39 + (d.run.id % 12)) * 60 * 1000 };
      runs = [d.run, ...runs];
      renderAll();
    } else loadBuilds();
    iconLoadedDeferred = null;
  } catch (err) { alert("Ошибка: " + err.message); }
});

// ----- Clipboard for modal inputs -----
const clipboardExceptedInputs = new Set(["app_name"]);
function setupClipboardInput(el) {
  if (!el || clipboardExceptedInputs.has(el.name)) return;
  let pasted = false;
  el.addEventListener("focus", () => {
    if (pasted) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.readText().then(t => { if (t && !el.value) { el.value = t; pasted = true; } }).catch(() => {});
    } else pasted = true;
  });
  el.addEventListener("blur", () => { pasted = false; });
}
document.querySelectorAll("#build-form input").forEach(setupClipboardInput);

// ----- Startup -----
const stopTimerLoop = startTimerLoop();
(async () => {
  await loadReleases();
  updateBranches();
  loadBuilds();
  setInterval(loadBuilds, 15000);
})();
