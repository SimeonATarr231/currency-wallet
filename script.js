/* ==========================================================
   CURRENCY WALLET — script.js
   Data source: Frankfurter v2 API — api.frankfurter.dev/v2
   Free, no API key needed. Covers 201 currencies from 84 central
   banks (v1 only covered ~31 major/ECB currencies — v2 is the
   one to use if you want broad coverage, e.g. LRD, NGN, GHS).

   Structure:
   1. State & DOM references
   2. Currency list loading
   3. Conversion (fetch rate, multiply locally)
   4. Historical trend
   5. Ticket amount count-up animation (the signature mechanic)
   6. Sparkline rendering
   7. Pinned pairs (localStorage)
   8. Day/Night theme toggle (localStorage)
   9. Copy to clipboard
   10. Debounce helper
   11. Error banner + retry
   12. Event wiring
   ========================================================== */

const API_BASE = "https://api.frankfurter.dev/v2";

/* ---------- 1. STATE & DOM REFERENCES ---------- */
let currencyMap = {};
let lastConvertedValue = 0;

const fromAmountInput = document.getElementById("fromAmount");
const fromCurrencyInput = document.getElementById("fromCurrency");
const toCurrencyInput = document.getElementById("toCurrency");
const currencyDatalist = document.getElementById("currencyList");
const swapBtn = document.getElementById("swapBtn");
const statusMessage = document.getElementById("statusMessage");
const resultAmount = document.getElementById("resultAmount");
const fromCurrencyLabel = document.getElementById("fromCurrencyLabel");
const toCurrencyLabel = document.getElementById("toCurrencyLabel");
const copyBtn = document.getElementById("copyBtn");
const sparkline = document.getElementById("sparkline");
const trendChange = document.getElementById("trendChange");
const trendChangeValue = document.getElementById("trendChangeValue");
const pinnedChips = document.getElementById("pinnedChips");
const pinCurrentBtn = document.getElementById("pinCurrentBtn");
const themeToggle = document.getElementById("themeToggle");
const quickChips = document.querySelectorAll(".chip");
const lastUpdated = document.getElementById("lastUpdated");
const errorBanner = document.getElementById("errorBanner");
const errorText = document.getElementById("errorText");
const retryBtn = document.getElementById("retryBtn");

/* ---------- 2. CURRENCY LIST LOADING ----------
   v2's /currencies returns an ARRAY of objects, not a flat map like v1:
   [{ iso_code: "USD", name: "United States Dollar", symbol: "$", ... }, ...]
   so this builds currencyMap = { USD: "United States Dollar", ... } from it. */
async function loadCurrencyList() {
  try {
    const response = await fetch(`${API_BASE}/currencies`);
    if (!response.ok) throw new Error("Could not load currency list.");
    const currencyList = await response.json();

    currencyMap = {};
    currencyList.forEach((entry) => {
      currencyMap[entry.iso_code] = entry.name;
    });

    currencyDatalist.innerHTML = currencyList
      .map((entry) => `<option value="${entry.iso_code} — ${entry.name}">`)
      .join("");
  } catch (error) {
    console.warn("Currency list failed to load:", error.message);
  }
}

function extractCode(inputValue) {
  const match = inputValue.trim().match(/^[A-Za-z]{3}/);
  return match ? match[0].toUpperCase() : null;
}

/* ---------- 3. CONVERSION ----------
   v2's single-pair endpoint returns one flat object:
   { date, base, quote, rate } — much simpler than v1's nested "rates" object. */
async function getExchangeRate(from, to) {
  const url = `${API_BASE}/rate/${from}/${to}`;
  const response = await fetch(url);

  if (!response.ok) {
    // v2 returns a JSON error body on 422 (invalid code) / 404 (no data for that pair)
    let detail = "";
    try {
      const errorBody = await response.json();
      detail = errorBody.message || errorBody.error || "";
    } catch (_) {
      /* response wasn't JSON — ignore, fall back to generic message below */
    }
    throw new Error(
      detail || `No rate available for ${from} → ${to}. Double-check both currency codes.`
    );
  }

  const data = await response.json();
  return { rate: data.rate, date: data.date };
}

