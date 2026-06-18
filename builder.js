const apiBase = document.querySelector('meta[name="builder-api"]')?.content?.replace(/\/$/, "") || "https://zeywin-android-builder-api.vercel.app";
const operatorKey = document.querySelector('meta[name="builder-key"]')?.content?.trim() || "";
const op = (extra = {}) => ({ "Content-Type": "application/json", "x-builder-key": operatorKey, ...extra });
const $ = id => document.getElementById(id);
const buildsContainer = $("builds-container");
const activeContainer = $("active-container");
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

const iconCache = new Map();
const REPO_DEFAULTS = {};
function getDef(repo) { return REPO_DEFAULTS[repo] || {}; }
REPO_DEFAULTS["zey-win/plinko"] = {
  app_name: "Plinko Real Money", package_name: "com.playsocialgames.plinkofun",
  admob_android_app_id: "ca-app-pub-1585565865476548~5854522209",
  admob_android_banner_id: "ca-app-pub-1585565865476548/2893595529",
  admob_android_interstitial_id: "ca-app-pub-1585565865476548/2521834122",
  admob_android_rewarded_id: "ca-app-pub-1585565865476548/7091315351",
  zeywin_api_key: "zw_7b07dc24806408f6e655dcf0422e15c5e028d40d440b3e1a",
  firebase_url: "https://raw.githubusercontent.com/zey-win/plinko/main/Assets/Plugins/Android/google-services.json"
};
REPO_DEFAULTS["zey-win/blackjack"] = { app_name: "Blackjack", package_name: "com.playmaxsolutions.blackjack" };
REPO_DEFAULTS["zey-win/roulette"] = { app_name: "Roulette", package_name: "com.playmaxsolutions.roulette" };
REPO_DEFAULTS["zey-win/dragon-tiger"] = { app_name: "Dragon Tiger", package_name: "com.playmaxsolutions.dragontiger" };
REPO_DEFAULTS["zey-win/baccarat-tiger"] = { app_name: "Baccarat", package_name: "com.playmaxsolutions.baccarattiger" };
REPO_DEFAULTS["zey-win/wheel-of-fortune"] = { app_name: "Wheel of Fortune", package_name: "com.playmaxsolutions.wheeloffortune" };
REPO_DEFAULTS["zey-win/Unstopable"] = { app_name: "Unstopable: Real Money", package_name: "com.playmaxsolutions.unstopable" };
REPO_DEFAULTS["zey-win/SlotSpot"] = { app_name: "SlotSpot", package_name: "com.playmaxsolutions.slotspot" };

function showIconSpinner() { gameIcon.style.display = "none"; iconSpinner.style.display = "block"; }
function hideIconSpinner() { iconSpinner.style.display = "none"; }
function setIcon(src) { if (src) { gameIcon.src = src; gameIcon.style.display = "block"; } else gameIcon.style.display = "none"; hideIconSpinner(); }

async function loadIcon(repo, ref) {
  const refStr = ref || "main";
  const cacheKey = `${repo}@${refStr}`;
  const cached = iconCache.get(cacheKey);
  if (cached) { setIcon(cached); return; }
  showIconSpinner();
  try {
    const res = await fetch(`${apiBase}/api/icon?game_repository=${encodeURIComponent(repo)}&game_ref=${encodeURIComponent(refStr)}`, { headers: op() });
    if (!res.ok) { setIcon(null); return; }
    const d = await res.json();
    if (d.ok && d.icon?.dataUrl) {
      iconCache.set(cacheKey, d.icon.dataUrl);
      setIcon(d.icon.dataUrl);
    } else setIcon(null);
  } catch { setIcon(null); }
}

// ---- Sound effects via AudioContext ----
let audioCtx = null;
function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
function playFanfare() {
  try {
    const ctx = getAudioCtx();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.6);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15); osc.stop(ctx.currentTime + i * 0.15 + 0.6);
    });
  } catch {}
}
function playErrorSound() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth"; osc.frequency.value = 150;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

// ---- Confetti ----
function fireConfetti(duration = 4000) {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:999";
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const particles = [];
  const colors = ["#ffd700","#ff6347","#00ff7f","#ff69b4","#87ceeb","#ffa500"];
  for (let i = 0; i < 100; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height * -1,
      vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3 + 1,
      w: Math.random() * 8 + 4, h: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1, rot: Math.random() * 360
    });
  }
  const start = Date.now();
  function anim() {
    const elapsed = Date.now() - start;
    if (elapsed > duration) { canvas.remove(); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.02; p.rot += 2;
      p.alpha = Math.max(0, 1 - elapsed / duration);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
      ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    requestAnimationFrame(anim);
  }
  anim();
}

