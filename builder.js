const apiBase = document.querySelector('meta[name="builder-api"]')?.content?.replace(/\/$/, "") || "https://zeywin-android-builder-api.vercel.app";
const operatorKey = document.querySelector('meta[name="builder-key"]')?.content?.trim() || "";
const op = (extra = {}) => ({ "Content-Type": "application/json", "x-builder-key": operatorKey, ...extra });
const $ = id => document.getElementById(id);
const list = $("list");
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
const REPO_ICONS = {
  "zey-win__plinko.png":"https://raw.githubusercontent.com/zey-win/ci-cd/main/builds/icons/zey-win__plinko.png",
  "zey-win__blackjack.png":"https://raw.githubusercontent.com/zey-win/ci-cd/main/builds/icons/zey-win__blackjack.png",
  "zey-win__roulette.png":"https://raw.githubusercontent.com/zey-win/ci-cd/main/builds/icons/zey-win__roulette.png",
  "zey-win__dragon.tiger.png":"https://raw.githubusercontent.com/zey-win/ci-cd/main/builds/icons/zey-win__dragon.tiger.png",
  "zey-win__baccarat.tiger.png":"https://raw.githubusercontent.com/zey-win/ci-cd/main/builds/icons/zey-win__baccarat.tiger.png",
  "zey-win__wheel.of.fortune.png":"https://raw.githubusercontent.com/zey-win/ci-cd/main/builds/icons/zey-win__wheel.of.fortune.png",
  "zey-win__Unstopable.png":"https://raw.githubusercontent.com/zey-win/ci-cd/main/builds/icons/zey-win__Unstopable.png",
  "zey-win__SlotSpot.png":"https://raw.githubusercontent.com/zey-win/ci-cd/main/builds/icons/zey-win__SlotSpot.png",
  "zey-win__plinkofaling.png":"https://raw.githubusercontent.com/zey-win/ci-cd/main/builds/icons/zey-win__plinkofaling.png",
  "zey-win__plinkorm.png":"https://raw.githubusercontent.com/zey-win/ci-cd/main/builds/icons/zey-win__plinkorm.png",
};
let runMeta = {}, releases = [], firebaseJson = null, currentIconDataUrl = null, iconLoadedDeferred = null;
let runs = [];

