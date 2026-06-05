const shell = document.querySelector("#builder-shell");
const openButton = document.querySelector("#open-builder");
const closeButton = document.querySelector("#close-builder");
const form = document.querySelector("#build-form");
const repoSelect = document.querySelector("#game_repository");
const loadReposButton = document.querySelector("#load-repos");
const packageInput = document.querySelector("#package_name");
const versionModeInput = document.querySelector("#version_mode");
const versionNameInput = document.querySelector("#version_name");
const versionCodeInput = document.querySelector("#version_code");
const versionOptionsToggle = document.querySelector("#version-options-toggle");
const versionAdvanced = document.querySelector("#version-advanced");
const operatorInput = document.querySelector("#operator_key");
const iconTrigger = document.querySelector("#app-icon-trigger");
const iconEditor = document.querySelector("#icon-editor");
const pickIconButton = document.querySelector("#pick-icon");
const iconInput = document.querySelector("#icon_file");
const iconPreview = document.querySelector("#icon-preview");
const iconName = document.querySelector("#icon-name");
const payloadList = document.querySelector("#payload-list");
const timerRing = document.querySelector("#timer-ring");
const timerValue = document.querySelector("#timer-value");
const statusText = document.querySelector("#build-status");
const actionsLink = document.querySelector("#actions-link");
const artifactSignal = document.querySelector("#artifact-signal");
const buildToast = document.querySelector("#build-toast");
const buildToastIcon = document.querySelector("#build-toast-icon");
const buildToastTitle = document.querySelector("#build-toast-title");
const buildToastMeta = document.querySelector("#build-toast-meta");
const buildToastLog = document.querySelector("#build-toast-log");
const buildToastProgress = document.querySelector("#build-toast-progress");
const logShell = document.querySelector("#log-shell");
const closeLogsButton = document.querySelector("#close-logs");
const logMeta = document.querySelector("#log-meta");
const logOutput = document.querySelector("#log-output");
const consoleShell = document.querySelector("#build-console");
const consoleRail = document.querySelector(".console-rail");
const consoleMenuToggle = document.querySelector("#console-menu-toggle");
const consoleNewBuild = document.querySelector("#console-new-build");
const consoleOpenLogs = document.querySelector("#console-open-logs");
const consoleRefreshLogs = document.querySelector("#console-refresh-logs");
const consoleActionsLink = document.querySelector("#console-actions-link");
const consoleSummary = document.querySelector("#console-summary");
const consoleTitle = document.querySelector("#console-title");
const consoleRemaining = document.querySelector("#console-remaining");
const consoleProgress = document.querySelector("#console-progress");
const activeBuildList = document.querySelector("#active-build-list");
const consoleArtifact = document.querySelector("#console-artifact");
const consolePayloadList = document.querySelector("#console-payload-list");
const consoleLogMeta = document.querySelector("#console-log-meta");
const consoleLogOutput = document.querySelector("#console-log-output");
const consoleDownloads = document.querySelector("#console-downloads");
const consoleTabs = Array.from(document.querySelectorAll("[data-console-tab]"));
const consolePanels = Array.from(document.querySelectorAll("[data-console-panel]"));
const buildListTitle = document.querySelector("#build-list-title");
const buildListKicker = document.querySelector("#build-list-kicker");
const buildDetailTitle = document.querySelector("#build-detail-title");
const buildDetailKicker = document.querySelector("#build-detail-kicker");
const downloadList = document.querySelector("#download-list");
const apiBase = document.querySelector('meta[name="builder-api"]')?.content?.replace(/\/$/, "");
const configuredOperatorKey = document.querySelector('meta[name="builder-key"]')?.content?.trim() || "";
const operatorStorageKey = "zeywin_builder_operator_key";
const buildsStorageKey = "zeywin_builder_builds_v1";
const repositoryIconFallbacks = {
  "zey-win/plinko": "./repo-icons/zey-win__plinko.png?v=20260605"
};

let selectedIconDataUrl = "";
let repositoryIconDataUrl = "";
let repositoryIconLoadId = 0;
let logRefreshId = 0;
let versionLoadId = 0;
let payloadAnimationTimer = 0;
let builds = [];
let selectedBuildId = "";
let toastBuildId = "";
let detailOpen = false;

iconEditor.inert = true;
versionAdvanced.inert = true;

function readOperatorKeyFromLocation() {
  const search = new URLSearchParams(window.location.search);
  const hashText = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const hash = new URLSearchParams(hashText);
  return (
    search.get("operator_key") ||
    search.get("builder_key") ||
    hash.get("operator_key") ||
    hash.get("builder_key") ||
    ""
  ).trim();
}

function clearOperatorKeyFromLocation() {
  const url = new URL(window.location.href);
  let changed = false;
  ["operator_key", "builder_key"].forEach((key) => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  });

  const hash = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  ["operator_key", "builder_key"].forEach((key) => {
    if (hash.has(key)) {
      hash.delete(key);
      changed = true;
    }
  });
  const nextHash = hash.toString();
  url.hash = nextHash ? `#${nextHash}` : "";

  if (changed) {
    window.history.replaceState(null, "", url);
  }
}

function initOperatorKey() {
  const keyFromUrl = readOperatorKeyFromLocation();
  let storedKey = "";
  try {
    storedKey = localStorage.getItem(operatorStorageKey) || "";
  } catch {
    storedKey = "";
  }
  const key = keyFromUrl || configuredOperatorKey || storedKey;
  if (key) {
    operatorInput.value = key;
    try {
      localStorage.setItem(operatorStorageKey, key);
    } catch {
      // Local storage can be disabled in hardened browsers; hidden input still gets the URL key.
    }
  }
  if (keyFromUrl) {
    clearOperatorKeyFromLocation();
  }
}

function getBuildFormats() {
  return Array.from(document.querySelectorAll('input[name="build_format"]:checked'))
    .map((input) => input.value)
    .filter((value) => value === "apk" || value === "aab");
}

function getBuildFormat() {
  const formats = getBuildFormats();
  if (formats.includes("apk") && formats.includes("aab")) return "apk_aab";
  if (formats.includes("aab")) return "aab";
  return "apk";
}

function formatBuildFormat(value) {
  return value === "apk_aab" ? "APK+AAB" : String(value || "apk").toUpperCase();
}

