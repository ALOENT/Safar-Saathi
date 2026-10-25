# SafarSaathi

**Travel Safe, Travel Smart.**
A real-time tourist safety platform: live group tracking, one-tap SOS, an indicative safety score and an authority dashboard, delivered as an installable web app (PWA).

**Live demo:** https://safar-sathi-umber.vercel.app
**Demo script and test accounts:** [DEMO.md](./DEMO.md)

> **Status: working prototype** built for Hacktober Hack Days 2026. It demonstrates the core safety loop end to end. It is not a production system and must not be relied on for real emergencies. See [Scope](#scope-implemented-vs-proposed) and [Known issues](#known-issues).

---

## Problem

Tourists and group travellers often move through unfamiliar places with no shared view of where everyone is, no quick way to ask for help, and no direct line to the people who can respond. Guides lose track of members, and authorities hear about incidents late.

## Solution

SafarSaathi connects three kinds of users in real time:

| Role | What they do |
|---|---|
| **Traveller** | Joins a trip with a code, shares live location with the group, sends an SOS, sees a safety score |
| **Guide** | Any user who creates a trip is the guide of that trip. Plans the route, tracks members, receives and clears SOS alerts |
| **Authority** | Monitors all SOS alerts on a live map, acknowledges, dispatches (mock) and closes incidents |

---

## Screenshots

<img width="1599" height="838" alt="WhatsApp Image 2026-10-25 at 20 02 55" src="https://github.com/user-attachments/assets/4982d11c-65e0-43fc-8562-d9a976bacd8c" />


---

## Features (implemented)

- **Authentication:** email and password sign-up and login.
- **Trips and Trip Code:** create a trip and get a 6-character code; others join with the code, or travel solo. One active trip per user.
- **Trip details and route planning:** destination, dates, meeting point, ordered stops, and a road route drawn on the map.
- **Live group map:** members' locations update in real time on an OpenStreetMap map.
- **One-tap SOS:** 3-second cancel countdown, then an alert with location is sent to the trip guide and to authorities. An optional photo can be attached afterwards without delaying the alert.
- **Incident lifecycle:** `active` → `acknowledged` → `guide_resolved` → `resolved`.
- **Safety score (0 to 100):** rule-based and explainable, with the reasons shown.
- **Authority dashboard:** live SOS map, alert list, acknowledge, mock dispatch and close.
- **Emergency profile:** emergency contacts and medical details, visible only to the user, their trip guide and authorities.
- **Image uploads:** profile photo, SOS photo and trip cover through Cloudinary.
- **PWA:** installable on a phone, responsive layout, offline banner.

## Scope: implemented vs proposed

| Implemented in this prototype | Proposed / future work |
|---|---|
| Auth, trips, trip codes, route planning | Native app with background location tracking |
| Live map and location sharing | Push notifications |
| SOS flow and incident lifecycle | Real dispatch and emergency-services integration |
| Rule-based safety score, sample risk zones | ML-based risk model using real incident data |
| Authority dashboard | Multilingual interface |
| Emergency profile, Cloudinary image uploads | Smart wearable band for children (distance alert, SOS) |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Lucide icons |
| PWA | vite-plugin-pwa (Workbox) |
| Maps | Leaflet, react-leaflet, OpenStreetMap tiles |
| Backend | Supabase (Auth, PostgREST API, Realtime) |
| Database | PostgreSQL with Row Level Security |
| External services | Open-Meteo (weather), OSRM (road routes), OpenStreetMap geocoding (place search), Cloudinary (images) |
| Hosting | Vercel, auto-deployed from GitHub |

There is no custom server. The browser talks to Supabase directly, and access is controlled by Row Level Security policies in the database.

## Architecture

```
Traveller / Guide / Authority  (React PWA in the browser)
        │  HTTPS (REST)                 ▲  WebSocket (Realtime)
        ▼                               │
   Supabase:  Auth  ·  PostgREST  ·  Realtime  ·  PostgreSQL + RLS
        ▲
        │  API calls from the browser
   Open-Meteo · OSRM · OSM geocoding · Cloudinary
```

**SOS flow:** traveller taps SOS → 3-second countdown → row inserted in `sos_alerts` (RLS checks the sender) → Supabase Realtime pushes it to the guide and authority screens → banner, alarm and vibration → acknowledge / mark safe → authority confirms and closes.

**Main tables:** `profiles`, `trips`, `trip_members`, `locations`, `sos_alerts`, `emergency_profiles`, `emergency_contacts`.

---

## Safety score

The score starts at 100 and is reduced by simple, visible rules:

- night time
- bad weather (Open-Meteo)
- distance from the rest of the group
- being inside a risk zone
- travelling solo
- being far from the planned route

The reasons are shown next to the score. **It is an indicative aid, not a guarantee of safety.** Risk zones in `src/data/riskZones.json` are sample data for the demo, not real crime or hazard data.

## Privacy, consent and connectivity

- The browser asks for location permission. Nothing is tracked without it.
- Users can switch **Sharing** off at any time.
- Location is visible to members of the same trip, the trip guide and authorities.
- Emergency and medical details are stored in separate tables. Only the owner, the guide of the owner's trip and authorities can read them.
- Do not enter real medical or personal data in the demo.
- Location updates work only while the app is open in the browser. SOS and live updates need an internet connection. If the device is offline, an offline banner is shown and the SOS cannot be sent.
- Images are stored on Cloudinary; the database stores only the image URL.

---

## Getting started

**Requirements:** Node.js 18 or newer, a free Supabase project and a free Cloudinary account.

```bash
# 1. Clone
git clone https://github.com/ALOENT/Safar-Saathi.git
cd Safar-Saathi

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env      # on Windows: copy .env.example .env
# then fill in the four values listed below

# 4. Create the database (see the next section)

# 5. Start the app
npm run dev
```

### Environment variables

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project settings, API |
| `VITE_SUPABASE_ANON_KEY` | Supabase project settings, API (the publishable / anon key) |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary dashboard |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary, Settings, Upload, an **unsigned** preset |

Use only the publishable (anon) key in the frontend. Never put a service-role or secret key in `.env` or in the repository.

### Database setup

1. In Supabase, open **SQL Editor**, create a new query and run [`supabase/schema.sql`](./supabase/schema.sql). It creates the tables, triggers, Row Level Security policies and enables Realtime.
2. In **Authentication, Providers, Email**, turn off "Confirm email" for the demo.
3. Add your site URL (local and deployed) under **Authentication, URL Configuration**.
4. Create an **authority** account: sign up normally in the app, then run in the SQL Editor:

```sql
update public.profiles set role = 'authority'
where id = (select id from auth.users where email = 'your-authority@email.com');
```

### Testing on a phone

`npm run dev -- --host` serves the app on your local network. Browsers allow GPS only on `localhost` or HTTPS, so for real phone GPS use the deployed Vercel link, or Chrome DevTools, Sensors, to fake a location on a laptop.

### Build and deploy

```bash
npm run build      # production build in dist/
npm run preview    # preview the build locally
```

The repository is connected to Vercel; every push to `main` deploys automatically. Add the four environment variables in the Vercel project settings.

---

## Testing

Testing so far is manual: two or three browser windows (traveller, guide, authority) with test accounts, and faked locations through DevTools. The step-by-step flow is in [DEMO.md](./DEMO.md). There are no automated tests yet.

## Known issues

- Location is tracked only while the app tab is open (web GPS, no background tracking).
- SOS and live updates need internet. There are no push notifications.
- The safety score is rule-based and indicative; risk zones are sample data.
- "Dispatch" in the authority dashboard is a mock. No real emergency service is contacted.
- Route and place search use free public services (OSRM, OpenStreetMap) that can be slow or rate-limited.
- Authority accounts are assigned manually in the database and cannot be created from sign-up.
- No automated tests.

---

## Acknowledgements

OpenStreetMap contributors, Leaflet, Supabase, OSRM, Open-Meteo, Cloudinary and Vercel.
