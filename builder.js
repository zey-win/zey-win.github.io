const apiBase = document.querySelector('meta[name="builder-api"]')?.content?.replace(/\/$/, "") || "https://zeywin-android-builder-api.vercel.app";
const buildsContainer = document.getElementById("builds-container");
const activeContainer = document.getElementById("active-container");
const modal = document.getElementById("modal");
const form = document.getElementById("build-form");
const newBuildBtn = document.getElementById("new-build");
const cancelBtn = document.getElementById("modal-cancel");
const ciCdRunsUrl = "https://api.github.com/repos/zey-win/ci-cd/actions/runs?event=workflow_dispatch&per_page=30";
const idleLabels = ["waiting", "queued", "requested", "pending", "neutral"];

// --- Modal ---
newBuildBtn.addEventListener("click", () => modal.classList.remove("hidden"));
cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });

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
    const res = await fetch(`${apiBase}/api/create-build`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      alert("Ошибка: " + txt);
      return;
    }
    loadBuilds();
  } catch (err) {
    alert("Ошибка сети: " + err.message);
  }
});

// --- Load builds ---
async function loadBuilds() {
  await Promise.all([loadReadyBuilds(), loadActiveRuns()]);
}

async function loadReadyBuilds() {
  try {
    const res = await fetch(`${apiBase}/api/builds`);
    if (!res.ok) { buildsContainer.innerHTML = "<p>Нет готовых сборок</p>"; return; }
    const data = await res.json();
    const builds = Array.isArray(data) ? data : data.builds || [];
    if (!builds.length) { buildsContainer.innerHTML = "<p>Нет готовых сборок</p>"; return; }
    buildsContainer.innerHTML = builds.map(b => renderBuildCard(b)).join("");
  } catch {
    buildsContainer.innerHTML = "<p>Ошибка загрузки</p>";
  }
}

async function loadActiveRuns() {
  try {
    const res = await fetch(ciCdRunsUrl);
    if (!res.ok) { activeContainer.innerHTML = ""; return; }
    const data = await res.json();
    const runs = (data.workflow_runs || []).filter(r => r.status !== "completed");
    if (!runs.length) { activeContainer.innerHTML = "<p>Нет активных сборок</p>"; return; }
    activeContainer.innerHTML = runs.map(r => renderRunCard(r)).join("");
  } catch {
    activeContainer.innerHTML = "";
  }
}

function renderBuildCard(b) {
  const name = b.payload?.app_name || b.app_name || "App";
  const ver = b.payload?.version_name || b.version_name || "?";
  const fmt = b.payload?.build_format || b.build_format || "apk";
  const status = b.status || "completed";
  const cls = status === "completed" || status === "success" ? "status-success" : status === "failure" || status === "error" ? "status-failure" : "status-pending";
  const label = status === "completed" || status === "success" ? "✅ Готов" : status === "failure" || status === "error" ? "❌ Ошибка" : "⏳";
  // download URL
  const apkUrl = b.payload?.download_url_apk || b.download_url_apk || "#";
  const aabUrl = b.payload?.download_url_aab || b.download_url_aab || "#";
  const hasApk = apkUrl && apkUrl !== "#";
  const hasAab = aabUrl && aabUrl !== "#";
  return `<div class="build-card">
    <div class="info">
      <div class="app-name">${esc(name)}</div>
      <div class="meta">v${esc(ver)} · ${fmt.toUpperCase()} · ${esc(b.id || "")}</div>
    </div>
    <div class="actions">
      ${hasApk ? `<a href="${esc(apkUrl)}" download>APK</a>` : ""}
      ${hasAab ? `<a href="${esc(aabUrl)}" download>AAB</a>` : ""}
    </div>
    <span class="status ${cls}">${label}</span>
  </div>`;
}

function renderRunCard(r) {
  const status = r.status || "unknown";
  const conclusion = r.conclusion || "";
  const name = r.display_title || r.name || "Сборка";
  const createdAt = r.created_at ? new Date(r.created_at).toLocaleString() : "";
  let statusLabel, cls;
  if (conclusion === "success") { statusLabel = "✅ Готов"; cls = "status-success"; }
  else if (conclusion === "failure") { statusLabel = "❌ Ошибка"; cls = "status-failure"; }
  else if (idleLabels.includes(status)) { statusLabel = "⏳ В очереди"; cls = "status-pending"; }
  else { statusLabel = "🔄 " + status; cls = "status-pending"; }
  const url = r.html_url || "#";
  return `<div class="build-card">
    <div class="info">
      <div class="app-name">${esc(name)}</div>
      <div class="meta">${esc(createdAt)}</div>
    </div>
    <div class="actions">
      <a href="${esc(url)}" target="_blank">Логи</a>
    </div>
    <span class="status ${cls}">${statusLabel}</span>
  </div>`;
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

loadBuilds();
setInterval(loadBuilds, 15000);