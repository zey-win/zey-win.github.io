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
const logShell = document.querySelector("#log-shell");
const closeLogsButton = document.querySelector("#close-logs");
const logMeta = document.querySelector("#log-meta");
const logOutput = document.querySelector("#log-output");
const apiBase = document.querySelector('meta[name="builder-api"]')?.content?.replace(/\/$/, "");

let selectedIconDataUrl = "";
let timerId = 0;
let logRefreshId = 0;
let artifactRefreshId = 0;
let currentRequestId = "";
let currentRunId = "";
let currentPackageName = "";
let startVersionCode = 0;
let versionLoadId = 0;

iconEditor.inert = true;

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

function syncBuildMode() {
  const checked = getBuildFormats();
  if (checked.length === 0) {
    const apkInput = document.querySelector('input[name="build_format"][value="apk"]');
    if (apkInput) apkInput.checked = true;
  }

  const hasAab = getBuildFormats().includes("aab");
  versionModeInput.value = "manual";
  versionModeInput.disabled = true;

  if (!hasAab) {
    versionNameInput.value = "1";
    versionCodeInput.value = "1";
    versionNameInput.readOnly = true;
    versionCodeInput.readOnly = true;
    return;
  }

  versionNameInput.readOnly = false;
  versionCodeInput.readOnly = false;
  loadLatestVersion();
}

function setOriginFromButton(button) {
  const rect = button.getBoundingClientRect();
  shell.style.setProperty("--origin-x", `${rect.left + rect.width / 2}px`);
  shell.style.setProperty("--origin-y", `${rect.top + rect.height / 2}px`);
}

function openBuilder() {
  setOriginFromButton(openButton);
  shell.classList.add("is-open");
  shell.setAttribute("aria-hidden", "false");
  setTimeout(() => document.querySelector("#game_repository")?.focus(), 420);
}

function closeBuilder() {
  shell.classList.remove("is-open");
  shell.setAttribute("aria-hidden", "true");
  openButton.focus();
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

async function loadLatestVersion() {
  if (!getBuildFormats().includes("aab")) return;
  if (!apiBase || !packageInput.value.trim()) return;

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
      throw new Error(data.error || "Не удалось получить последнюю AAB версию.");
    }

    versionNameInput.value = data.aab?.versionName || "1.0.1";
    versionCodeInput.value = data.aab?.versionCode || "1";
    statusText.textContent = data.latest?.versionCode
      ? `AAB версия подставлена из Actions: ${versionNameInput.value} / ${versionCodeInput.value}.`
      : `Для этого package ещё нет истории. AAB начнётся с ${versionNameInput.value} / ${versionCodeInput.value}.`;
  } catch (error) {
    if (loadId !== versionLoadId) return;
    statusText.textContent = error.message;
  }
}

function maskValue(key, value) {
  if (!value) return "";
  if (/key|admob|id/i.test(key)) {
    return `${value.slice(0, 10)}...${value.slice(-5)}`;
  }
  return value;
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
    version_mode: data.version_mode || "manual",
    version_name: data.version_name || "",
    version_code: data.version_code || "",
    build_format: getBuildFormat(),
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
    ["zeywin_api_key", payload.zeywin_api_key],
    ["admob_android_app_id", payload.admob_android_app_id],
    ["admob_android_banner_id", payload.admob_android_banner_id],
    ["admob_android_interstitial_id", payload.admob_android_interstitial_id],
    ["admob_android_rewarded_id", payload.admob_android_rewarded_id],
    ["build_format", payload.build_format]
  ];

  payloadList.classList.remove("is-sending");
  payloadList.innerHTML = visible
    .map(([key, value]) => `
      <div class="payload-item">
        <span>${key}</span>
        <b>${maskValue(key, String(value || ""))}</b>
      </div>
    `)
    .join("");

  requestAnimationFrame(() => payloadList.classList.add("is-sending"));
}

function setTimer(secondsLeft, totalSeconds) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  timerValue.textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
  const progress = Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 360);
  timerRing.style.setProperty("--progress", `${progress}deg`);
}

function startTimer(totalSeconds = 600) {
  clearInterval(timerId);
  let left = totalSeconds;
  setTimer(left, totalSeconds);
  timerId = setInterval(() => {
    left = Math.max(0, left - 1);
    setTimer(left, totalSeconds);
    if (left === 0) {
      clearInterval(timerId);
    }
  }, 1000);
}

async function readIcon(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
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
      throw new Error(data.error || "Не удалось получить репозитории.");
    }

    repoSelect.innerHTML = data.repos
      .map((repo) => `<option value="${repo.fullName}">${repo.fullName}</option>`)
      .join("");
    statusText.textContent = "Список игр обновлён.";
  } catch (error) {
    statusText.textContent = error.message;
  }
}

async function submitBuild(event) {
  event.preventDefault();
  const payload = collectPayload();
  currentRequestId = payload.builder_request_id;
  currentRunId = "";
  currentPackageName = payload.package_name;
  startVersionCode = payload.build_format === "apk" ? 1 : Number(payload.version_code || 0);
  renderPayload(payload);
  startTimer(600);
  setArtifactSignal(false, "APK/AAB ещё не готов");
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
      throw new Error(data.error || "Backend не запустил сборку.");
    }

    actionsLink.href = data.workflow?.workflowUrl || "https://github.com/zey-win/ci-cd/actions";
    currentRequestId = data.requestId || currentRequestId;
    currentRunId = data.run?.id ? String(data.run.id) : "";
    if (data.run?.htmlUrl) {
      actionsLink.href = data.run.htmlUrl;
    }
    if (data.latestArtifact?.versionCode && !startVersionCode) {
      startVersionCode = Number(data.latestArtifact.versionCode) + 1;
    }
    startArtifactPolling();
    statusText.textContent = data.icon?.path
      ? `Иконка записана, сборка отправлена в Actions. Нажмите на круг, чтобы смотреть логи.`
      : `Сборка отправлена в Actions. Нажмите на круг, чтобы смотреть логи.`;
  } catch (error) {
    statusText.textContent = error.message;
  }
}

