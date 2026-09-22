# ResourceLink Frontend (React + Vite)

Same design, same 6 pages, same content — rebuilt as a proper React + Vite
project so it matches your team's actual stack.

## Structure

```
resourcelink-vite/
├── index.html              ← Vite entry point (loads fonts + mounts React)
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx             ← React entry point
    ├── App.jsx              ← page switcher (replaces the old goTo() function)
    ├── index.css            ← all original styling, unchanged
    ├── components/
    │   └── Navbar.jsx
    └── pages/
        ├── Home.jsx
        ├── Discover.jsx
        ├── AIMatch.jsx
        ├── PaymentTrust.jsx
        ├── SmartAccess.jsx
        └── PredictiveTracking.jsx
```

## How to run

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`).

## How page switching works now

The old vanilla version used a `goTo(pageId)` function that toggled CSS
classes on/off. In React, `App.jsx` holds `activePage` in state, and only the
matching page component gets rendered — clicking a nav link, a flow-node
number on the homepage, or a "Reserve"/"Confirm payment" button all call the
same `goTo()` passed down as a prop.

## Every page is still hardcoded data (on purpose, for now)

Each page file has its content pulled to the top as a plain JS array (e.g.
`LISTINGS` in `Discover.jsx`, `MATCHES` in `AIMatch.jsx`) instead of buried in
JSX — this is deliberate, so that wiring in real data later is a one-line
change: replace the array with the result of a `fetch()` call, the JSX below
it doesn't need to change at all.

## Wiring to your real backend next

- **Discover.jsx** → replace `LISTINGS` with data from your .NET backend's
  `GET /api/ResourceAllocations`
- **AIMatch.jsx** → replace `MATCHES` with the response from your FastAPI
  `/match` endpoint
- **PaymentTrust.jsx / SmartAccess.jsx** → wire the "Confirm payment" button
  to your actual x402/Algorand flow once it's ready

Suggested pattern for any page, using React's `useEffect` + `useState`:

```jsx
import { useEffect, useState } from "react";

const [listings, setListings] = useState([]);

useEffect(() => {
  fetch("/api/ResourceAllocations")
    .then((res) => res.json())
    .then(setListings);
}, []);
```