// ---- Particles for "in_progress" cards ----
let particleIntervals = {};
function startParticles(cardEl, runId) {
  if (particleIntervals[runId]) return;
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;pointer-events:none;width:100%;height:100%;border-radius:8px";
  cardEl.style.position = "relative";
  cardEl.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  function resize() { canvas.width = cardEl.offsetWidth; canvas.height = cardEl.offsetHeight; }
  resize();
  const particles = [];
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5), vy: Math.random() * 0.5 + 0.2,
      size: Math.random() * 3 + 2, alpha: Math.random() * 0.5 + 0.5,
      alphaDir: Math.random() > 0.5 ? -1 : 1, fall: 0
    });
  }
  let lastTime = Date.now();
  function anim() {
    const dt = (Date.now() - lastTime) / 16; lastTime = Date.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let hasParticles = false;
    for (const p of particles) {
      p.fall += dt * 0.03;
      p.y += p.vy + p.fall * 0.1;
      p.x += p.vx + Math.sin(p.fall * 0.1) * 0.3;
      p.alpha += 0.02 * p.alphaDir;
      if (p.alpha > 1) { p.alpha = 1; p.alphaDir = -1; }
      if (p.alpha < 0.1) { p.alpha = 0.1; p.alphaDir = 1; }
      // remove particles that fall beyond 300px from start
      if (p.fall > 300) { p.x = Math.random() * canvas.width; p.y = -10; p.fall = 0; }
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = "#ffd700";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      hasParticles = true;
    }
    if (hasParticles) particleIntervals[runId] = requestAnimationFrame(anim);
  }
  anim();
  particleIntervals[runId] = null; // store reference for cleanup
}
function stopParticles(runId) {
  if (particleIntervals[runId]) { cancelAnimationFrame(particleIntervals[runId]); delete particleIntervals[runId]; }
}

// ---- Z button ----
zBtn.addEventListener("click", async () => {
  const repo = repoSelect.value;
  const def = getDef(repo);
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
      const text = await res.text(); const base64 = btoa(text);
      firebaseJson = `data:application/json;base64,${base64}`;
      if (fbStatus) { fbStatus.textContent = "✅ firebase загружен"; }
      if (fbBtn) { fbBtn.textContent = "📁 Заменить файл"; }
    } else { if (fbStatus) { fbStatus.textContent = "❌ firebase не найден"; fbStatus.style.color = "#f85149"; } }
  } catch { if (fbStatus) { fbStatus.textContent = "❌ ошибка"; fbStatus.style.color = "#f85149"; } }
});

const BRANCHES = {
  "zey-win/plinko": [
    { ref: "main", label: "Plinko Falling" },
    { ref: "app/plinko", label: "Plinko" },
    { ref: "app/plinko-real-game", label: "Plinko Real Game" },
    { ref: "app/plinko-real-money", label: "Plinko Real Money" }
  ]
};
const DEFAULT_BRANCHES = [{ ref: "main", label: "main" }];

function updateBranches() {
  const repo = repoSelect.value;
  const list = BRANCHES[repo] || DEFAULT_BRANCHES;
  branchSelect.innerHTML = list.map(b => `<option value="${b.ref}">${b.label}</option>`).join("");
  loadIcon(repo, branchSelect.value);
}

let runs = [];
let customIcon = null;
let firebaseJson = null;
const runMeta = {};
const icons = {}; // preloaded icons per repo
const releases = [];
let prevRunStatuses = {}; // track status changes for sounds

const REPO_NAMES = {
  "zey-win/plinko": "plinko", "zey-win/blackjack": "blackjack", "zey-win/roulette": "roulette",
  "zey-win/dragon-tiger": "dragon tiger", "zey-win/baccarat-tiger": "baccarat tiger",
  "zey-win/wheel-of-fortune": "wheel of fortune", "zey-win/Unstopable": "unstopable", "zey-win/SlotSpot": "slotspot"
};

