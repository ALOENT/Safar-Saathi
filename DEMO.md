# SafarSathi — Demo Script & Technical Overview

> **Estimated demo time: 8–10 minutes**  
> Three windows are needed: one mobile browser (or Chrome DevTools mobile mode at 360 px)  
> for the **Traveler**, and two desktop tabs for the **Guide** and the **Authority**.

---

## 1 · Demo Accounts to Create via Sign-Up

| Role | Suggested email | Name |
|---|---|---|
| **Traveler** | `demo_traveler@safarsathi.app` | Aarav Sharma |
| **Guide** | `demo_guide@safarsathi.app` | Priya Mehra |
| **Authority** | `demo_authority@safarsathi.app` | Officer Raj |

> After signing up each account, go to **Supabase → Table Editor → profiles** and set the `role` column:  
> `traveler` / `guide` / `authority`.  
> (The traveler role is set by default; only guide and authority need a manual update.)

---

## 2 · Pre-Demo Setup (5 min before)

1. **Guide window** — sign in as Guide, go to **Trip** → **Create Trip** → name it `"Manali Expedition 2025"`, add stops (Chandigarh → Manali).
2. **Traveler phone / mobile window** — sign in as Traveler, go to **Trip** → **Join Code** → enter the 6-char code from the Guide's screen.
3. **Authority window** — sign in as Authority. The authority dashboard loads automatically.
4. Make sure all three browsers have location permission granted.

---

## 3 · Demo Script (step by step)

### Act 1 — Profile & Trip Setup (Guide's window, ~2 min)

1. Guide opens **Profile** → shows avatar upload, completion bar.
2. Guide adds an emergency contact (demonstrates the form validation).
3. Guide shows the **Trip** page with the cover image and route stops.

### Act 2 — Traveler Joins & Safety Score (Traveler's phone, ~2 min)

1. Traveler opens **Home** → shows the safety score widget (green = low risk).
2. Traveler opens **Map** → both Guide and Traveler markers appear with live pings.
3. Traveler navigates toward a red risk zone on the map (pre-seeded in `riskZones.json`). Score drops to amber/red.

### Act 3 — SOS Flow (Traveler's phone, ~2 min)

1. Traveler presses **TRIGGER SOS EMERGENCY** — 3-second countdown appears.
2. Countdown completes → alert is sent. Toast: *"SOS alert sent to your guide and authorities!"*
3. **Optional:** Traveler taps **Add a Photo** → camera sheet opens → photo attached.
4. **Guide's window** — red alert card appears with traveler name, avatar, coordinates.  
   Guide presses **Mark Safe** → alert turns green.
5. **Authority's window** — authority sees the same alert, can **Acknowledge** or **Dispatch** (mock), then **Close**.

### Act 4 — Real-Time & Offline (demonstrate once, ~1 min)

1. Kill the Traveler's network (Chrome DevTools → Network → Offline).  
   Amber **"You're offline — live data paused"** banner appears at the top.
2. Restore network → **"Back online"** green banner flashes for 3 seconds.

---

## 4 · Tech Stack (1-minute explanation for judges)

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | React + Vite (PWA) | Installable on mobile, fast HMR |
| **Styling** | Vanilla CSS + Tailwind-free class utilities | Zero build overhead |
| **Database** | Supabase (Postgres + Row-Level Security) | Realtime subscriptions, auth, storage without a backend |
| **Realtime** | Supabase `postgres_changes` channels | SOS alerts and location updates pushed instantly to all subscribers |
| **Maps** | Leaflet + OpenStreetMap (free, no API key) | Works offline with cached tiles |
| **Routing** | OSRM public demo API | Turn-by-turn coordinates for route polyline |
| **Image uploads** | Cloudinary unsigned preset | Client-side compress → CDN delivery, no backend secret |
| **Safety score** | Rule-based JS function | Risk-zone distance + weather code + group proximity + night hours |
| **Deployment** | Vite build → any static host (Vercel / Netlify) | One command: `npm run build` |

---

## 5 · Known Limitations (be upfront)

| Limitation | Explanation |
|---|---|
| **Web GPS only** | Location is tracked only while the browser tab is open and active. A native app (React Native / Flutter) would run location in the background. |
| **Rule-based safety score** | The safety score is a weighted heuristic (risk zones, weather, group spread, time-of-day). It is **not** ML-based and cannot learn from historical incidents. |
| **Mock dispatch** | The "Dispatch nearest unit" button in the authority panel is a UI demo. It calls `acknowledgeAlert()` — no real CAD/dispatch API is integrated. |
| **Hardcoded risk zones** | Risk zones in `src/data/riskZones.json` are sample polygons for demo purposes. A production system would pull dynamic data from a government GIS feed. |
| **Offline SOS** | SOS cannot be sent without internet. The offline banner is informational only. A production app would queue the alert locally and flush on reconnect. |
| **Single-region DB** | Supabase project is hosted in one region. A global deployment would need multi-region replication for low latency. |
| **No push notifications** | Alerts are delivered via realtime DB subscriptions — the tab must be open. PWA push notifications were not implemented to avoid requiring a notification server. |

---

## 6 · Running Locally

```bash
# Clone and install
git clone <repo>
cd SafarSathi
npm install

# Create .env
cp .env.example .env
# Fill in:
#   VITE_SUPABASE_URL
#   VITE_SUPABASE_ANON_KEY
#   VITE_CLOUDINARY_CLOUD_NAME
#   VITE_CLOUDINARY_UPLOAD_PRESET

# Start dev server (accessible on LAN for mobile testing)
npm run dev -- --host 0.0.0.0
```

Open `http://<your-local-ip>:5173` on your phone for the traveler view.
