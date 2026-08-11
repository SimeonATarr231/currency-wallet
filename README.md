# 💳 Currency Wallet

A currency converter styled as a physical wallet — your input amount lives on a debit card, your converted result prints onto a boarding-pass-style ticket right beside it. Built with vanilla HTML, CSS & JS. No backend, no API key required.

Designed & Built by **Simeon A. Tarr**

🔗 **Live Demo:** _https://simeonatarr231.github.io/currency-wallet/_

## Design Concept

The card and ticket keep their own true colors in both Day and Night mode — a real plastic card or paper ticket doesn't change color when the room lights dim, only the environment around it does. Day/Night only affects the page background and panels; the card (indigo/violet gradient) and ticket (amber/coral gradient) stay constant, which is what sells the "physical object" feel.

Instead of digits flipping, the converted amount **counts up** from the old value to the new one — like a receipt total ticking, or an odometer — using `requestAnimationFrame` with an ease-out curve.

## Features

- Debit-card styled input for amount + From currency, complete with chip and card-network-style watermark
- Boarding-pass styled ticket for the converted result, complete with perforated tear line and a decorative barcode stub
- Count-up animation on the ticket amount every time you change the amount or currency
- Day Board / Night Board toggle that only shifts the environment, not the card/ticket colors, saved across visits
- Pin currency pairs for one-click reuse, saved in `localStorage`
- Quick-amount chips (100 / 1,000 / 10,000)
- Swap "clasp" button to instantly flip From/To currencies
- Copy converted result to clipboard
- 7-day historical trend on a printed-receipt-style strip
- Search-to-filter currency inputs
- Debounced input — waits until you stop typing before hitting the API
- Icon set built with [Lucide](https://lucide.dev/) throughout — no emoji in the UI
- A dedicated error banner with a Retry button if the exchange rate service is unreachable
- Fully responsive — the card and ticket stack vertically on small screens, with the swap clasp rotating to match

## Tech Stack

- HTML, CSS, JavaScript (no frameworks, no build tools)
- [Frankfurter API v1](https://frankfurter.dev/v1/) for live and historical exchange rates (free, no key needed)
- [Lucide](https://lucide.dev/) for icons
- `navigator.clipboard` API for copy-to-clipboard
- `requestAnimationFrame` for the count-up animation
- CSS custom properties, split into environment tokens (theme-dependent) and object tokens (theme-independent)

## Project Structure

```
currency-converter/
├── index.html
├── style.css
├── script.js
├── README.md
└── .gitignore
```

## A Note on the API

This project points at **`api.frankfurter.dev/v1`** — the older `api.frankfurter.app` domain has been retired. One behavior change worth knowing: the `/latest` endpoint no longer accepts an `amount` parameter directly — you fetch the exchange **rate** and multiply it by the amount yourself in JavaScript. `script.js` does this in `getExchangeRate()` and `runConversion()`. If this ever breaks again, check [frankfurter.dev](https://frankfurter.dev/) first for the current endpoint shape before assuming the code is wrong.

## How to Test It

### 1. Run it locally

- Open the project folder in VS Code
- Right-click `index.html` → **Open with Live Server** (or just double-click the file to open it directly in a browser)

### 2. Test the core flow

1. The wallet loads with USD → EUR, amount 100, and converts automatically
2. Change the amount — the ticket amount should count up/down smoothly to the new value
3. Type into the From/To currency fields — a dropdown of matching currencies should appear as you type

### 3. Test each feature

| Feature | How to test |
|---|---|
| Count-up animation | Change the amount or currency — the ticket total should animate smoothly, not snap instantly |
| Swap clasp | Click the swap icon between the card and ticket — currencies should instantly swap and reconvert |
| Quick chips | Click `100` / `1,000` / `10,000` on the card — amount updates and reconverts |
| Pin current pair | Set a pair, click "Pin current" — a chip appears above; click it later to instantly reload that pair |
| Copy button | Click the clipboard icon on the ticket — paste somewhere to confirm it copied the value + currency code |
| Day/Night toggle | Click the sun/moon switch — only the background/panels should change; the card and ticket colors stay the same |
| Trend receipt | Should show a small line chart with a percent change label below the wallet |
| Error handling | Temporarily disconnect from the internet and change the amount — you should see the red error banner with a Retry button |
| Responsiveness | Resize the browser narrow (or open on a phone) — the card and ticket should stack, and the swap clasp should rotate to sit between them |

### 4. Known limitations to expect while testing

- Frankfurter rates are updated once daily (not real-time tick-by-tick) — this is standard for free exchange rate data.
- Some smaller/less common currencies may have limited historical data for the trend strip.
- If you type a currency code that doesn't exist, you'll see the error banner rather than a silent failure — that's expected behavior, not a bug.