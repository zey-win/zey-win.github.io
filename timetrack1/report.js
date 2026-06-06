const rowsEl = document.querySelector("#activity-rows");
const totalDaysEl = document.querySelector("#total-days");
const totalMessagesEl = document.querySelector("#total-messages");
const totalTimeEl = document.querySelector("#total-time");
const subtotalTimeEl = document.querySelector("#subtotal-time");
const invoiceDaysEl = document.querySelector("#invoice-days");
const generatedAtEl = document.querySelector("#generated-at");
const billableHoursEl = document.querySelector("#billable-hours");
const billingFormulaEl = document.querySelector("#billing-formula");
const amountDueEl = document.querySelector("#amount-due");
const hourlyRate = 19;
const dataVersion = "20260606-telegram-real-desc";

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function dateStamp(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}

function compactTime(value) {
  const text = String(value).trim();
  const fullTime = text.match(/^(\d+)\s*ч(?:\s*(\d+)\s*мин)?$/);
  if (fullTime) {
    const minutes = fullTime[2] ? ` ${fullTime[2]}m` : "";
    return `${fullTime[1]}h${minutes}`;
  }

  const minutesOnly = text.match(/^(\d+)\s*мин$/);
  if (minutesOnly) {
    return `${minutesOnly[1]}m`;
  }

  return text.replace(" ч ", "h ").replace(" мин", "m");
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function generatedStamp(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Europe/Kiev",
  })
    .format(date)
    .replace(",", " /");
}

fetch(`./activity-data.json?v=${dataVersion}`, { cache: "no-store" })
  .then((response) => response.json())
  .then((data) => {
    totalDaysEl.textContent = data.totals.days;
    totalMessagesEl.textContent = data.totals.messages;
    totalTimeEl.textContent = data.totals.spent_time;
    subtotalTimeEl.textContent = data.totals.spent_time;
    invoiceDaysEl.textContent = `${data.totals.days} days`;
    generatedAtEl.textContent = `Date: ${generatedStamp(data.generated_at)}`;
    const billableHours = data.totals.spent_minutes / 60;
    const roundedHours = Number.isInteger(billableHours)
      ? String(billableHours)
      : billableHours.toFixed(1);
    billableHoursEl.textContent = `${roundedHours} h`;
    billingFormulaEl.textContent = `${roundedHours}h x $${hourlyRate}`;
    amountDueEl.textContent = money(billableHours * hourlyRate);

    rowsEl.innerHTML = data.rows
      .map((row) => {
        const description = row.description.replace(/^\d{2}\.\d{2}\.\d{4}\s*-\s*/, "");
        const sessions = row.sessions.join(", ");
        const heat = Math.round(100 - row.intensity * 18);

        return `
          <article class="receipt-item" style="--paper-light:${heat}%">
            <div class="item-main">
              <span class="sku">${dateStamp(row.date)}</span>
              <p>${esc(description)}</p>
              <b>${esc(compactTime(row.spent_time))}</b>
            </div>
            <div class="item-note">${esc(row.message_count)} msgs @ ${esc(sessions)}</div>
          </article>
        `;
      })
      .join("");
  });