/* ---------- 4. HISTORICAL TREND (last 7 days) ----------
   v2's /rates with from/to returns a flat ARRAY of rows, one per date:
   [{ date, base, quote, rate }, ...] — sort by date, pull out the rate values. */
async function fetchTrend(from, to) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);

  const formatDate = (d) => d.toISOString().split("T")[0];
  const url = `${API_BASE}/rates?from=${formatDate(start)}&to=${formatDate(end)}&base=${from}&quotes=${to}`;

  const response = await fetch(url);
  if (!response.ok) return [];

  const rows = await response.json();
  if (!Array.isArray(rows)) return [];

  return rows
    .slice()
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .map((row) => row.rate)
    .filter((val) => val !== undefined && val !== null);
}

/* ---------- 5. TICKET AMOUNT COUNT-UP ANIMATION ----------
   Instead of a flip-tile mechanic, the ticket amount "prints" itself
   by counting from the old value to the new one — like a receipt total
   ticking up, or an odometer. Uses requestAnimationFrame for smooth,
   frame-synced updates rather than setInterval. */
function animateTicketAmount(fromValue, toValue, duration = 500) {
  const startTime = performance.now();

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // ease-out cubic — starts fast, settles gently, feels less mechanical than linear
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = fromValue + (toValue - fromValue) * eased;

    resultAmount.textContent = current.toFixed(2);

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      resultAmount.textContent = toValue.toFixed(2);
    }
  }

  requestAnimationFrame(tick);
}