function syncBuildMode() {
  const checked = getBuildFormats();
  if (checked.length === 0) {
    const apkInput = document.querySelector('input[name="build_format"][value="apk"]');
    if (apkInput) apkInput.checked = true;
  }

  const hasAab = getBuildFormats().includes("aab");
  versionModeInput.disabled = false;

  if (!hasAab) {
    versionModeInput.value = "auto_next";
    versionNameInput.value = "1";
    versionCodeInput.value = "1";
    syncVersionInputs();
    return;
  }

  if (versionModeInput.value !== "manual") {
    versionModeInput.value = "auto_next";
    loadLatestVersion();
  }
  syncVersionInputs();
}

function syncVersionInputs() {
  const isManual = versionModeInput.value === "manual";
  versionNameInput.readOnly = !isManual;
  versionCodeInput.readOnly = !isManual;
}

function toggleVersionAdvanced() {
  const isOpen = versionAdvanced.classList.toggle("is-open");
  versionAdvanced.setAttribute("aria-hidden", String(!isOpen));
  versionOptionsToggle.setAttribute("aria-expanded", String(isOpen));
  versionAdvanced.inert = !isOpen;
}

function setOriginFromButton(button) {
  const rect = button.getBoundingClientRect();
  shell.style.setProperty("--origin-x", `${rect.left + rect.width / 2}px`);
  shell.style.setProperty("--origin-y", `${rect.top + rect.height / 2}px`);
}

function openBuilder(sourceButton = openButton) {
  setOriginFromButton(sourceButton);
  shell.classList.add("is-open");
  shell.setAttribute("aria-hidden", "false");
  loadRepositoryIcon({ silent: true });
  setTimeout(() => document.querySelector("#game_repository")?.focus(), 420);
}

function closeBuilder({ restoreFocus = true } = {}) {
  shell.classList.remove("is-open");
  shell.setAttribute("aria-hidden", "true");
  if (restoreFocus) {
    (consoleShell.classList.contains("is-open") ? consoleNewBuild : openButton).focus();
  }
}

function setConsoleMenuOpen(isOpen) {
  if (!consoleRail || !consoleMenuToggle) return;
  consoleRail.classList.toggle("is-menu-open", isOpen);
  consoleMenuToggle.setAttribute("aria-expanded", String(isOpen));
  consoleMenuToggle.setAttribute("aria-label", isOpen ? "Закрыть меню" : "Открыть меню");
}

function showConsoleTab(tab = "console") {
  const normalized = ["console", "builds", "downloads", "logs"].includes(tab) ? tab : "console";
  consoleShell.dataset.tab = normalized;
  consoleShell.dataset.detail = detailOpen ? "open" : "closed";
  setConsoleMenuOpen(false);
  consoleTabs.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.consoleTab === normalized);
  });
  consolePanels.forEach((panel) => {
    const panelName = panel.dataset.consolePanel;
    const visible = normalized === "downloads"
      ? panelName === "downloads"
      : panelName === "builds";
    panel.hidden = !visible;
  });

  const titles = {
    console: ["Консоль", "Приложения в работе", "Список приложений"],
    builds: ["Сборки", "Все сборки", "Список сборок"],
    downloads: ["Загрузки", "Готовые файлы", "Загрузки"],
    logs: ["Логи Action", "GitHub Actions", "Логи выбранной сборки"]
  };
  const [title, kicker, listTitle] = titles[normalized];
  consoleTitle.textContent = title;
  if (buildListKicker) buildListKicker.textContent = kicker;
  if (buildListTitle) buildListTitle.textContent = listTitle;
  renderDownloadList();
}

function setDetailOpen(isOpen) {
  detailOpen = Boolean(isOpen);
  consoleShell.dataset.detail = detailOpen ? "open" : "closed";
}

function createBuild(payload) {
  return {
    id: payload.builder_request_id,
    requestId: payload.builder_request_id,
    runId: "",
    payload,
    packageName: payload.package_name,
    startVersionCode: payload.build_format === "apk" ? 1 : Number(payload.version_code || 0),
    startedAt: Date.now(),
    totalSeconds: 600,
    secondsLeft: 600,
    timerId: 0,
    logRefreshId: 0,
    artifactRefreshId: 0,
    actionUrl: "https://github.com/zey-win/ci-cd/actions",
    iconDataUrl: selectedIconDataUrl || repositoryIconDataUrl,
    state: "queued",
    meta: `${formatBuildFormat(payload.build_format)} · ожидаю GitHub Actions`,
    logLine: "Run ещё создаётся. Логи появятся автоматически.",
    logMeta: `Ищу workflow run: ${payload.builder_request_id}`,
    logOutput: "GitHub Actions ещё создаёт run. Как только run появится, здесь будут короткие живые логи.",
    artifactText: "APK/AAB ещё не готов",
    artifactReady: false,
    releaseUrl: "",
    artifactDownloads: []
  };
}

function safeStoredPayload(payload = {}) {
  const stored = { ...payload };
  stored.zeywin_api_key = "";
  stored.icon_png_base64 = "";
  return stored;
}

function safeStoredIcon(iconDataUrl = "") {
  const value = String(iconDataUrl || "");
  return value.startsWith("data:") ? "" : value;
}

function storedBuild(build) {
  return {
    id: build.id,
    requestId: build.requestId,
    runId: build.runId,
    payload: safeStoredPayload(build.payload),
    packageName: build.packageName,
    startVersionCode: build.startVersionCode,
    startedAt: build.startedAt,
    totalSeconds: build.totalSeconds,
    secondsLeft: build.secondsLeft,
    actionUrl: build.actionUrl,
    iconDataUrl: safeStoredIcon(build.iconDataUrl),
    state: build.state,
    meta: build.meta,
    logLine: build.logLine,
    logMeta: build.logMeta,
    logOutput: build.logOutput,
    artifactText: build.artifactText,
    artifactReady: build.artifactReady,
    releaseUrl: build.releaseUrl,
    artifactDownloads: build.artifactDownloads || []
  };
}

function persistBuilds() {
  try {
    localStorage.setItem(buildsStorageKey, JSON.stringify(builds.slice(0, 30).map(storedBuild)));
  } catch {
    // Build UI continues to work without persistent browser storage.
  }
}

function reviveBuild(raw) {
  const totalSeconds = Number(raw.totalSeconds || 600);
  const startedAt = Number(raw.startedAt || Date.now());
  const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const secondsLeft = raw.artifactReady || raw.state === "failed"
    ? Number(raw.secondsLeft || 0)
    : Math.max(0, totalSeconds - elapsed);
  return {
    ...raw,
    payload: safeStoredPayload(raw.payload || {}),
    packageName: raw.packageName || raw.payload?.package_name || "",
    startVersionCode: Number(raw.startVersionCode || raw.payload?.version_code || 1),
    startedAt,
    totalSeconds,
    secondsLeft,
    timerId: 0,
    logRefreshId: 0,
    artifactRefreshId: 0,
    artifactDownloads: Array.isArray(raw.artifactDownloads) ? raw.artifactDownloads : []
  };
}