function repoFromTitle(t) {
  const s = (t || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ");
  for (const [repo, name] of Object.entries(REPO_NAMES)) if (s.includes(name)) return repo;
  return null;
}
function parseTitle(title) {
  if (!title) return { app: "Build", pkg: "" };
  const parts = title.replace(/^Android:\s*/i, "").split(" / ").map(p => p.trim());
  return { app: parts[0] || "Build", pkg: parts[1] || "" };
}

async function loadReleases() {
  try {
    const res = await fetch("https://api.github.com/repos/zey-win/ci-cd/releases?per_page=50");
    if (!res.ok) return;
    const data = await res.json(); releases.length = 0;
    for (const r of (data || [])) {
      const tag = r.tag_name || "";
      const assets = (r.assets || []).map(a => ({ name: a.name, url: a.browser_download_url }));
      releases.push({ tag, name: r.name, assets });
    }
  } catch {}
}
function findDownloads(pkg) {
  if (!pkg) return { apk: null, aab: null };
  const p = pkg.toLowerCase();
  for (const rel of releases) {
    const tag = rel.tag.toLowerCase();
    if (!tag.includes(p.replace(/\./g, "-"))) continue;
    const apk = rel.assets.find(a => a.name.endsWith(".apk") && a.name.toLowerCase().includes(p));
    const aab = rel.assets.find(a => a.name.endsWith(".aab") && a.name.toLowerCase().includes(p));
    if (apk || aab) return { apk: apk?.url || null, aab: aab?.url || null };
  }
  return { apk: null, aab: null };
}

iconFile.addEventListener("change", e => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.type !== "image/png") { alert("Only PNG"); return; }
  const r = new FileReader();
  r.onload = () => { customIcon = r.result; gameIcon.src = r.result; gameIcon.style.display = "block"; };
  r.readAsDataURL(f);
});
firebaseFile.addEventListener("change", e => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.type !== "application/json") { alert("Only JSON"); return; }
  const r = new FileReader();
  r.onload = () => { firebaseJson = r.result; }; r.readAsDataURL(f);
});

repoSelect.addEventListener("change", updateBranches);
branchSelect.addEventListener("change", () => loadIcon(repoSelect.value, branchSelect.value));

let iconLoadedDeferred = null;
newBuildBtn.addEventListener("click", () => {
  customIcon = null; firebaseJson = null;
  modal.classList.remove("hidden");
  updateBranches();
  iconLoadedDeferred = loadIcon(repoSelect.value, branchSelect.value);
});
cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });

form.addEventListener("submit", async e => {
  e.preventDefault();
  const fd = new FormData(form);
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
    iconDataUrl: customIcon || "",
    firebaseJsonBase64: firebaseJson || ""
  };
  modal.classList.add("hidden");
  try {
    const res = await fetch(`${apiBase}/api/build`, { method: "POST", headers: op(), body: JSON.stringify(p) });
    if (!res.ok) { alert("Error: " + await res.text().catch(() => "")); return; }
    const d = await res.json();
    const cacheKey = `${p.game_repository}@${p.game_ref}`;
    if (customIcon) iconCache.set(cacheKey, customIcon);
    else {
      loadIcon(p.game_repository, p.game_ref).then(() => {
        const ico = iconCache.get(cacheKey);
        if (ico && d.run) { runMeta[d.run.id] = { icon: ico, ver: p.version_name || "", code: p.version_code || "" }; renderAll(); }
      });
    }
    if (d.run) {
      let iconForBuild = customIcon || iconCache.get(cacheKey) || null;
      if (!iconForBuild && iconLoadedDeferred) {
        try { await iconLoadedDeferred; } catch {}
        iconForBuild = iconCache.get(cacheKey) || null;
      }
      if (iconForBuild) runMeta[d.run.id] = { icon: iconForBuild, ver: p.version_name || "", code: p.version_code || "" };
      runs = [d.run, ...runs]; renderAll();
    } else loadBuilds();
    iconLoadedDeferred = null;
  } catch (err) { alert("Error: " + err.message); }
});

async function loadBuilds() {
  if (loading) loading.style.display = "inline-flex";
  try {
    const [runsRes] = await Promise.all([fetch(`${apiBase}/api/runs`), loadReleases()]);
    if (!runsRes.ok) { buildsContainer.innerHTML = "<p>No builds</p>"; return; }
    const d = await runsRes.json();
    const oldRuns = runs;
    runs = Array.isArray(d.runs) ? d.runs : [];
    // check for status changes
    for (const r of runs) {
      const old = oldRuns.find(o => o.id === r.id);
      if (old && old.status !== "completed" && r.status === "completed") {
        if (r.conclusion === "success") { playFanfare(); fireConfetti(4000); }
        else { playErrorSound(); }
      }
    }
    renderAll();
  } catch { buildsContainer.innerHTML = "<p>Load error</p>"; }
  finally { if (loading) loading.style.display = "none"; }
}

async function deleteRun(runId, e) {
  if (!confirm("Delete this build?")) return;
  const btn = e?.target; if (btn) btn.disabled = true;
  try {
    await fetch(`${apiBase}/api/cancel`, { method: "POST", headers: op(), body: JSON.stringify({ run_id: runId }) });
    runs = runs.filter(r => r.id !== runId); renderAll();
  } catch (err) { alert("Delete error: " + err.message); }
  finally { if (btn) btn.disabled = false; }
}

