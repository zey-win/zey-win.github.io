const apiBase = document.querySelector('meta[name="builder-api"]')?.content?.replace(/\/$/, "") || "https://zeywin-android-builder-api.vercel.app";
const operatorKey = document.querySelector('meta[name="builder-key"]')?.content?.trim() || "";
const op = (extra={}) => ({ "Content-Type": "application/json", "x-builder-key": operatorKey, ...extra });
const $ = id => document.getElementById(id);
const buildsContainer = $("builds-container");
const activeContainer = $("active-container");
const modal = $("modal");
const form = $("build-form");
const newBuildBtn = $("new-build");
const cancelBtn = $("modal-cancel");
const repoSelect = $("repo-select");
const gameIcon = $("game-icon");
const iconFile = $("icon-file");
const loading = $("loading");

let runs = [];
let customIcon = null;
const icons = {};
const releases = []; // cache of GitHub releases

const REPO_NAMES = {
  "zey-win/plinko":"plinko","zey-win/blackjack":"blackjack","zey-win/roulette":"roulette",
  "zey-win/dragon-tiger":"dragon tiger","zey-win/baccarat-tiger":"baccarat tiger",
  "zey-win/wheel-of-fortune":"wheel of fortune","zey-win/Unstopable":"unstopable","zey-win/SlotSpot":"slotspot"
};

function repoFromTitle(t) {
  const s = (t||"").toLowerCase().replace(/[^a-z0-9 ]/g," ");
  for(const [repo,name] of Object.entries(REPO_NAMES)) if(s.includes(name)) return repo;
  return null;
}

function parseTitle(title) {
  if(!title) return {app:"Build",pkg:""};
  const parts = title.replace(/^Android:\s*/i,"").split(" / ").map(p=>p.trim());
  return {app:parts[0]||"Build", pkg:parts[1]||""};
}

// Load releases from GitHub API
async function loadReleases() {
  try {
    const res = await fetch("https://api.github.com/repos/zey-win/ci-cd/releases?per_page=50");
    if(!res.ok) return;
    const data = await res.json();
    releases.length = 0;
    for(const r of (data||[])) {
      const tag = r.tag_name || "";
      const assets = (r.assets||[]).map(a => ({
        name: a.name, url: a.browser_download_url
      }));
      releases.push({ tag, name: r.name, assets });
    }
  } catch {}
}

// Find download URLs for a package name from releases
function findDownloads(pkg) {
  if(!pkg) return {apk:null, aab:null};
  const p = pkg.toLowerCase();
  for(const rel of releases) {
    const tag = rel.tag.toLowerCase();
    // tag format: android-apk-{pkg}-v{version}-{code}-{attempt}
    if(!tag.includes(p.replace(/\./g,"-"))) continue;
    const apk = rel.assets.find(a => a.name.endsWith(".apk") && a.name.toLowerCase().includes(p));
    const aab = rel.assets.find(a => a.name.endsWith(".aab") && a.name.toLowerCase().includes(p));
    if(apk || aab) return {apk: apk?.url||null, aab: aab?.url||null};
  }
  return {apk:null, aab:null};
}

async function preloadIcons() {
  const repos = Object.keys(REPO_NAMES);
  await Promise.all(repos.map(async repo => {
    try {
      const res = await fetch(`${apiBase}/api/icon?game_repository=${encodeURIComponent(repo)}&game_ref=main`, { headers: op() });
      if(!res.ok) return;
      const d = await res.json();
      if(d.ok && d.icon && d.icon.dataUrl) icons[repo] = d.icon.dataUrl;
    } catch {}
  }));
}

iconFile.addEventListener("change", e => {
  const f = e.target.files[0];
  if(!f) return;
  if(f.type !== "image/png") { alert("Only PNG"); return; }
  const r = new FileReader();
  r.onload = () => { customIcon = r.result; gameIcon.src = r.result; gameIcon.style.display = "block"; };
  r.readAsDataURL(f);
});

async function loadIcon(repo) {
  if(icons[repo]) { gameIcon.src = icons[repo]; gameIcon.style.display = "block"; return; }
  try {
    const res = await fetch(`${apiBase}/api/icon?game_repository=${encodeURIComponent(repo)}&game_ref=main`, { headers: op() });
    if(!res.ok) { gameIcon.style.display = "none"; return; }
    const d = await res.json();
    if(d.ok && d.icon?.dataUrl) { icons[repo]=d.icon.dataUrl; gameIcon.src=d.icon.dataUrl; gameIcon.style.display="block"; }
    else gameIcon.style.display="none";
  } catch { gameIcon.style.display="none"; }
}