function restoreBuilds() {
  let restored = [];
  try {
    restored = JSON.parse(localStorage.getItem(buildsStorageKey) || "[]");
  } catch {
    restored = [];
  }
  if (!Array.isArray(restored) || restored.length === 0) {
    renderBuildList();
    renderSelectedBuildDetails();
    return;
  }

  builds = restored.map(reviveBuild).filter((build) => build.id && build.payload);
  selectedBuildId = builds[0]?.id || "";
  persistBuilds();
  renderBuildList();
  renderSelectedBuildDetails();
  builds.forEach((build) => {
    if (!build.artifactReady && build.state !== "failed") {
      startBuildTimer(build, build.totalSeconds || 600, build.secondsLeft || build.totalSeconds || 600);
      startBuildLogPolling(build);
      startArtifactPolling(build);
    }
  });
  renderDownloadList();
}

function getSelectedBuild() {
  return builds.find((build) => build.id === selectedBuildId) || builds[0] || null;
}

function getBuild(id) {
  return builds.find((build) => build.id === id) || null;
}

function buildProgress(build) {
  if (!build) return 0;
  if (build.artifactReady) return 100;
  const total = Math.max(1, build.totalSeconds || 600);
  return Math.min(100, Math.max(4, ((total - build.secondsLeft) / total) * 100));
}

