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

const iconCache = new Map(); // per-branch icon cache (должен быть перед loadIcon)
const REPO_DEFAULTS = {};
function getDef(repo) { return REPO_DEFAULTS[repo] || {}; }
REPO_DEFAULTS["zey-win/plinko"] = {
  app_name: "Plinko Real Money",
  package_name: "com.playsocialgames.plinkofun",
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
// Utility to set spinner on icon
function showIconSpinner() {
  gameIcon.style.display = "none";
  iconSpinner.style.display = "block";
}
function hideIconSpinner() {
  iconSpinner.style.display = "none";
}
function setIcon(src) {
  if (src) { gameIcon.src = src; gameIcon.style.display = "block"; }
  else gameIcon.style.display = "none";
  hideIconSpinner();
}

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

// Z button: fill form with repo defaults + fetch firebase
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
  // Try to load firebase JSON from local firebase-cfg/ by package
  const pkg = document.querySelector('[name="package_name"]').value || def.package_name || "";
  if (fbStatus) { fbStatus.textContent = "⏳ firebase..."; fbStatus.style.display = "inline"; }
  try {
    const fbUrl = `/firebase-cfg/${encodeURIComponent(pkg)}.json`;
    let res = await fetch(fbUrl);
    if (!res.ok && def.firebase_url) res = await fetch(def.firebase_url);
    if (res.ok) {
      const text = await res.text();
      const base64 = btoa(text);
      firebaseJson = `data:application/json;base64,${base64}`;
      if (fbStatus) { fbStatus.textContent = "✅ firebase загружен"; }
      if (fbBtn) { fbBtn.textContent = "📁 Заменить файл"; }
    } else {
      if (fbStatus) { fbStatus.textContent = "❌ firebase не найден"; fbStatus.style.color = "#f85149"; }
    }
  } catch {
    if (fbStatus) { fbStatus.textContent = "❌ ошибка"; fbStatus.style.color = "#f85149"; }
  }
});

// Hide old loadIcon, replace with new one above
// Remove old loadIcon function below

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
const icons = {};
const runMeta = {}; // runId -> { game_ref, iconDataUrl, version_name, version_code }
const releases = [];

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
    const data = await res.json();
    releases.length = 0;
    for (const r of (data || [])) {
      const tag = r.tag_name || "";
      const assets = (r.assets || []).map(a => ({ name: a.name, url: a.browser_download_url }));
      releases.push({ tag, name: r.name, assets });
    }
  } catch { }
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

async function preloadIcons() {
  const repos = Object.keys(REPO_NAMES);
  await Promise.all(repos.map(async repo => {
    try {
      const res = await fetch(`${apiBase}/api/icon?game_repository=${encodeURIComponent(repo)}&game_ref=main`, { headers: op() });
      if (!res.ok) return;
      const d = await res.json();
      if (d.ok && d.icon && d.icon.dataUrl) icons[repo] = d.icon.dataUrl;
    } catch { }
  }));
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
  r.onload = () => { firebaseJson = r.result; };
  r.readAsDataURL(f);
});

repoSelect.addEventListener("change", updateBranches);
branchSelect.addEventListener("change", () => loadIcon(repoSelect.value, branchSelect.value));

newBuildBtn.addEventListener("click", () => {
  customIcon = null;
  firebaseJson = null;
  modal.classList.remove("hidden");
  updateBranches();
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
    if (customIcon) {
      iconCache.set(cacheKey, customIcon);
    }
    // Copy icon to icons[repo] for card display
    if (d.run) {
      // remember icon + version info for this specific build
      const iconForBuild = customIcon || iconCache.get(cacheKey) || null;
      runMeta[d.run.id] = { icon: iconForBuild, ver: p.version_name || "", code: p.version_code || "" };
      runs = [d.run, ...runs];
      renderAll();
    } else loadBuilds();
  } catch (err) { alert("Error: " + err.message); }
});

async function loadBuilds() {
  if (loading) loading.style.display = "inline-flex";
  try {
    const [runsRes] = await Promise.all([
      fetch(`${apiBase}/api/runs`),
      loadReleases()
    ]);
    if (!runsRes.ok) { buildsContainer.innerHTML = "<p>No builds</p>"; return; }
    const d = await runsRes.json();
    runs = Array.isArray(d.runs) ? d.runs : [];
    renderAll();
  } catch { buildsContainer.innerHTML = "<p>Load error</p>"; }
  finally { if (loading) loading.style.display = "none"; }
}