repoSelect.addEventListener("change", () => loadIcon(repoSelect.value));

newBuildBtn.addEventListener("click", () => {
  customIcon = null;
  modal.classList.remove("hidden");
  loadIcon(repoSelect.value);
});
cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", e => { if(e.target===modal) modal.classList.add("hidden"); });

form.addEventListener("submit", async e => {
  e.preventDefault();
  const fd = new FormData(form);
  const p = {
    game_repository: fd.get("game_repository"),
    app_name: fd.get("app_name"),
    package_name: fd.get("package_name"),
    build_format: fd.get("build_format"),
    iconDataUrl: customIcon || ""
  };
  modal.classList.add("hidden");
  try {
    const res = await fetch(`${apiBase}/api/build`, { method:"POST", headers:op(), body:JSON.stringify(p) });
    if(!res.ok) { alert("Error: " + await res.text().catch(()=>"")); return; }
    const d = await res.json();
    if(customIcon) icons[p.game_repository] = customIcon;
    if(d.run) { runs = [d.run, ...runs]; renderAll(); } else loadBuilds();
  } catch(err) { alert("Error: "+err.message); }
});

async function loadBuilds() {
  if(loading) loading.style.display = "block";
  try {
    const [runsRes] = await Promise.all([
      fetch(`${apiBase}/api/runs`),
      loadReleases() // reload releases
    ]);
    if(!runsRes.ok) { buildsContainer.innerHTML="<p>No builds</p>"; return; }
    const d = await runsRes.json();
    runs = Array.isArray(d.runs) ? d.runs : [];
    renderAll();
  } catch { buildsContainer.innerHTML="<p>Load error</p>"; }
  finally { if(loading) loading.style.display="none"; }
}

async function deleteRun(runId, e) {
  if(!confirm("Delete this build?")) return;
  const btn = e?.target;
  if(btn) btn.disabled = true;
  try {
    await fetch(`${apiBase}/api/cancel`, { method:"POST", headers:op(), body:JSON.stringify({run_id: runId}) });
    runs = runs.filter(r => r.id !== runId);
    renderAll();
  } catch(err) { alert("Delete error: "+err.message); }
  finally { if(btn) btn.disabled = false; }
}

function renderAll() {
  const active = runs.filter(r => r.status !== "completed");
  const done = runs.filter(r => r.status === "completed" && r.conclusion === "success");
  const fail = runs.filter(r => r.status === "completed" && r.conclusion !== "success");
  activeContainer.innerHTML = active.length ? active.map(r => card(r)).join("") : "<p>Нет активных сборок</p>";
  buildsContainer.innerHTML = done.length || fail.length ? [...done, ...fail].slice(0,30).map(r => card(r)).join("") : "<p>Нет завершённых сборок</p>";
}

function card(r) {
  const raw = r.displayTitle || r.name || "";
  const {app, pkg} = parseTitle(raw);
  const concl = r.conclusion || "";
  const st = r.status || "unknown";
  const created = r.createdAt ? new Date(r.createdAt).toLocaleString() : "";
  const url = r.htmlUrl || "#";
  const repo = repoFromTitle(raw);
  const iconUrl = repo && icons[repo] ? icons[repo] : null;
  const downloads = concl === "success" ? findDownloads(pkg) : {apk:null, aab:null};

  let label, cls;
  if(concl === "success") { label = "✅ Готов"; cls = "status-success"; }
  else if(concl === "failure") { label = "❌ Ошибка"; cls = "status-failure"; }
  else if(["waiting","queued","pending"].includes(st)) { label = "⏳ В очереди"; cls = "status-pending"; }
  else if(st === "completed") { label = "❌ Ошибка"; cls = "status-failure"; }
  else { label = "🔄 "+st; cls = "status-pending"; }

  const actions = `<div class="actions">
    ${downloads.apk ? `<a class="dl-btn" href="${downloads.apk}" download>APK</a>` : ""}
    ${downloads.aab ? `<a class="dl-btn" href="${downloads.aab}" download>AAB</a>` : ""}
    <button class="del-btn" onclick="deleteRun(${r.id}, event)">Delete</button>
    <a href="${esc(url)}" target="_blank">Логи →</a>
  </div>`;

  return `<div class="build-card">${iconUrl ? `<img class="card-icon" src="${iconUrl}" alt="">` : ""}<div class="info"><div class="app-name">${esc(app)}</div><div class="meta">${esc(pkg)}</div></div>${actions}<span class="status ${cls}">${label}</span></div>`;
}

function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

(async () => {
  await preloadIcons();
  loadBuilds();
  setInterval(loadBuilds, 15000);
})();