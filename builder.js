const apiBase = document.querySelector('meta[name="builder-api"]')?.content?.replace(/\/$/, "") || "https://zeywin-android-builder-api.vercel.app";
const operatorKey = document.querySelector('meta[name="builder-key"]')?.content?.trim() || "";
const operatorHeaders = () => operatorKey ? { "Content-Type": "application/json", "x-builder-key": operatorKey } : { "Content-Type": "application/json" };
const repoSelect = document.getElementById("repo-select");
const gameIcon = document.getElementById("game-icon");
const iconCache = new Map();
const buildsContainer = document.getElementById("builds-container");
const activeContainer = document.getElementById("active-container");
const modal = document.getElementById("modal");
const form = document.getElementById("build-form");
const newBuildBtn = document.getElementById("new-build");
const cancelBtn = document.getElementById("modal-cancel");
const iconFile = document.getElementById("icon-file");
const loading = document.getElementById("loading");

let localRuns = [];
let customIconDataUrl = null;

// Repository list for icon lookup
const REPOS = ["zey-win/plinko","zey-win/blackjack","zey-win/roulette","zey-win/dragon-tiger","zey-win/baccarat-tiger","zey-win/wheel-of-fortune","zey-win/Unstopable","zey-win/SlotSpot"];

// Extract repo from displayTitle like "Android: Plinko / com.xxx / apk / builder-xxx"
function extractRepo(title) {
  const t = title || "";
  for (const r of REPOS) {
    const name = r.split("/")[1].toLowerCase();
    if (t.toLowerCase().includes(name)) return r;
  }
  return null;
}

// Custom icon upload
iconFile.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.type !== "image/png") { alert("Только PNG"); return; }
  const reader = new FileReader();
  reader.onload = () => {
    customIconDataUrl = reader.result;
    gameIcon.src = reader.result;
    gameIcon.style.display = "block";
  };
  reader.readAsDataURL(file);
});

// Load icon async and cache
async function loadIcon(repo) {
  if (iconCache.has(repo)) {
    gameIcon.src = iconCache.get(repo);
    gameIcon.style.display = "block";
    return;
  }
  const dataUrl = await fetchIcon(repo);
  if (dataUrl) {
    iconCache.set(repo, dataUrl);
    gameIcon.src = dataUrl;
    gameIcon.style.display = "block";
  } else {
    gameIcon.style.display = "none";
  }
}

async function fetchIcon(repo) {
  try {
    const res = await fetch(`${apiBase}/api/icon?game_repository=${encodeURIComponent(repo)}&game_ref=main`, {
      headers: operatorHeaders()
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.ok && data.icon?.dataUrl) return data.icon.dataUrl;
    return null;
  } catch {
    return null;
  }
}

repoSelect.addEventListener("change", () => loadIcon(repoSelect.value));

// Modal
newBuildBtn.addEventListener("click", () => {
  customIconDataUrl = null;
  modal.classList.remove("hidden");
  loadIcon(repoSelect.value);
});
cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });

// Create build
form.addEventListener("submit", async e => {
  e.preventDefault();
  const fd = new FormData(form);
  const payload = {
    game_repository: fd.get("game_repository"),
    app_name: fd.get("app_name"),
    package_name: fd.get("package_name"),
    build_format: fd.get("build_format"),
    iconDataUrl: customIconDataUrl || ""
  };
  modal.classList.add("hidden");
  try {
    const res = await fetch(`${apiBase}/api/build`, {
      method: "POST",
      headers: operatorHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "error");
      alert("Ошибка: " + txt);
      return;
    }
    const data = await res.json();
    if (data.run) {
      localRuns = [data.run, ...localRuns];
      renderAll();
    } else {
      loadBuilds();
    }
  } catch (err) {
    alert("Ошибка сети: " + err.message);
  }
});

// Load all
async function loadBuilds() {
  if (loading) loading.style.display = "block";
  try {
    const res = await fetch(`${apiBase}/api/runs`);
    if (!res.ok) { buildsContainer.innerHTML = "<p>Нет сборок</p>"; return; }
    const data = await res.json();
    localRuns = Array.isArray(data.runs) ? data.runs : [];
    // Hydrate icons for all runs in background
    for (const r of localRuns) {
      const repo = extractRepo(r.displayTitle || r.name);
      if (repo && !iconCache.has(repo)) {
        fetchIcon(repo).then(dataUrl => {
          if (dataUrl) iconCache.set(repo, dataUrl);
          renderAll();
        });
      }
    }
    renderAll();
  } catch {
    buildsContainer.innerHTML = "<p>Ошибка загрузки</p>";
  } finally {
    if (loading) loading.style.display = "none";
  }
}

function renderAll() {
  const active = localRuns.filter(r => r.status !== "completed");
  const completed = localRuns.filter(r => r.status === "completed" && r.conclusion === "success");
  const failed = localRuns.filter(r => r.status === "completed" && r.conclusion !== "success");

  activeContainer.innerHTML = active.length
    ? active.map(r => renderCard(r)).join("")
    : "<p>Нет активных сборок</p>";

  buildsContainer.innerHTML = completed.length || failed.length
    ? [...completed, ...failed].slice(0, 30).map(r => renderCard(r)).join("")
    : "<p>Нет завершённых сборок</p>";
}

function renderCard(r) {
  const name = r.displayTitle || r.name || "Сборка";
  const concl = r.conclusion || "";
  const status = r.status || "unknown";
  const created = r.createdAt ? new Date(r.createdAt).toLocaleString() : "";
  const url = r.htmlUrl || "#";
  const repo = extractRepo(name);
  const iconUrl = repo && iconCache.has(repo) ? iconCache.get(repo) : null;
  let label, cls;
  if (concl === "success") { label = "✅ Готов"; cls = "status-success"; }
  else if (concl === "failure") { label = "❌ Ошибка"; cls = "status-failure"; }
  else if (["waiting","queued","pending"].includes(status)) { label = "⏳ В очереди"; cls = "status-pending"; }
  else if (status === "completed") { label = "❌ Ошибка"; cls = "status-failure"; }
  else { label = "🔄 " + status; cls = "status-pending"; }
  return `<div class="build-card">
    ${iconUrl ? `<img class="card-icon" src="${esc(iconUrl)}" alt="">` : ""}
    <div class="info">
      <div class="app-name">${esc(name)}</div>
      <div class="meta">${esc(created)}</div>
    </div>
    <div class="actions">
      <a href="${esc(url)}" target="_blank">Логи →</a>
    </div>
    <span class="status ${cls}">${label}</span>
  </div>`;
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

loadBuilds();
setInterval(loadBuilds, 15000);