function repoFromTitle(t) {
  const r = (t||"").toLowerCase();
  if (r.includes("plinko")) return "zey-win/plinko";
  if (r.includes("blackjack")) return "zey-win/blackjack";
  if (r.includes("roulette")) return "zey-win/roulette";
  if (r.includes("dragon tiger")) return "zey-win/dragon-tiger";
  if (r.includes("baccarat")) return "zey-win/baccarat-tiger";
  if (r.includes("wheel")) return "zey-win/wheel-of-fortune";
  if (r.includes("unstopable")) return "zey-win/Unstopable";
  if (r.includes("slotspot")) return "zey-win/SlotSpot";
  return "";
}
function runName(r) {
  const raw = r.displayTitle || r.name || "";
  return raw.replace(/^Android:\s*/i, "").replace(/\s*\/.*$/, "");
}
function buildIconUrl(r) {
  const m = (r.displayTitle||"").match(/builder-([a-z0-9]+)/);
  if (m) return `https://raw.githubusercontent.com/zey-win/ci-cd/main/builds/icons/${m[0]}.png`;
  const t = runName(r);
  for (const [key, url] of Object.entries(REPO_ICONS)) {
    const name = key.replace(/^zey-win__/,"").replace(/\.png$/,"").replace(/\./g," ").replace(/\s+/g," ");
    if (t.toLowerCase().includes(name.toLowerCase().replace(/^plinkofaling$/,"plinko falling").replace(/^plinkorm$/,"plinko real money"))) return url;
  }
  return "";
}
function formatDur(ms) {
  if (!ms||ms<=0) return "";
  const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000),s=Math.floor((ms%60000)/1000);
  return h?`${h}ч ${m}м ${s}с`:`${m}м ${s}с`;
}
const timers = {};
const timerIds = new Set();
function startSparks(el, runId) {
  el.classList.add("in-progress");
  timerIds.add(runId);
  const t = document.getElementById(`t-${runId}`);
  if (t) t.style.display = "inline";
}
function tUpdate() {
  const now = Date.now();
  for (const id of timerIds) {
    const r = runs.find(x => x.id === id);
    if (!r) continue;
    if (r.status === "completed") { timerIds.delete(id); const e = document.getElementById(`t-${id}`); if (e) { e.style.display = "none"; } continue; }
    const el = document.getElementById(`t-${id}`);
    if (!el) continue;
    const start = timers[id] || (timers[id] = Date.now());
    const diff = Math.max(0, now - start);
    const cs = Math.floor((diff % 1000) / 10);
    const s = Math.floor(diff / 1000) % 60;
    const m = Math.floor(diff / 60000) % 60;
    el.textContent = `⏱ ${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")},${String(cs).padStart(2,"0")}`;
  }
  requestAnimationFrame(tUpdate);
}
function buildCardHTML(r, idx) {
  const st = r.status || "";
  const concl = r.conclusion || "";
  const appName = rawTitle(r);
  const metaParts = [];
  const dur = (r.created_at && r.updated_at) ? formatDur(new Date(r.updated_at) - new Date(r.created_at)) : "";
  if (r.version_name) metaParts.push(`v${r.version_name}`);
  if (dur) metaParts.push(dur);
  const iconSrc = runMeta[r.id]?.icon || buildIconUrl(r);
  const iconHtml = iconSrc ? `<img class="card-icon" src="${iconSrc}" alt="">` : `<div class="card-icon" style="background:#21262d"></div>`;
  const spklass = (st !== "completed") ? "in-progress" : "";
  const statusClass = st === "completed" ? (concl === "success" ? "status-success" : "status-failure") : "status-pending";
  const statusText = st === "completed" ? (concl === "success" ? "✅" : "❌") : "⏳";
  const logUrl = apiBase.replace(/\/+$/,"") + "/api/log/" + (r.id || "");
  const timerId = `t-${r.id}`;
  if (st !== "completed" && !timers[r.id]) timers[r.id] = Date.now();
  const timerHtml = st !== "completed" ? `<span class="timer" id="${timerId}" style="color:#ffd700;font-size:12px">⏱ 00:00,00</span>` : "";
  const dlBtn = st === "completed" && r.download_url ? `<a class="dl-btn" href="${r.download_url}">📥 APK</a>` : "";
  const delBtn = `<button class="del-btn" data-id="${r.id}" data-idx="${idx}">✕</button>`;
  const logBtn = st !== "completed" ? `<a class="log-btn" href="${logUrl}" target="_blank">📋 Лог</a>` : "";
  return `<div class="build-card ${spklass}" data-idx="${idx}">${iconHtml}<div class="info"><div class="app-name">${appName}</div><div class="meta">${metaParts.join(" · ")}</div></div><div class="actions"><span class="status ${statusClass}">${statusText}</span>${timerHtml}${dlBtn}${logBtn}${delBtn}</div></div>`;
}
function rawTitle(r) {
  return (r.displayTitle || r.name || "").replace(/^Android:\s*/i, "");
}
function runRepo(r) {
  return repoFromTitle(rawTitle(r));
}
function renderAll() {
  const active = runs.filter(r => r.status !== "completed");
  const done = runs.filter(r => r.status === "completed" && r.conclusion === "success");
  const fail = runs.filter(r => r.status === "completed" && r.conclusion !== "success");
  const all = [...active, ...done, ...fail].slice(0, 30);
  const html = all.map((r, i) => buildCardHTML(r, i)).join("");
  if (list.innerHTML !== html) list.innerHTML = html;
  for (const r of all) { if (r.status !== "completed") { const el = list.querySelector(`[data-idx="${runs.indexOf(r)}"]`); if (el) el.classList.add("in-progress"); } }
}
async function loadBuilds() {
  if (loading) loading.style.display = "inline-flex";
  try {
    const [runsRes] = await Promise.all([fetch(`${apiBase}/api/runs`), loadReleases()]);
    if (!runsRes.ok) return;
    const data = await runsRes.json();
    runs = (data.runs || data || []).filter(r => r.id);
    await loadFirebaseJson();
    renderAll();
    tUpdate();
  } catch(e) { console.error(e); } finally { if (loading) loading.style.display = "none"; }
}
async function loadReleases() {
  try {
    const res = await fetch("https://api.github.com/repos/zey-win/android-builder-api/releases?per_page=5");
    if (res.ok) releases = await res.json();
  } catch {}
}
async function loadFirebaseJson() {
  for (const r of runs) {
    const repo = runRepo(r);
    if (!repo) continue;
    const def = getDef(repo);
    if (def?.firebase_url) {
      try {
        const res = await fetch(def.firebase_url);
        if (res.ok) { firebaseJson = await res.json(); break; }
      } catch {}
    }
  }
}
function showIconSpinner() { gameIcon.style.display = "none"; iconSpinner.style.display = "block"; }
function hideIconSpinner() { iconSpinner.style.display = "none"; }
function setIcon(src) { if (src) { gameIcon.src = src; gameIcon.style.display = "block"; } else gameIcon.style.display = "none"; hideIconSpinner(); }
function resetForm() {
  form.reset();
  gameIcon.style.display = "none";
  hideIconSpinner();
  currentIconDataUrl = null;
  document.getElementById("advanced-section").open = false;
}
repoSelect.addEventListener("change", () => {
  const repo = repoSelect.value;
  const def = getDef(repo);
  if (def) {
    const appInput = form.querySelector('[name="app_name"]');
    const pkgInput = form.querySelector('[name="package_name"]');
    if (appInput && def.app_name && !appInput.value) appInput.value = def.app_name;
    if (pkgInput && def.package_name && !pkgInput.value) pkgInput.value = def.package_name;
  }
  loadBranches(repo);
  loadGameIcon(repo);
});
async function loadBranches(repo) {
  branchSelect.innerHTML = '<option value="">Загрузка...</option>';
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/branches?per_page=50`);
    if (!res.ok) { branchSelect.innerHTML = '<option value="">Ошибка загрузки</option>'; return; }
    const branches = await res.json();
    branchSelect.innerHTML = branches.map(b => `<option value="${b.name}">${b.name}</option>`).join("");
  } catch { branchSelect.innerHTML = '<option value="">Ошибка</option>'; }
}
function loadGameIcon(repo) {
  showIconSpinner();
  const parts = repo.split("/");
  const repoName = parts[1] || "";
  const iconUrl = REPO_ICONS[`zey-win__${repoName}.png`];
  if (!iconUrl) { setIcon(""); return; }
  const img = new Image();
  img.onload = () => setIcon(iconUrl);
  img.onerror = () => setIcon("");
  img.src = iconUrl;
}
iconFile.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { currentIconDataUrl = reader.result; gameIcon.src = reader.result; gameIcon.style.display = "block"; };
  reader.readAsDataURL(file);
});
newBuildBtn.addEventListener("click", () => { resetForm(); modal.classList.remove("hidden"); repoSelect.dispatchEvent(new Event("change")); });
cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const body = Object.fromEntries(fd);
  body.firebase_json = firebaseJson || undefined;
  if (currentIconDataUrl) body.icon_data_url = currentIconDataUrl;
  try {
    const res = await fetch(`${apiBase}/api/build`, { method: "POST", headers: op(), body: JSON.stringify(body) });
    if (res.ok) { modal.classList.add("hidden"); setTimeout(loadBuilds, 1000); }
    else alert("Ошибка: " + (await res.text()));
  } catch(err) { alert("Ошибка: " + err.message); }
});
firebaseFile.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try { firebaseJson = JSON.parse(reader.result); const s = document.getElementById("firebase-status"); if (s) { s.textContent = "✅ загружен"; s.style.display = "inline"; } } catch { alert("Неверный JSON"); }
  };
  reader.readAsText(file);
});
zBtn.addEventListener("click", async () => {
  const repo = repoSelect.value;
  if (!repo) return;
  const def = getDef(repo);
  if (!def) return;
  try {
    const res = await fetch("https://api.github.com/repos/"+repo+"/contents/Assets/Plugins/Android/AndroidManifest.xml");
    if (!res.ok) return;
    const data = await res.json();
    const text = atob(data.content);
    const mn = text.match(/android:versionName="([^"]+)"/);
    const mc = text.match(/android:versionCode="([^"]+)"/);
    if (mn) form.querySelector('[name="version_name"]').value = mn[1];
    if (mc) form.querySelector('[name="version_code"]').value = mc[1];
  } catch {}
});
list.addEventListener("click", (e) => {
  const del = e.target.closest(".del-btn");
  if (!del) return;
  const id = del.dataset.id;
  if (!confirm("Удалить сборку?")) return;
  fetch(`${apiBase}/api/run/${id}`, { method: "DELETE", headers: op() }).then(r => { if (r.ok) loadBuilds(); }).catch(() => {});
});
loadBuilds();