function formatSeconds(secondsLeft) {
  const minutes = Math.floor(Math.max(0, secondsLeft) / 60);
  const seconds = Math.max(0, secondsLeft) % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function openConsole(build = null, tab = "console", { openDetails = false } = {}) {
  if (shell.classList.contains("is-open")) {
    closeBuilder({ restoreFocus: false });
  }
  consoleShell.classList.add("is-open");
  consoleShell.setAttribute("aria-hidden", "false");
  const shouldOpenDetails = openDetails || tab === "logs";
  setDetailOpen(shouldOpenDetails);
  if (build?.id) {
    selectBuild(build.id, { openDetails: shouldOpenDetails });
  } else {
    renderBuildList();
    renderSelectedBuildDetails();
  }
  showConsoleTab(tab);
}

function renderConsolePayload(payload) {
  const visible = [
    ["Игра", payload.game_repository],
    ["Запрос", payload.builder_request_id],
    ["Package", payload.package_name],
    ["Название", payload.app_name],
    ["Формат", formatBuildFormat(payload.build_format)],
    ["Режим", payload.fast_build === "true" ? "ускоренный" : "полный"],
    ["AAB версия", `${payload.version_name || "auto"} / ${payload.version_code || "auto"}`],
    ["Иконка", payload.icon_png_path || "без подмены"]
  ];

  consolePayloadList.innerHTML = visible
    .map(([key, value]) => `
      <div class="console-payload-item">
        <span>${escapeHtml(key)}</span>
        <b>${escapeHtml(maskValue(key, String(value || "")))}</b>
      </div>
    `)
    .join("");
}

function renderBuildList() {
  if (!activeBuildList) return;
  if (builds.length === 0) {
    activeBuildList.innerHTML = '<p class="active-build-empty">После нажатия Билд здесь появятся параллельные сборки.</p>';
    renderDownloadList();
    return;
  }

  activeBuildList.innerHTML = builds
    .map((build, index) => {
      const stateClass = build.artifactReady
        ? "is-ready"
        : build.state === "failed"
          ? "is-failed"
          : build.state === "queued"
            ? "is-queued"
            : "is-running";
      const selectedClass = build.id === selectedBuildId ? "is-selected" : "";
      const progress = buildProgress(build).toFixed(2);
      const position = builds.length - index;
      const statusLabel = build.artifactReady
        ? "Готово"
        : build.state === "failed"
          ? "Ошибка"
          : build.state === "queued"
            ? "В ожидании"
            : "Работает";
      const timeLabel = build.artifactReady
        ? "файлы готовы"
        : build.state === "failed"
          ? "остановлено"
          : formatSeconds(build.secondsLeft);
      return `
        <button class="active-build ${stateClass} ${selectedClass}" type="button" data-build-id="${escapeHtml(build.id)}" aria-label="Открыть логи сборки ${escapeHtml(maskValue("request", build.requestId))}">
          <span class="active-build-icon" aria-hidden="true" style="${build.iconDataUrl ? `background-image: url('${build.iconDataUrl.replace(/'/g, "%27")}')` : ""}">
            <i></i>
          </span>
          <span class="active-build-body">
            <span class="active-build-main">
              <b>${escapeHtml(build.payload.app_name || "Android приложение")}</b>
              <span class="active-build-state">${escapeHtml(statusLabel)}</span>
            </span>
            <span class="active-build-kicker">${escapeHtml(build.payload.package_name || "package не указан")}</span>
            <span class="active-build-meta">
              <small>#${position} · ${escapeHtml(formatBuildFormat(build.payload.build_format))}</small>
              <small>${escapeHtml(timeLabel)}</small>
            </span>
            <span class="active-build-log">${escapeHtml(build.logLine)}</span>
            <span class="active-build-progress" aria-hidden="true"><span style="width: ${progress}%"></span></span>
          </span>
        </button>
      `;
    })
    .join("");
  renderDownloadList();
}

function updateConsoleSummary() {
  const active = builds.filter((build) => !build.artifactReady && build.state !== "failed").length;
  const ready = builds.filter((build) => build.artifactReady).length;
  const failed = builds.filter((build) => build.state === "failed").length;
  const parts = [`В работе: ${active}`, `готово: ${ready}`];
  if (failed) parts.push(`ошибок: ${failed}`);
  consoleSummary.textContent = builds.length ? parts.join(" · ") : "В работе: 0";
}

function renderSelectedBuildDetails() {
  const build = getSelectedBuild();
  if (!build) {
    consoleRemaining.textContent = "осталось 10:00";
    consoleProgress.style.width = "0%";
    consoleArtifact.classList.remove("is-ready");
    consoleArtifact.querySelector("b").textContent = "APK/AAB ещё не готов";
    if (buildDetailKicker) buildDetailKicker.textContent = "Логи";
    if (buildDetailTitle) buildDetailTitle.textContent = "Сборка в работе";
    renderArtifactDownloads(null);
    consolePayloadList.innerHTML = '<p>Payload появится после запуска сборки.</p>';
    consoleLogMeta.textContent = "Run ещё не создан.";
    consoleLogOutput.textContent = "Нажмите Билд, чтобы открыть поток логов.";
    consoleActionsLink.href = "https://github.com/zey-win/ci-cd/actions";
    updateConsoleSummary();
    return;
  }

  if (buildDetailKicker) {
    buildDetailKicker.textContent = "Логи";
  }
  if (buildDetailTitle) {
    buildDetailTitle.textContent = build.artifactReady ? "Сборка готова" : "Сборка в работе";
  }
  renderConsolePayload(build.payload);
  consoleArtifact.classList.toggle("is-ready", build.artifactReady);
  consoleArtifact.querySelector("b").textContent = build.artifactText;
  renderArtifactDownloads(build);
  consoleLogMeta.innerHTML = build.logMeta;
  consoleLogOutput.textContent = build.logOutput;
  consoleActionsLink.href = build.releaseUrl || build.actionUrl;
  if (actionsLink) {
    actionsLink.href = build.releaseUrl || build.actionUrl;
  }
  if (artifactSignal) {
    artifactSignal.classList.toggle("is-ready", build.artifactReady);
    artifactSignal.querySelector("b").textContent = build.artifactText;
  }
  const progress = buildProgress(build);
  const progressDegrees = Math.round((progress / 100) * 360);
  if (timerValue) {
    timerValue.textContent = formatSeconds(build.secondsLeft);
  }
  if (timerRing) {
    timerRing.style.setProperty("--progress", `${progressDegrees}deg`);
  }
  consoleProgress.style.width = `${progress.toFixed(2)}%`;
  consoleRemaining.textContent = build.artifactReady
    ? "выбранная сборка готова"
    : build.state === "failed"
      ? "выбранная сборка с ошибкой"
      : `выбрана: осталось ${formatSeconds(build.secondsLeft)}`;
  updateConsoleSummary();
}

function normalizeArtifactDownloads(artifact) {
  const links = [];
  const seen = new Set();

  function push(type, name, url) {
    if (!url) return;
    const label = type || "Файл";
    const filename = name || `${label.toLowerCase()}.android`;
    const key = `${label}|${filename}|${url}`;
    if (seen.has(key)) return;
    seen.add(key);
    links.push({ type: label, name: filename, url });
  }

  (artifact?.assets || []).forEach((asset) => push(asset.type, asset.name, asset.downloadUrl));
  push("APK", artifact?.apkAsset, artifact?.apkDownloadUrl);
  push("AAB", artifact?.aabAsset, artifact?.aabDownloadUrl);
  if (links.length === 0) {
    push(artifact?.type, artifact?.assetName, artifact?.downloadUrl);
  }

  return links;
}

function renderArtifactDownloads(build) {
  if (!consoleDownloads) return;
  const downloads = build?.artifactDownloads || [];
  consoleDownloads.hidden = downloads.length === 0;
  consoleDownloads.innerHTML = downloads
    .map((item) => `
      <a class="artifact-download" href="${escapeHtml(item.url)}" download="${escapeHtml(item.name)}" target="_blank" rel="noreferrer">
        Скачать ${escapeHtml(item.type)}
      </a>
    `)
    .join("");
}

function downloadButtonFor(build, type) {
  const wanted = String(type || "").toLowerCase();
  const item = (build.artifactDownloads || []).find((download) => {
    const haystack = `${download.type || ""} ${download.name || ""}`.toLowerCase();
    return haystack.includes(wanted);
  });
  if (!item) {
    return `<span class="download-missing">${escapeHtml(type)} не найден</span>`;
  }
  return `
    <a class="download-button" href="${escapeHtml(item.url)}" download="${escapeHtml(item.name)}" target="_blank" rel="noreferrer">
      Скачать ${escapeHtml(type)}
    </a>
  `;
}

function renderDownloadList() {
  if (!downloadList) return;
  const readyBuilds = builds.filter((build) => build.artifactReady && build.artifactDownloads?.length);
  if (readyBuilds.length === 0) {
    downloadList.innerHTML = '<p class="active-build-empty">Когда сборка закончит APK/AAB, здесь появятся свежие ссылки на скачивание.</p>';
    return;
  }

  downloadList.innerHTML = readyBuilds
    .map((build) => `
      <article class="download-row">
        <span class="download-icon" aria-hidden="true" style="${build.iconDataUrl ? `background-image: url('${build.iconDataUrl.replace(/'/g, "%27")}')` : ""}"></span>
        <span class="download-body">
          <b>${escapeHtml(build.payload.app_name || "Android приложение")}</b>
          <small>${escapeHtml(build.payload.package_name || "")}</small>
          <em>${escapeHtml(build.artifactText || "APK/AAB готов")}</em>
        </span>
        <span class="download-actions">
          ${downloadButtonFor(build, "APK")}
          ${downloadButtonFor(build, "AAB")}
        </span>
      </article>
    `)
    .join("");
}

function selectBuild(id, { openDetails = false } = {}) {
  selectedBuildId = id;
  setDetailOpen(openDetails);
  renderBuildList();
  renderSelectedBuildDetails();
  if (openDetails) {
    showConsoleTab("console");
  }
}

function updateBuildCard(build) {
  if (build.id === selectedBuildId) {
    renderSelectedBuildDetails();
  } else {
    updateConsoleSummary();
  }
  renderBuildList();
}

function setBuildLogState(build, meta, text) {
  build.logMeta = meta;
  build.logOutput = text;
  if (build.id === selectedBuildId) {
    consoleLogMeta.innerHTML = meta;
    consoleLogOutput.textContent = text;
  }
  persistBuilds();
}

function toggleIconEditor() {
  const isOpen = iconEditor.classList.toggle("is-open");
  iconEditor.setAttribute("aria-hidden", String(!isOpen));
  iconTrigger.setAttribute("aria-expanded", String(isOpen));
  iconEditor.inert = !isOpen;
}

function operatorHeaders() {
  const key = operatorInput?.value?.trim();
  return key ? { "x-builder-key": key } : {};
}

function friendlyError(message) {
  const text = String(message || "").trim();
  if (/operator key is invalid/i.test(text)) {
    return "Неверный ключ запуска backend.";
  }
  if (/operator key/i.test(text)) {
    return "Проверьте ключ запуска backend.";
  }
  return text || "Неизвестная ошибка.";
}

async function loadLatestVersion() {
  if (!getBuildFormats().includes("aab")) return;
  if (versionModeInput.value === "manual") return;
  if (!apiBase || !packageInput.value.trim()) return;
  if (apiBase.includes("zeywin-android-builder-api.vercel.app")) {
    statusText.textContent = "AAB auto version ждёт обновления backend. Сейчас используются текущие поля версии.";
    return;
  }

  const loadId = ++versionLoadId;
  try {
    const params = new URLSearchParams({ package_name: packageInput.value.trim() });
    const response = await fetch(`${apiBase}/api/versions?${params}`, {
      headers: operatorHeaders(),
      cache: "no-store"
    });
    const data = await response.json();
    if (loadId !== versionLoadId) return;
    if (!response.ok || !data.ok) {
      throw new Error(friendlyError(data.error || "Не удалось получить последнюю AAB версию."));
    }

    versionNameInput.value = data.aab?.versionName || "1.0.1";
    versionCodeInput.value = data.aab?.versionCode || "1";
    statusText.textContent = data.latest?.versionCode
      ? `AAB версия подставлена из Actions: ${versionNameInput.value} / ${versionCodeInput.value}.`
      : `Для этого package ещё нет истории. AAB начнётся с ${versionNameInput.value} / ${versionCodeInput.value}.`;
  } catch (error) {
    if (loadId !== versionLoadId) return;
    statusText.textContent = friendlyError(error.message);
  }
}

function maskValue(key, value) {
  if (!value) return "";
  if (/key|admob|id/i.test(key)) {
    return `${value.slice(0, 10)}...${value.slice(-5)}`;
  }
  return value;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function collectPayload() {
  const requestId = `builder-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const data = Object.fromEntries(new FormData(form).entries());
  delete data.icon_file;
  delete data.operator_key;
  return {
    builder_request_id: requestId,
    game_repository: data.game_repository || "zey-win/plinko",
    game_ref: data.game_ref || "main",
    package_name: data.package_name || "com.playsocialgames.plinkofun",
    app_name: data.app_name || "Plinko Real Money",
    icon_png_path: selectedIconDataUrl ? "Assets/ZeyWin/IconOverride/android-icon.png" : "",
    icon_png_base64: selectedIconDataUrl,
    zeywin_api_key: data.zeywin_api_key || "",
    version_mode: data.version_mode || "auto_next",
    version_name: data.version_name || "",
    version_code: data.version_code || "",
    build_format: getBuildFormat(),
    fast_build: data.fast_build === "on" ? "true" : "false",
    publish_to_google_play: "false",
    google_play_track: "production",
    google_play_status: "completed",
    require_google_play_upload: "false",
    admob_android_app_id: data.admob_android_app_id || "",
    admob_android_banner_id: data.admob_android_banner_id || "",
    admob_android_interstitial_id: data.admob_android_interstitial_id || "",
    admob_android_rewarded_id: data.admob_android_rewarded_id || "",
    admob_android_rewarded_interstitial_id: "",
    admob_android_native_id: "",
    admob_android_app_open_id: ""
  };
}

function renderPayload(payload) {
  if (!payloadList) return;
  const visible = [
    ["game_repository", payload.game_repository],
    ["builder_request_id", payload.builder_request_id],
    ["game_ref", payload.game_ref],
    ["package_name", payload.package_name],
    ["app_name", payload.app_name],
    ["icon_png_path", payload.icon_png_path || "без подмены"],
    ["version_mode", payload.version_mode],
    ["version_name", payload.version_name || "auto"],
    ["version_code", payload.version_code || "auto"],
    ["fast_build", payload.fast_build === "true" ? "ускоренный" : "полный"],
    ["zeywin_api_key", payload.zeywin_api_key],
    ["admob_android_app_id", payload.admob_android_app_id],
    ["admob_android_banner_id", payload.admob_android_banner_id],
    ["admob_android_interstitial_id", payload.admob_android_interstitial_id],
    ["admob_android_rewarded_id", payload.admob_android_rewarded_id],
    ["build_format", payload.build_format]
  ];

  payloadList.classList.remove("is-sending");
  clearTimeout(payloadAnimationTimer);
  payloadList.innerHTML = visible
    .map(([key, value]) => `
      <div class="payload-item">
        <span>${key}</span>
        <b>${maskValue(key, String(value || ""))}</b>
      </div>
    `)
    .join("");

  requestAnimationFrame(() => {
    payloadList.classList.add("is-sending");
    payloadAnimationTimer = setTimeout(() => payloadList.classList.remove("is-sending"), 920);
  });
}

function setBuildTimer(build, secondsLeft) {
  build.secondsLeft = secondsLeft;
  const totalSeconds = build.totalSeconds || 600;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  if (timerValue && build.id === selectedBuildId) {
    timerValue.textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
  }
  const progress = Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 360);
  if (timerRing && build.id === selectedBuildId) {
    timerRing.style.setProperty("--progress", `${progress}deg`);
  }
  const percent = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const progressWidth = `${secondsLeft === 0 ? 100 : Math.max(4, percent).toFixed(2)}%`;
  if (build.id === toastBuildId) {
    buildToastProgress.style.width = progressWidth;
  }
  updateBuildCard(build);
}

function startBuildTimer(build, totalSeconds = 600, initialSeconds = totalSeconds) {
  clearInterval(build.timerId);
  build.totalSeconds = totalSeconds;
  let left = Math.max(0, Math.min(totalSeconds, Number(initialSeconds || totalSeconds)));
  setBuildTimer(build, left);
  build.timerId = setInterval(() => {
    left = Math.max(0, left - 1);
    setBuildTimer(build, left);
    if (left === 0) {
      clearInterval(build.timerId);
    }
  }, 1000);
}

function showBuildToast(build) {
  toastBuildId = build.id;
  buildToastTitle.textContent = build.payload.app_name || "Сборка Android";
  buildToastMeta.textContent = build.meta;
  buildToastLog.textContent = build.logLine;
  buildToastProgress.style.width = "4%";
  buildToastIcon.style.backgroundImage = build.iconDataUrl ? `url("${build.iconDataUrl}")` : "";
  buildToast.classList.add("is-visible");
}

function updateBuildToast(build, meta, logLine = "") {
  build.meta = meta;
  if (logLine) {
    build.logLine = logLine;
  }
  persistBuilds();
  if (build.id !== toastBuildId) {
    updateBuildCard(build);
    return;
  }
  buildToastMeta.textContent = meta;
  if (logLine) {
    buildToastLog.textContent = logLine;
  }
  updateBuildCard(build);
}

function lastUsefulLogLine(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^=+$/.test(line))
    .slice(-1)[0] || "";
}