async function deleteRun(runId, e) {
  if (!confirm("Delete this build?")) return;
  const btn = e?.target;
  if (btn) btn.disabled = true;
  try {
    await fetch(`${apiBase}/api/cancel`, { method: "POST", headers: op(), body: JSON.stringify({ run_id: runId }) });
    runs = runs.filter(r => r.id !== runId);
    renderAll();
  } catch (err) { alert("Delete error: " + err.message); }
  finally { if (btn) btn.disabled = false; }
}

function renderAll() {
  const active = runs.filter(r => r.status !== "completed");
  const done = runs.filter(r => r.status === "completed" && r.conclusion === "success");
  const fail = runs.filter(r => r.status === "completed" && r.conclusion !== "success");
  activeContainer.innerHTML = active.length ? active.map(r => card(r)).join("") : "";
  buildsContainer.innerHTML = done.length || fail.length ? [...done, ...fail].slice(0, 30).map(r => card(r)).join("") : "";
}

function card(r) {
  const raw = r.displayTitle || r.name || "";
  const { app, pkg } = parseTitle(raw);
  const concl = r.conclusion || "";
  const st = r.status || "unknown";
  const created = r.createdAt ? new Date(r.createdAt).toLocaleString() : "";
  const url = r.htmlUrl || "#";
  const repo = repoFromTitle(raw);
  // Try to match app name to a branch for icon lookup
  const appLower = (app || "").toLowerCase();
  let iconKey = null;
  if (repo === "zey-win/plinko" && appLower.includes("real money")) iconKey = "zey-win/plinko@app/plinko-real-money";
  else if (repo === "zey-win/plinko" && appLower.includes("real game")) iconKey = "zey-win/plinko@app/plinko-real-game";
  else if (repo === "zey-win/plinko" && appLower.includes("plinko") && !appLower.includes("falling") && !appLower.includes("real")) iconKey = "zey-win/plinko@app/plinko";
  else if (repo === "zey-win/plinko" && appLower.includes("falling")) iconKey = "zey-win/plinko@main";
  else iconKey = `${repo}@main`;
  const meta = runMeta[r.id] || {};
  let iconUrl = meta.icon || (typeof runMeta[r.id] === 'string' ? runMeta[r.id] : null);
  const downloads = concl === "success" ? findDownloads(pkg) : { apk: null, aab: null };

  let label, cls;
  if (concl === "success") { label = "✅ Готов"; cls = "status-success"; }
  else if (concl === "failure") { label = "Ошибка"; cls = "status-failure"; }
  else if (["waiting", "queued", "pending"].includes(st)) { label = "⏳ В очереди"; cls = "status-pending"; }
  else if (st === "completed") { label = "Ошибка"; cls = "status-failure"; }
  else { label = "🔄 " + st; cls = "status-pending"; }

  const isSuccess = concl === "success";
  const dlApk = findDownloads(pkg);
  const actions = `<div class="actions">
    <button class="del-btn" onclick="deleteRun(${r.id}, event)" title="Delete">❌</button>
    ${isSuccess ? `
      ${dlApk.apk ? `<a class="dl-btn" href="${dlApk.apk}" download>APK</a>` : ""}
      ${dlApk.aab ? `<a class="dl-btn" href="${dlApk.aab}" download>AAB</a>` : ""}
    ` : `
      <a href="${esc(url)}" target="_blank" class="log-btn">Логи →</a>
    `}
  </div>`;

  // Use version from runMeta if available, otherwise fallback to runNumber/runAttempt
  const verStr = meta.ver || String(r.runNumber || "");
  const codeStr = meta.code || String(r.runAttempt || "1");
  const versionInfo = verStr ? `| Version ${verStr} (code: ${codeStr})` : "";
  return `<div class="build-card">${iconUrl ? `<img class="card-icon" src="${iconUrl}" alt="">` : ""}<div class="info"><div class="app-name">${esc(app)}</div><div class="meta">${esc(pkg)}</div><div class="meta">${versionInfo}</div></div>${actions}<span class="status ${cls}">${label}</span></div>`;
}

function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

(async () => {
  await preloadIcons();
  updateBranches();
  loadBuilds();
  setInterval(loadBuilds, 15000);
})();