function setArtifactSignal(ready, text, url = "") {
  artifactSignal.classList.toggle("is-ready", ready);
  artifactSignal.querySelector("b").textContent = text;
  if (url) {
    actionsLink.href = url;
  }
}

function startArtifactPolling() {
  clearInterval(artifactRefreshId);
  pollArtifact();
  artifactRefreshId = setInterval(pollArtifact, 15000);
}

async function pollArtifact() {
  if (!currentPackageName) return;

  try {
    const params = new URLSearchParams({
      package_name: currentPackageName,
      min_version_code: String(Math.max(1, startVersionCode || 1))
    });
    const response = await fetch(`${apiBase}/api/artifacts?${params}`, {
      headers: operatorHeaders(),
      cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Не удалось проверить APK/AAB.");
    }
    if (data.ready && data.artifact) {
      clearInterval(artifactRefreshId);
      const label = `${data.artifact.type} готов: v${data.artifact.versionCode}`;
      setArtifactSignal(true, label, data.artifact.releaseUrl);
      statusText.textContent = `${label}. Можно открыть GitHub Release.`;
    }
  } catch (error) {
    setArtifactSignal(false, error.message);
  }
}

function openLogs() {
  logShell.classList.add("is-open");
  logShell.setAttribute("aria-hidden", "false");
  refreshLogs();
  clearInterval(logRefreshId);
  logRefreshId = setInterval(refreshLogs, 8000);
}

function closeLogs() {
  logShell.classList.remove("is-open");
  logShell.setAttribute("aria-hidden", "true");
  clearInterval(logRefreshId);
}

async function findRun() {
  if (currentRunId || !currentRequestId) return currentRunId;
  const response = await fetch(`${apiBase}/api/runs?request_id=${encodeURIComponent(currentRequestId)}`, {
    headers: operatorHeaders(),
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Не удалось найти Action run.");
  }
  if (data.run?.id) {
    currentRunId = String(data.run.id);
    actionsLink.href = data.run.htmlUrl;
  }
  return currentRunId;
}

async function refreshLogs() {
  try {
    if (!currentRequestId) {
      logMeta.textContent = "Сначала нажмите Билд.";
      logOutput.textContent = "Run ещё не создан.";
      return;
    }

    logMeta.textContent = `Ищу workflow run: ${currentRequestId}`;
    const runId = await findRun();
    if (!runId) {
      logOutput.textContent = "GitHub Actions ещё создаёт run. Обновляю автоматически...";
      return;
    }

    const response = await fetch(`${apiBase}/api/logs?run_id=${encodeURIComponent(runId)}`, {
      headers: operatorHeaders(),
      cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Не удалось загрузить логи.");
    }

    logMeta.innerHTML = `
      <a href="${data.run.htmlUrl}" target="_blank" rel="noreferrer">Run #${data.run.runNumber}</a>
      · ${data.run.status || "unknown"}
      ${data.run.conclusion ? `· ${data.run.conclusion}` : ""}
    `;
    logOutput.textContent = (data.jobs || [])
      .map((job) => {
        return [
          `===== ${job.name} · ${job.status}${job.conclusion ? ` · ${job.conclusion}` : ""} =====`,
          job.logTail || "Лог пока пуст."
        ].join("\n");
      })
      .join("\n\n");
  } catch (error) {
    logMeta.textContent = "Ошибка логов";
    logOutput.textContent = error.message;
  }
}

openButton.addEventListener("click", openBuilder);
closeButton.addEventListener("click", closeBuilder);
loadReposButton.addEventListener("click", loadRepos);
form.addEventListener("submit", submitBuild);
iconTrigger.addEventListener("click", toggleIconEditor);
pickIconButton.addEventListener("click", () => iconInput.click());
timerRing.addEventListener("click", openLogs);
closeLogsButton.addEventListener("click", closeLogs);
document.querySelectorAll('input[name="build_format"]').forEach((input) => {
  input.addEventListener("change", syncBuildMode);
});
packageInput.addEventListener("change", loadLatestVersion);
operatorInput.addEventListener("change", loadLatestVersion);
operatorInput.addEventListener("blur", loadLatestVersion);
syncBuildMode();

iconInput.addEventListener("change", async () => {
  const file = iconInput.files?.[0];
  if (!file) return;
  if (file.type !== "image/png") {
    statusText.textContent = "Нужен PNG файл.";
    iconInput.value = "";
    return;
  }
  selectedIconDataUrl = await readIcon(file);
  iconPreview.style.backgroundImage = `url("${selectedIconDataUrl}")`;
  iconPreview.classList.add("has-image");
  iconName.textContent = `${file.name} → Assets/ZeyWin/IconOverride/android-icon.png`;
  iconTrigger.setAttribute("aria-label", `Иконка выбрана: ${file.name}. Нажмите, чтобы изменить.`);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && shell.classList.contains("is-open")) {
    if (logShell.classList.contains("is-open")) {
      closeLogs();
    } else {
      closeBuilder();
    }
  }
});