function shortLogFromJobs(data) {
  const jobs = data.jobs || [];
  const activeJob = jobs.find((job) => job.status === "in_progress") || jobs.find((job) => job.status === "queued") || jobs[jobs.length - 1];
  if (!activeJob) {
    return "Jobs ещё не появились.";
  }

  const line = lastUsefulLogLine(activeJob.logTail);
  return line ? `${activeJob.name}: ${line}` : `${activeJob.name}: ${activeJob.status || "ожидает"}`;
}

async function fetchRunLogs(build) {
  const runId = await findRun(build);
  if (!runId) {
    return { run: null, jobs: [] };
  }

  const response = await fetch(`${apiBase}/api/logs?run_id=${encodeURIComponent(runId)}`, {
    headers: operatorHeaders(),
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(friendlyError(data.error || "Не удалось загрузить логи."));
  }
  return data;
}

function startBuildLogPolling(build) {
  clearInterval(build.logRefreshId);
  refreshBuildLogs(build);
  build.logRefreshId = setInterval(() => refreshBuildLogs(build), 7000);
}

async function refreshBuildLogs(build) {
  if (!build?.requestId) return;

  try {
    const data = await fetchRunLogs(build);
    if (!data.run) {
      const seconds = Math.max(1, Math.round((Date.now() - build.startedAt) / 1000));
      updateBuildToast(build, `ищу workflow run · ${seconds}s`, "GitHub Actions ещё создаёт run.");
      setBuildLogState(
        build,
        `Ищу workflow run: ${build.requestId}`,
        "GitHub Actions ещё создаёт run. Обновляю автоматически..."
      );
      return;
    }

    const state = data.run.conclusion || data.run.status || "unknown";
    const shortLog = shortLogFromJobs(data);
    if (!build.artifactReady) {
      build.state = data.run.status === "completed" ? "artifact_wait" : "running";
    }
    updateBuildToast(build, `Run #${data.run.runNumber} · ${state}`, shortLog);
    setBuildLogState(
      build,
      `<a href="${data.run.htmlUrl}" target="_blank" rel="noreferrer">Run #${data.run.runNumber}</a> · ${data.run.status || "unknown"}${data.run.conclusion ? ` · ${data.run.conclusion}` : ""}`,
      (data.jobs || [])
        .map((job) => {
          return [
            `===== ${job.name} · ${job.status}${job.conclusion ? ` · ${job.conclusion}` : ""} =====`,
            job.logTail || "Лог пока пуст."
          ].join("\n");
        })
        .join("\n\n") || shortLog
    );
    if (data.run.status === "completed") {
      clearInterval(build.logRefreshId);
      if (data.run.conclusion && data.run.conclusion !== "success") {
        build.state = "failed";
        updateBuildCard(build);
      } else if (!build.artifactReady) {
        build.state = "artifact_wait";
        updateBuildCard(build);
      }
    }
  } catch (error) {
    const message = friendlyError(error.message);
    updateBuildToast(build, "Ошибка логов", message);
    setBuildLogState(build, "Ошибка логов", message);
  }
}

async function readIcon(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function iconBackgroundStyle(dataUrl) {
  return `url("${String(dataUrl || "").replace(/"/g, "%22")}")`;
}

function setIconPreview(dataUrl, label) {
  if (!dataUrl) {
    iconPreview.style.backgroundImage = "";
    iconPreview.classList.remove("has-image");
    iconTrigger.setAttribute("aria-label", "Настроить иконку приложения");
    iconName.textContent = label || "Иконка репозитория не найдена. Нажмите, чтобы выбрать PNG.";
    return;
  }

  iconPreview.style.backgroundImage = iconBackgroundStyle(dataUrl);
  iconPreview.classList.add("has-image");
  iconTrigger.setAttribute("aria-label", label || "Иконка приложения загружена. Нажмите, чтобы изменить.");
}

function publicRawIconCandidates(repo, ref) {
  const encodedRepo = repo.split("/").map(encodeURIComponent).join("/");
  const encodedRef = encodeURIComponent(ref || "main");
  const paths = [
    "Assets/ZeyWin/IconOverride/android-icon.png",
    "Assets/Sprites/Icon.png",
    "Assets/AppIcon.png",
    "Assets/LauncherIcon.png",
    "Assets/Icons/AppIcon.png",
    "Assets/Resources/AppIcon.png"
  ];

  return paths.map((path) => ({
    path,
    url: `https://raw.githubusercontent.com/${encodedRepo}/${encodedRef}/${path.split("/").map(encodeURIComponent).join("/")}`
  }));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function loadPublicRepositoryIcon(repo, ref) {
  for (const candidate of publicRawIconCandidates(repo, ref)) {
    try {
      const response = await fetch(candidate.url, { cache: "no-store" });
      if (!response.ok) continue;
      const blob = await response.blob();
      if (blob.type && blob.type !== "image/png") continue;
      const dataUrl = await blobToDataUrl(blob);
      if (dataUrl.startsWith("data:image/png")) {
        return { path: candidate.path, dataUrl, source: "raw" };
      }
    } catch {
      // Public raw fallback is best-effort only; private repos are loaded through backend.
    }
  }
  return null;
}

function loadLocalRepositoryIcon(repo) {
  const url = repositoryIconFallbacks[repo];
  return url ? { path: "Assets/Sprites/Icon.png", dataUrl: url, source: "pages-fallback" } : null;
}

async function loadRepositoryIcon({ silent = false } = {}) {
  const repo = repoSelect.value.trim();
  const ref = document.querySelector("#game_ref")?.value?.trim() || "main";
  const loadId = ++repositoryIconLoadId;
  selectedIconDataUrl = "";
  repositoryIconDataUrl = "";
  iconInput.value = "";
  iconPreview.classList.add("is-loading");
  setIconPreview("", "Ищу иконку в выбранном GitHub репозитории...");
  iconName.textContent = "Ищу иконку в выбранном GitHub репозитории...";
  if (!silent) {
    statusText.textContent = "Загружаю иконку приложения из GitHub...";
  }

  try {
    let icon = loadLocalRepositoryIcon(repo);
    let backendAuthError = "";
    let backendError = "";
    if (!icon && apiBase) {
      const params = new URLSearchParams({
        game_repository: repo,
        game_ref: ref
      });
      try {
        const response = await fetch(`${apiBase}/api/icon?${params}`, {
          headers: operatorHeaders(),
          cache: "no-store"
        });
        const data = await response.json();
        if (response.ok && data.ok && data.icon?.dataUrl) {
          icon = data.icon;
        } else if (!response.ok && response.status === 401) {
          backendAuthError = friendlyError(data.error || "Проверьте ключ запуска backend.");
        } else if (!response.ok && response.status !== 404) {
          backendError = friendlyError(data.error || "Не удалось загрузить иконку репозитория.");
        }
      } catch (error) {
        backendError = friendlyError(error.message);
      }
    }

    if (!icon) {
      icon = await loadPublicRepositoryIcon(repo, ref);
    }

    if (loadId !== repositoryIconLoadId) return;
    iconPreview.classList.remove("is-loading");

    if (icon?.dataUrl) {
      repositoryIconDataUrl = icon.dataUrl;
      setIconPreview(repositoryIconDataUrl, `Иконка из ${repo}: ${icon.path}. Нажмите, чтобы заменить PNG.`);
      iconName.textContent = `Иконка из ${repo}: ${icon.path}. Нажмите, чтобы заменить PNG.`;
      if (!silent) {
        statusText.textContent = "Иконка приложения загружена из выбранного репозитория.";
      }
      return;
    }

    if (backendAuthError) {
      throw new Error(backendAuthError);
    }

    if (backendError) {
      throw new Error(backendError);
    }

    setIconPreview("", "Иконка репозитория не найдена. Нажмите, чтобы выбрать PNG.");
    if (!silent) {
      statusText.textContent = "Иконка в репозитории не найдена. Можно выбрать PNG вручную.";
    }
  } catch (error) {
    if (loadId !== repositoryIconLoadId) return;
    iconPreview.classList.remove("is-loading");
    setIconPreview("", "Не удалось загрузить иконку репозитория. Нажмите, чтобы выбрать PNG.");
    iconName.textContent = friendlyError(error.message);
    if (!silent) {
      statusText.textContent = friendlyError(error.message);
    }
  }
}

async function loadRepos() {
  statusText.textContent = "Загружаю список репозиториев...";
  try {
    const response = await fetch(`${apiBase}/api/repos`, {
      headers: operatorHeaders(),
      cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(friendlyError(data.error || "Не удалось получить репозитории."));
    }

    const currentRepo = repoSelect.value;
    repoSelect.innerHTML = data.repos
      .map((repo) => `<option value="${repo.fullName}">${repo.fullName}</option>`)
      .join("");
    if (currentRepo && [...repoSelect.options].some((option) => option.value === currentRepo)) {
      repoSelect.value = currentRepo;
    }
    statusText.textContent = "Список игр обновлён.";
    loadRepositoryIcon();
  } catch (error) {
    statusText.textContent = friendlyError(error.message);
  }
}

async function submitBuild(event) {
  event.preventDefault();
  const payload = collectPayload();
  const build = createBuild(payload);
  builds = [build, ...builds];
  selectedBuildId = build.id;
  persistBuilds();
  renderPayload(payload);
  openConsole(build);
  showBuildToast(build);
  startBuildTimer(build, 600);
  startBuildLogPolling(build);
  setArtifactSignal(build, false, "APK/AAB ещё не готов");
  statusText.textContent = "Payload ушёл в backend. Жду GitHub Actions...";

  try {
    const response = await fetch(`${apiBase}/api/build`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...operatorHeaders()
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(friendlyError(data.error || "Backend не запустил сборку."));
    }

    build.actionUrl = data.workflow?.workflowUrl || "https://github.com/zey-win/ci-cd/actions";
    if (actionsLink) {
      actionsLink.href = build.actionUrl;
    }
    build.requestId = data.requestId || build.requestId;
    build.runId = data.run?.id ? String(data.run.id) : "";
    if (data.run?.htmlUrl) {
      build.actionUrl = data.run.htmlUrl;
      if (actionsLink) {
        actionsLink.href = data.run.htmlUrl;
      }
    }
    if (data.latestArtifact?.versionCode && !build.startVersionCode) {
      build.startVersionCode = Number(data.latestArtifact.versionCode) + 1;
    }
    startArtifactPolling(build);
    startBuildLogPolling(build);
    statusText.textContent = data.icon?.path
      ? `Иконка записана, сборка отправлена в Actions. Нажмите на круг, чтобы смотреть логи.`
      : `Сборка отправлена в Actions. Нажмите на круг, чтобы смотреть логи.`;
    updateBuildToast(
      build,
      build.runId ? `Run найден · ${formatBuildFormat(payload.build_format)}` : `${formatBuildFormat(payload.build_format)} · Actions запущен`,
      data.icon?.path ? "Иконка записана, сборка отправлена в GitHub Actions." : "Сборка отправлена в GitHub Actions."
    );
  } catch (error) {
    statusText.textContent = friendlyError(error.message);
    build.state = "failed";
    updateBuildToast(build, "Ошибка запуска", friendlyError(error.message));
    setBuildLogState(build, "Backend не запустил сборку", friendlyError(error.message));
    updateBuildCard(build);
  }
}

function setArtifactSignal(build, ready, text, url = "", downloads = []) {
  build.artifactReady = ready;
  build.artifactText = text;
  build.artifactDownloads = ready ? downloads : [];
  if (ready) {
    build.state = "ready";
    build.releaseUrl = url || build.releaseUrl;
  }
  if (build.id === selectedBuildId) {
    if (artifactSignal) {
      artifactSignal.classList.toggle("is-ready", ready);
      artifactSignal.querySelector("b").textContent = text;
    }
    consoleArtifact.classList.toggle("is-ready", ready);
    consoleArtifact.querySelector("b").textContent = text;
    renderArtifactDownloads(build);
    if (url) {
      consoleActionsLink.href = url;
    }
  }
  if (url) {
    if (actionsLink) {
      actionsLink.href = url;
    }
  }
  persistBuilds();
  renderDownloadList();
  updateBuildCard(build);
}

function startArtifactPolling(build) {
  clearInterval(build.artifactRefreshId);
  pollArtifact(build);
  build.artifactRefreshId = setInterval(() => pollArtifact(build), 15000);
}

async function pollArtifact(build) {
  if (!build?.packageName) return;

  try {
    const params = new URLSearchParams({
      package_name: build.packageName,
      min_version_code: String(Math.max(1, build.startVersionCode || 1)),
      builder_request_id: build.requestId || build.id || ""
    });
    const response = await fetch(`${apiBase}/api/artifacts?${params}`, {
      headers: operatorHeaders(),
      cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(friendlyError(data.error || "Не удалось проверить APK/AAB."));
    }
    if (data.ready && data.artifact) {
      clearInterval(build.artifactRefreshId);
      const label = `${data.artifact.type} готов: v${data.artifact.versionCode}`;
      const downloads = normalizeArtifactDownloads(data.artifact);
      setArtifactSignal(build, true, label, data.artifact.releaseUrl, downloads);
      updateBuildToast(build, label, downloads.length ? "Готово. Ссылки APK/AAB доступны в консоли." : "Готово. Нажмите, чтобы открыть подробности сборки.");
      statusText.textContent = downloads.length ? `${label}. Можно скачать файлы APK/AAB.` : `${label}. Можно открыть GitHub Release.`;
    }
  } catch (error) {
    setArtifactSignal(build, false, friendlyError(error.message));
  }
}

function openLogs(buildId = selectedBuildId) {
  if (buildId) {
    selectedBuildId = buildId;
    renderBuildList();
    renderSelectedBuildDetails();
  }
  openConsole(getSelectedBuild(), "logs");
  const build = getSelectedBuild();
  if (build) {
    refreshBuildLogs(build);
  }
  clearInterval(logRefreshId);
  logRefreshId = setInterval(() => {
    const selected = getSelectedBuild();
    if (selected) {
      refreshBuildLogs(selected);
    }
  }, 8000);
}

function closeLogs() {
  logShell.classList.remove("is-open");
  logShell.setAttribute("aria-hidden", "true");
  clearInterval(logRefreshId);
  showConsoleTab("console");
}

async function findRun(build) {
  if (build.runId || !build.requestId) return build.runId;
  const response = await fetch(`${apiBase}/api/runs?request_id=${encodeURIComponent(build.requestId)}`, {
    headers: operatorHeaders(),
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(friendlyError(data.error || "Не удалось найти Action run."));
  }
  if (data.run?.id) {
    build.runId = String(data.run.id);
    build.actionUrl = data.run.htmlUrl;
    if (actionsLink) {
      actionsLink.href = data.run.htmlUrl;
    }
    if (build.id === selectedBuildId) {
      consoleActionsLink.href = data.run.htmlUrl;
    }
    persistBuilds();
  }
  return build.runId;
}

async function refreshLogs() {
  const build = getSelectedBuild();
  try {
    if (!build) {
      logMeta.textContent = "Сначала нажмите Билд.";
      logOutput.textContent = "Run ещё не создан.";
      return;
    }

    logMeta.textContent = `Ищу workflow run: ${build.requestId}`;
    const data = await fetchRunLogs(build);
    if (!data.run) {
      logOutput.textContent = "GitHub Actions ещё создаёт run. Обновляю автоматически...";
      return;
    }

    logMeta.innerHTML = `
      <a href="${data.run.htmlUrl}" target="_blank" rel="noreferrer">Run #${data.run.runNumber}</a>
      · ${data.run.status || "unknown"}
      ${data.run.conclusion ? `· ${data.run.conclusion}` : ""}
    `;
    const output = (data.jobs || [])
      .map((job) => {
        return [
          `===== ${job.name} · ${job.status}${job.conclusion ? ` · ${job.conclusion}` : ""} =====`,
          job.logTail || "Лог пока пуст."
        ].join("\n");
      })
      .join("\n\n");
    logOutput.textContent = output;
    build.logMeta = logMeta.innerHTML;
    build.logOutput = output;
    persistBuilds();
    updateBuildCard(build);
  } catch (error) {
    logMeta.textContent = "Ошибка логов";
    logOutput.textContent = friendlyError(error.message);
  }
}

openButton.addEventListener("click", () => openConsole(null, "console"));
closeButton.addEventListener("click", () => {
  closeBuilder({ restoreFocus: !consoleShell.classList.contains("is-open") });
});
loadReposButton.addEventListener("click", loadRepos);
repoSelect.addEventListener("change", () => {
  loadLatestVersion();
  loadRepositoryIcon();
});
form.addEventListener("submit", submitBuild);
iconTrigger.addEventListener("click", toggleIconEditor);
versionOptionsToggle.addEventListener("click", toggleVersionAdvanced);
versionModeInput.addEventListener("change", () => {
  syncVersionInputs();
  if (versionModeInput.value === "auto_next") {
    loadLatestVersion();
  }
});
pickIconButton.addEventListener("click", () => iconInput.click());
if (timerRing) {
  timerRing.addEventListener("click", () => openLogs(selectedBuildId));
}
buildToast.addEventListener("click", () => {
  const build = getBuild(toastBuildId) || getSelectedBuild();
  openConsole(build, "console");
});
activeBuildList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-build-id]");
  if (!card) return;
  selectBuild(card.dataset.buildId, { openDetails: true });
});
consoleTabs.forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.consoleTab;
    if (tab === "logs") {
      openLogs(selectedBuildId);
      return;
    }
    showConsoleTab(tab);
  });
});
consoleMenuToggle.addEventListener("click", () => {
  const isOpen = consoleRail.classList.contains("is-menu-open");
  setConsoleMenuOpen(!isOpen);
});
consoleRefreshLogs.addEventListener("click", () => {
  const build = getSelectedBuild();
  if (build) {
    refreshBuildLogs(build);
  }
  refreshLogs();
});
consoleNewBuild.addEventListener("click", () => openBuilder(consoleNewBuild));
closeLogsButton.addEventListener("click", closeLogs);
document.querySelectorAll('input[name="build_format"]').forEach((input) => {
  input.addEventListener("change", syncBuildMode);
});
packageInput.addEventListener("change", loadLatestVersion);
operatorInput.addEventListener("change", loadLatestVersion);
operatorInput.addEventListener("blur", loadLatestVersion);
initOperatorKey();
syncBuildMode();
restoreBuilds();

iconInput.addEventListener("change", async () => {
  const file = iconInput.files?.[0];
  if (!file) return;
  if (file.type !== "image/png") {
    statusText.textContent = "Нужен PNG файл.";
    iconInput.value = "";
    return;
  }
  selectedIconDataUrl = await readIcon(file);
  repositoryIconDataUrl = "";
  iconPreview.classList.remove("is-loading");
  setIconPreview(selectedIconDataUrl, `Иконка выбрана: ${file.name}. Нажмите, чтобы изменить.`);
  iconName.textContent = `${file.name} → Assets/ZeyWin/IconOverride/android-icon.png`;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && shell.classList.contains("is-open")) {
    if (logShell.classList.contains("is-open")) {
      closeLogs();
    } else {
      closeBuilder({ restoreFocus: !consoleShell.classList.contains("is-open") });
    }
  }
});
