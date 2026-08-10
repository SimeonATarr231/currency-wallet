/* ==========================================================
   CURRENCY EXCHANGE BOARD — script.js
   Data source: Frankfurter API (frankfurter.app) — free, no API key needed

   Structure:
   1. State & DOM references
   2. Currency list loading (for the datalist search-to-filter inputs)
   3. Conversion (Frankfurter /latest)
   4. Historical trend (Frankfurter date-range endpoint)
   5. Flip board rendering (the signature mechanic)
   6. Sparkline rendering
   7. Pinned pairs (localStorage)
   8. Day/Night theme toggle (localStorage)
   9. Copy to clipboard
   10. Debounce helper
   11. Event wiring
   ========================================================== */

/* ---------- 1. STATE & DOM REFERENCES ---------- */
let currencyMap = {};      // { USD: "United States Dollar", EUR: "Euro", ... }
let lastConvertedValue = "0.00";

const fromAmountInput = document.getElementById("fromAmount");
const fromCurrencyInput = document.getElementById("fromCurrency");
const toCurrencyInput = document.getElementById("toCurrency");
const currencyDatalist = document.getElementById("currencyList");
const swapBtn = document.getElementById("swapBtn");
const statusMessage = document.getElementById("statusMessage");
const flipBoard = document.getElementById("flipBoard");
const toCurrencyLabel = document.getElementById("toCurrencyLabel");
const copyBtn = document.getElementById("copyBtn");
const sparkline = document.getElementById("sparkline");
const trendChange = document.getElementById("trendChange");
const pinnedChips = document.getElementById("pinnedChips");
const pinCurrentBtn = document.getElementById("pinCurrentBtn");
const themeToggle = document.getElementById("themeToggle");
const quickChips = document.querySelectorAll(".chip");

/* ---------- 2. CURRENCY LIST LOADING ---------- */
async function loadCurrencyList() {
  try {
    const response = await fetch("https://api.frankfurter.app/currencies");
    currencyMap = await response.json();

    currencyDatalist.innerHTML = Object.entries(currencyMap)
      .map(([code, name]) => `<option value="${code} — ${name}">`)
      .join("");
  } catch (error) {
    statusMessage.textContent = "Could not load currency list.";
  }
}

// Extracts "USD" from an input value like "USD — US Dollar"
function extractCode(inputValue) {
  const match = inputValue.trim().match(/^[A-Za-z]{3}/);
  return match ? match[0].toUpperCase() : null;
}

/* ---------- 3. CONVERSION ---------- */
async function convertCurrency(amount, from, to) {
  const url = `https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Conversion failed. Check the currency codes and try again.");
  }

  const data = await response.json();
  return data.rates[to];
}

/* ---------- 4. HISTORICAL TREND (last 7 days) ---------- */
async function fetchTrend(from, to) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);

  const formatDate = (d) => d.toISOString().split("T")[0];
  const url = `https://api.frankfurter.app/${formatDate(start)}..${formatDate(end)}?from=${from}&to=${to}`;

  const response = await fetch(url);
  if (!response.ok) return [];

  const data = await response.json();

  // data.rates is an object keyed by date — sort chronologically, extract values
  return Object.keys(data.rates)
    .sort()
    .map((date) => data.rates[date][to]);
}

/* ---------- 5. FLIP BOARD RENDERING (the signature mechanic) ---------- */
function buildFlipBoard(valueString) {
  flipBoard.innerHTML = "";

  [...valueString].forEach((char) => {
    const tile = document.createElement("div");
    tile.className = "flip-tile";
    tile.dataset.char = char;

    const inner = document.createElement("span");
    inner.className = "flip-inner";
    inner.textContent = char;

    tile.appendChild(inner);
    flipBoard.appendChild(tile);
  });
}

function updateFlipBoard(valueString) {
  const tiles = flipBoard.querySelectorAll(".flip-tile");

  // If the digit count changed (e.g. currency amount got longer), just rebuild
  if (tiles.length !== valueString.length) {
    buildFlipBoard(valueString);
    return;
  }

  [...valueString].forEach((char, i) => {
    const tile = tiles[i];
    const inner = tile.querySelector(".flip-inner");

    if (tile.dataset.char === char) return; // no change, skip animation

    tile.classList.add("flipping");

    // Swap the character at the midpoint of the flip animation (300ms total)
    setTimeout(() => {
      inner.textContent = char;
      tile.dataset.char = char;
    }, 150);

    setTimeout(() => {
      tile.classList.remove("flipping");
    }, 300);
  });
}

/* ---------- 6. SPARKLINE RENDERING ---------- */
function renderSparkline(values) {
  if (!values || values.length < 2) {
    sparkline.innerHTML = "";
    trendChange.textContent = "—";
    trendChange.className = "trend-change";
    return;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((val, i) => {
    const x = (i / (values.length - 1)) * 200;
    const y = 32 - ((val - min) / range) * 28 - 2; // padding inside viewBox
    return `${x},${y}`;
  });

  const pathData = "M" + points.join(" L");
  sparkline.innerHTML = `<path d="${pathData}" />`;

  const percentChange = ((values[values.length - 1] - values[0]) / values[0]) * 100;
  const sign = percentChange >= 0 ? "+" : "";
  trendChange.textContent = `${sign}${percentChange.toFixed(2)}%`;
  trendChange.className = "trend-change " + (percentChange >= 0 ? "up" : "down");
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
    chip.textContent = `${pair.from}→${pair.to}`;
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
    themeToggle.checked = true;
  }
}

themeToggle.addEventListener("change", () => {
  const isDay = themeToggle.checked;
  document.body.classList.toggle("day-mode", isDay);
  document.body.classList.toggle("night-mode", !isDay);
  localStorage.setItem("currencyBoardTheme", isDay ? "day" : "night");
});

/* ---------- 9. COPY TO CLIPBOARD ---------- */
copyBtn.addEventListener("click", async () => {
  const toCode = extractCode(toCurrencyInput.value);
  const textToCopy = `${lastConvertedValue} ${toCode}`;

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

/* ---------- 11. MAIN CONVERSION FLOW ---------- */
async function runConversion() {
  const amount = parseFloat(fromAmountInput.value);
  const from = extractCode(fromCurrencyInput.value);
  const to = extractCode(toCurrencyInput.value);

  if (!amount || amount <= 0 || !from || !to) {
    statusMessage.textContent = "Enter a valid amount and currency codes.";
    return;
  }

  statusMessage.textContent = "Converting...";

  try {
    const result = await convertCurrency(amount, from, to);
    const formatted = result.toFixed(2);

    lastConvertedValue = formatted;
    updateFlipBoard(formatted);
    toCurrencyLabel.textContent = to;

    statusMessage.textContent = "";

    const trendValues = await fetchTrend(from, to);
    renderSparkline(trendValues);
  } catch (error) {
    statusMessage.textContent = error.message;
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
  buildFlipBoard("0.00");
  renderPinnedChips();
  await loadCurrencyList();
  runConversion();
}

init();