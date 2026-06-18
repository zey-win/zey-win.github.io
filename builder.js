const apiBase = document.querySelector('meta[name="builder-api"]')?.content?.replace(/\/$/, "") || "https://zeywin-android-builder-api.vercel.app";
const operatorKey = document.querySelector('meta[name="builder-key"]')?.content?.trim() || "";
const op = () => operatorKey ? { "Content-Type": "application/json", "x-builder-key": operatorKey } : { "Content-Type": "application/json" };
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

// Game repo mapping for icon lookup from displayTitle
const GAMES = {
  plinko: "zey-win/plinko",
  blackjack: "zey-win/blackjack",
  roulette: "zey-win/roulette",
  dragontiger: "zey-win/dragon-tiger",
  "dragon tiger": "zey-win/dragon-tiger",
  baccarattiger: "zey-win/baccarat-tiger",
  "baccarat tiger": "zey-win/baccarat-tiger",
  wheeloffortune: "zey-win/wheel-of-fortune",
  "wheel of fortune": "zey-win/wheel-of-fortune",
  unstopable: "zey-win/Unstopable",
  slotspot: "zey-win/SlotSpot",
  test: "zey-win/plinko",
  com: "zey-win/plinko"
};

function repoFromTitle(t) {
  const s = (t || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ");
  for (const [key, repo] of Object.entries(GAMES)) {
    if (s.includes(key)) return repo;
  }
  return null;
}

// Preload all icons on start
async function preloadIcons() {
  const repos = [...new Set(Object.values(GAMES))];
  await Promise.all(repos.map(async repo => {
    try {
      const res = await fetch(`${apiBase}/api/icon?game_repository=${encodeURIComponent(repo)}&game_ref=main`, { headers: op() });
      if (!res.ok) return;
      const d = await res.json();
      if (d.ok && d.icon?.dataUrl) { icons[repo] = d.icon.dataUrl; console.log("Icon loaded:", repo, d.icon.dataUrl.slice(0,40)); }
      else console.log("No icon for:", repo);
    } catch(e) { console.log("Icon error:", repo, e.message); }
  }));
  console.log("All icons:", Object.keys(icons));
}

iconFile.addEventListener("change", e => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.type !== "image/png") { alert("Only PNG"); return; }
  const r = new FileReader();
  r.onload = () => { customIcon = r.result; gameIcon.src = r.result; gameIcon.style.display = "block"; };
  r.readAsDataURL(f);
});

async function loadIcon(repo) {
  if (icons[repo]) { gameIcon.src = icons[repo]; gameIcon.style.display = "block"; return; }
  try {
    const res = await fetch(`${apiBase}/api/icon?game_repository=${encodeURIComponent(repo)}&game_ref=main`, { headers: op() });
    if (!res.ok) { gameIcon.style.display = "none"; return; }
    const d = await res.json();
    if (d.ok && d.icon?.dataUrl) { icons[repo] = d.icon.dataUrl; gameIcon.src = d.icon.dataUrl; gameIcon.style.display = "block"; }
    else gameIcon.style.display = "none";
  } catch { gameIcon.style.display = "none"; }
}

repoSelect.addEventListener("change", () => loadIcon(repoSelect.value));

newBuildBtn.addEventListener("click", () => {
  customIcon = null;
  modal.classList.remove("hidden");
  loadIcon(repoSelect.value);
});
cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });

form.addEventListener("submit", async e => {
  e.preventDefault();
  const fd = new FormData(form);
  const p = { game_repository: fd.get("game_repository"), app_name: fd.get("app_name"), package_name: fd.get("package_name"), build_format: fd.get("build_format"), iconDataUrl: customIcon || "" };
  modal.classList.add("hidden");
  try {
    const res = await fetch(`${apiBase}/api/build`, { method: "POST", headers: op(), body: JSON.stringify(p) });
    if (!res.ok) { alert("Error: " + await res.text().catch(() => "")); return; }
    const d = await res.json();
    if (d.run) { runs = [d.run, ...runs]; renderAll(); } else loadBuilds();
  } catch (err) { alert("Error: " + err.message); }
});

async function loadBuilds() {
  if (loading) loading.style.display = "block";
  try {
    const res = await fetch(`${apiBase}/api/runs`);
    if (!res.ok) { buildsContainer.innerHTML = "<p>No builds</p>"; return; }
    const d = await res.json();
    runs = Array.isArray(d.runs) ? d.runs : [];
    renderAll();
  } catch { buildsContainer.innerHTML = "<p>Load error</p>"; }
  finally { if (loading) loading.style.display = "none"; }
}

function renderAll() {
  const active = runs.filter(r => r.status !== "completed");
  const done = runs.filter(r => r.status === "completed" && r.conclusion === "success");
  const fail = runs.filter(r => r.status === "completed" && r.conclusion !== "success");
  activeContainer.innerHTML = active.length ? active.map(r => card(r)).join("") : "<p>No active builds</p>";
  buildsContainer.innerHTML = done.length || fail.length ? [...done, ...fail].slice(0, 30).map(r => card(r)).join("") : "<p>No completed builds</p>";
}

function card(r) {
  const name = r.displayTitle || r.name || "Build";
  const concl = r.conclusion || "";
  const st = r.status || "unknown";
  const created = r.createdAt ? new Date(r.createdAt).toLocaleString() : "";
  const url = r.htmlUrl || "#";
  const repo = repoFromTitle(name);
  const iconUrl = repo && icons[repo] ? icons[repo] : null;
  let label, cls;
  if (concl === "success") { label = "Ready"; cls = "status-success"; }
  else if (concl === "failure") { label = "Error"; cls = "status-failure"; }
  else if (["waiting","queued","pending"].includes(st)) { label = "Pending"; cls = "status-pending"; }
  else if (st === "completed") { label = "Error"; cls = "status-failure"; }
  else { label = st; cls = "status-pending"; }
  return `<div class="build-card">${iconUrl ? `<img class="card-icon" src="${iconUrl}" alt="">` : ""}<div class="info"><div class="app-name">${esc(name)}</div><div class="meta">${esc(created)}</div></div><div class="actions"><a href="${esc(url)}" target="_blank">Logs</a></div><span class="status ${cls}">${label}</span></div>`;
}

function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

(async () => {
  await preloadIcons();
  loadBuilds();
  setInterval(loadBuilds, 15000);
})();