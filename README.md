# 💱 Currency Exchange Board

A currency converter with a split-flap "departure board" aesthetic — inspired by the old mechanical Solari boards at airports and train stations. Built with vanilla HTML, CSS & JS. No backend, no API key required.

Designed & Built by **Simeon A. Tarr**

🔗 **Live Demo:** _[Add live URL here once deployed to GitHub Pages]_

## Features

- 🔢 Live currency conversion with a mechanical flip-tile animation on every value change
- 🌓 Day Board / Night Board toggle (ivory paper board ⇄ amber electronic board), saved across visits
- ⭐ Pin currency pairs for one-click reuse, saved in `localStorage`
- ⚡ Quick-amount chips (100 / 1,000 / 10,000) for fast testing
- 🔄 Swap button to instantly flip From/To currencies
- 📋 Copy converted result to clipboard
- 📈 7-day historical trend sparkline with percent change
- Search-to-filter currency inputs (type to narrow instead of scrolling a giant list)
- Debounced input — waits until you stop typing before hitting the API

## Tech Stack

- HTML, CSS, JavaScript (no frameworks, no build tools)
- [Frankfurter API](https://frankfurter.app) for live and historical exchange rates (free, no key needed)
- `navigator.clipboard` API for copy-to-clipboard
- CSS custom properties for the Day/Night theme system

## Project Structure

```
currency-converter/
├── index.html
├── style.css
├── script.js
├── README.md
└── .gitignore
```

## How to Test It

### 1. Run it locally

- Open the project folder in VS Code
- Right-click `index.html` → **Open with Live Server** (or just double-click the file to open it directly in a browser)

### 2. Test the core flow

1. The board loads with USD → EUR, amount 100, and converts automatically
2. Change the amount — the flip tiles should animate to the new value after you stop typing (debounce delay)
3. Type into the From/To currency fields — a dropdown of matching currencies should appear as you type

### 3. Test each feature

| Feature | How to test |
|---|---|
| Flip animation | Change the amount or currency — watch the digits flip like a mechanical board, not just snap to the new value |
| Swap button | Click ⇄ — From and To currencies should instantly swap and reconvert |
| Quick chips | Click `100` / `1,000` / `10,000` — amount updates and board reconverts |
| Pin current pair | Set a pair, click "+ pin current" — a chip appears above; click it later to instantly reload that pair |
| Copy button | Click the clipboard icon — paste somewhere to confirm it copied the value + currency code |
| Day/Night toggle | Flip the switch — theme should change instantly; refresh the page — it should remember your choice |
| Trend sparkline | Should show a small line chart with a percent change label under the board |

### 4. Known limitations to expect while testing

- Frankfurter API rates are updated once daily (not real-time tick-by-tick) — this is standard for free exchange rate data.
- Some smaller/less common currencies may have limited historical data for the trend sparkline.
- If you type a currency code that doesn't exist, you'll see an error message rather than a silent failure — that's expected behavior, not a bug.