/* ---------- 6. SPARKLINE RENDERING ---------- */
function renderSparkline(values) {
  if (!values || values.length < 2) {
    sparkline.innerHTML = "";
    trendChangeValue.textContent = "—";
    trendChange.className = "trend-change";
    return;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((val, i) => {
    const x = (i / (values.length - 1)) * 200;
    const y = 32 - ((val - min) / range) * 28 - 2;
    return `${x},${y}`;
  });

  const pathData = "M" + points.join(" L");
  sparkline.innerHTML = `<path d="${pathData}" />`;

  const percentChange = ((values[values.length - 1] - values[0]) / values[0]) * 100;
  const sign = percentChange >= 0 ? "+" : "";
  trendChangeValue.textContent = `${sign}${percentChange.toFixed(2)}%`;

  const direction = percentChange >= 0 ? "up" : "down";
  trendChange.className = "trend-change " + direction;

  const iconEl = trendChange.querySelector("svg, i");
  if (iconEl) {
    const newIconName = direction === "up" ? "trending-up" : "trending-down";
    const freshIcon = document.createElement("i");
    freshIcon.setAttribute("data-lucide", newIconName);
    iconEl.replaceWith(freshIcon);
    lucide.createIcons();
  }
}

/* ---------- 7. PINNED PAIRS (localStorage) ---------- */
function getPinnedPairs() {
  const saved = localStorage.getItem("pinnedCurrencyPairs");
  return saved ? JSON.parse(saved) : [];
}

function savePinnedPairs(pairs) {
  localStorage.setItem("pinnedCurrencyPairs", JSON.stringify(pairs));
}

function renderPinnedChips() {
  const pairs = getPinnedPairs();
  pinnedChips.innerHTML = "";

  pairs.forEach((pair) => {
    const chip = document.createElement("button");
    chip.className = "chip-pinned";
    chip.textContent = `${pair.from} → ${pair.to}`;
    chip.addEventListener("click", () => {
      fromCurrencyInput.value = `${pair.from} — ${currencyMap[pair.from] || ""}`;
      toCurrencyInput.value = `${pair.to} — ${currencyMap[pair.to] || ""}`;
      runConversion();
    });
    pinnedChips.appendChild(chip);
  });
}

function pinCurrentPair() {
  const from = extractCode(fromCurrencyInput.value);
  const to = extractCode(toCurrencyInput.value);
  if (!from || !to) return;

  const pairs = getPinnedPairs();
  const alreadyPinned = pairs.some((p) => p.from === from && p.to === to);
  if (alreadyPinned) return;

  pairs.push({ from, to });
  savePinnedPairs(pairs);
  renderPinnedChips();
}

/* ---------- 8. DAY/NIGHT THEME TOGGLE ---------- */
function initTheme() {
  const saved = localStorage.getItem("currencyBoardTheme");
  if (saved === "day") {
    document.body.classList.add("day-mode");
    document.body.classList.remove("night-mode");
  }
}

themeToggle.addEventListener("click", () => {
  const isDay = document.body.classList.toggle("day-mode");
  document.body.classList.toggle("night-mode", !isDay);
  localStorage.setItem("currencyBoardTheme", isDay ? "day" : "night");
});

/* ---------- 9. COPY TO CLIPBOARD ---------- */
copyBtn.addEventListener("click", async () => {
  const toCode = extractCode(toCurrencyInput.value);
  const textToCopy = `${lastConvertedValue.toFixed(2)} ${toCode}`;

  try {
    await navigator.clipboard.writeText(textToCopy);
    copyBtn.classList.add("copied");
    setTimeout(() => copyBtn.classList.remove("copied"), 1200);
  } catch (error) {
    statusMessage.textContent = "Could not copy — try selecting the value manually.";
  }
});

/* ---------- 10. DEBOUNCE HELPER ---------- */
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ---------- 11. ERROR BANNER ----------
   When an error is showing, the ticket is marked "stale" (dimmed) so it's
   never mistaken for a fresh, successful result sitting next to a live error. */
function showError(message) {
  errorText.textContent = message;
  errorBanner.hidden = false;
  document.querySelector(".ticket").classList.add("stale");
}

function hideError() {
  errorBanner.hidden = true;
  document.querySelector(".ticket").classList.remove("stale");
}

retryBtn.addEventListener("click", () => {
  hideError();
  runConversion();
});

/* ---------- 12. MAIN CONVERSION FLOW ---------- */
async function runConversion() {
  const amount = parseFloat(fromAmountInput.value);
  const from = extractCode(fromCurrencyInput.value);
  const to = extractCode(toCurrencyInput.value);

  if (!amount || amount <= 0 || !from || !to) {
    statusMessage.textContent = "Enter a valid amount and currency codes.";
    return;
  }

  statusMessage.textContent = "Converting…";
  hideError();

  try {
    const { rate, date } = await getExchangeRate(from, to);
    const result = amount * rate;

    animateTicketAmount(lastConvertedValue, result);
    lastConvertedValue = result;

    fromCurrencyLabel.textContent = from;
    toCurrencyLabel.textContent = to;
    lastUpdated.textContent = date ? `updated ${date}` : "live rate";

    statusMessage.textContent = "";

    const trendValues = await fetchTrend(from, to);
    renderSparkline(trendValues);
  } catch (error) {
    statusMessage.textContent = "";
    lastUpdated.textContent = "offline";
    showError(error.message || "Could not reach the exchange rate service.");
  }
}

const debouncedConversion = debounce(runConversion, 500);

/* ---------- EVENT WIRING ---------- */
fromAmountInput.addEventListener("input", debouncedConversion);
fromCurrencyInput.addEventListener("input", debouncedConversion);
toCurrencyInput.addEventListener("input", debouncedConversion);

swapBtn.addEventListener("click", () => {
  const temp = fromCurrencyInput.value;
  fromCurrencyInput.value = toCurrencyInput.value;
  toCurrencyInput.value = temp;
  runConversion();
});

quickChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    fromAmountInput.value = chip.dataset.amount;
    runConversion();
  });
});

pinCurrentBtn.addEventListener("click", pinCurrentPair);

/* ---------- INIT ---------- */
async function init() {
  initTheme();
  renderPinnedChips();
  await loadCurrencyList();
  await runConversion();
}

init();