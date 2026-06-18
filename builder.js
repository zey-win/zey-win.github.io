const apiBase = document.querySelector('meta[name="builder-api"]')?.content?.replace(/\/$/, "") || "https://zeywin-android-builder-api.vercel.app";
const operatorKey = document.querySelector('meta[name="builder-key"]')?.content?.trim() || "";
const operatorHeaders = () => operatorKey ? { "Content-Type": "application/json", "x-builder-key": operatorKey } : { "Content-Type": "application/json" };
const buildsContainer = document.getElementById("builds-container");
const activeContainer = document.getElementById("active-container");
const modal = document.getElementById("modal");
const form = document.getElementById("build-form");
const newBuildBtn = document.getElementById("new-build");
const cancelBtn = document.getElementById("modal-cancel");
const loading = document.getElementById("loading");

let localRuns = [];

// Modal
newBuildBtn.addEventListener("click", () => modal.classList.remove("hidden"));
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
    build_format: fd.get("build_format")
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
  let label, cls;
  if (concl === "success") { label = "✅ Готов"; cls = "status-success"; }
  else if (concl === "failure") { label = "❌ Ошибка"; cls = "status-failure"; }
  else if (["waiting","queued","pending"].includes(status)) { label = "⏳ В очереди"; cls = "status-pending"; }
  else if (status === "completed") { label = "❌ Ошибка"; cls = "status-failure"; }
  else { label = "🔄 " + status; cls = "status-pending"; }
  return `<div class="build-card">
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