function renderAll() {
  const active = runs.filter(r => r.status !== "completed");
  const done = runs.filter(r => r.status === "completed" && r.conclusion === "success");
  const fail = runs.filter(r => r.status === "completed" && r.conclusion !== "success");
  activeContainer.innerHTML = active.length ? active.map((r, i) => card(r, i)).join("") : "";
  buildsContainer.innerHTML = done.length || fail.length ? [...done, ...fail].slice(0, 30).map((r, i) => card(r, i)).join("") : "";
  // Start particles for active cards
  if (active.length) {
    setTimeout(() => {
      const cards = activeContainer.querySelectorAll(".build-card");
      cards.forEach((el, i) => { const rid = active[i]?.id; if (rid) startParticles(el, rid); });
    }, 50);
  }
}

function card(r, idx) {
  const raw = r.displayTitle || r.name || "";
  const { app, pkg } = parseTitle(raw);
  const concl = r.conclusion || "";
  const st = r.status || "unknown";
  const created = r.createdAt ? new Date(r.createdAt).toLocaleString() : "";
  const url = r.htmlUrl || "#";
  const repo = repoFromTitle(raw);
  const appLower = (app || "").toLowerCase();
  let iconKey = null;
  if (repo === "zey-win/plinko" && appLower.includes("real money")) iconKey = "zey-win/plinko@app/plinko-real-money";
  else if (repo === "zey-win/plinko" && appLower.includes("real game")) iconKey = "zey-win/plinko@app/plinko-real-game";
  else if (repo === "zey-win/plinko" && appLower.includes("plinko") && !appLower.includes("falling") && !appLower.includes("real")) iconKey = "zey-win/plinko@app/plinko";
  else if (repo === "zey-win/plinko" && appLower.includes("falling")) iconKey = "zey-win/plinko@main";
  else iconKey = `${repo}@main`;
  const meta = runMeta[r.id];
  let iconUrl = null;
  if (meta && meta.icon) iconUrl = meta.icon;
  else if (iconKey) iconUrl = iconCache.get(iconKey);
  if (!iconUrl && repo) iconUrl = icons[repo] || null;
  const downloads = concl === "success" ? findDownloads(pkg) : { apk: null, aab: null };

  let label, cls;
  if (concl === "success") { label = "✅ Готов"; cls = "status-success"; }
  else if (concl === "failure") { label = "Ошибка"; cls = "status-failure"; }
  else if (["waiting", "queued", "pending"].includes(st)) { label = "⏳ В очереди"; cls = "status-pending"; }
  else if (st === "completed") { label = "Ошибка"; cls = "status-failure"; }
  else { label = "🔄 " + st; cls = "status-pending"; }

  const dlApk = findDownloads(pkg);
  const actions = `<div class="actions">
    <button class="del-btn" onclick="deleteRun(${r.id}, event)" title="Delete">❌</button>
    ${concl === "success" ? `
      ${dlApk.apk ? `<a class="dl-btn" href="${dlApk.apk}" download>APK</a>` : ""}
      ${dlApk.aab ? `<a class="dl-btn" href="${dlApk.aab}" download>AAB</a>` : ""}
    ` : `<a href="${esc(url)}" target="_blank" class="log-btn">Логи →</a>`}
  </div>`;

  const verStr = (meta && meta.ver) || String(r.runNumber || "");
  const codeStr = (meta && meta.code) || String(r.runAttempt || "1");
  const versionInfo = verStr ? `| Version ${verStr} (code: ${codeStr})` : "";
  // alternating background: even idx = slightly lighter
  const bgStyle = idx !== undefined && idx % 2 === 0 ? 'style="background:#1a202c"' : 'style="background:#161b22"';
  return `<div class="build-card" ${bgStyle}>${iconUrl ? `<img class="card-icon" src="${iconUrl}" alt="">` : ""}<div class="info"><div class="app-name">${esc(app)}</div><div class="meta">${esc(pkg)}</div><div class="meta">${versionInfo}</div></div>${actions}<span class="status ${cls}">${label}</span></div>`;
}

function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

// Preload icons for all repos on start
async function preloadIcons() {
  const repos = Object.keys(REPO_NAMES);
  await Promise.all(repos.map(async repo => {
    try {
      const res = await fetch(`${apiBase}/api/icon?game_repository=${encodeURIComponent(repo)}&game_ref=main`, { headers: op() });
      if (!res.ok) return;
      const d = await res.json();
      if (d.ok && d.icon && d.icon.dataUrl) {
        iconCache.set(`${repo}@main`, d.icon.dataUrl);
        icons[repo] = d.icon.dataUrl;
      }
    } catch {}
  }));
}

(async () => {
  await preloadIcons();
  updateBranches(); loadBuilds();
  setInterval(loadBuilds, 15000);
})();
