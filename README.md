# Roam Airbnb Clone

Roam is a high-performance, full-stack Airbnb stays marketplace built with modern web technologies: **Next.js 16 (App Router)** and **FastAPI**, backed by persistent **SQLite** data storage. It features an ultra-smooth, responsive UI with real-time updates, micro-animations, interactive Leaflet maps, accessible toast notifications, and dark mode.

---

## ⚡ Tech Stack & Highlights

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Vanilla CSS design variables (Light/Dark themes), Leaflet & OpenStreetMap.
- **Backend**: FastAPI (Python 3.13), SQLAlchemy 2.0 ORM, Alembic migrations, Pydantic v2 schemas.
- **Concurrency & Storage**: SQLite with `BEGIN IMMEDIATE` transaction locking for booking concurrency protection; persistent Docker volume storage for uploaded listing photos.
- **UX & Polish**: Smooth shrinking navbar, instant category filtering, infinite paginated loading, accessible toast notifications, interactive price pin map, and instant theme switching with anti-flash prevention.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for deeper technical design specs and domain models.

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
docker compose up --build -d
```
- **Web App**: `http://localhost:3000`
- **Backend API & Swagger Docs**: `http://localhost:8000/docs`

To stop without losing persisted data: `docker compose down`.

### Option 2: Local Development

#### Terminal 1: Backend (FastAPI)
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m alembic upgrade head
python -m app.seed
python -m uvicorn app.main:app --reload --port 8000
```

#### Terminal 2: Frontend (Next.js)
```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## 🔑 Demo Accounts

Switch profiles instantly via the account menu:

| Role | Name | Email | Highlights |
| --- | --- | --- | --- |
| **Host** | Aarav | `aarav@example.com` | Superhost with luxury stays in Manali & Goa |
| **Host** | Leela Nair | `leela@example.com` | Host with properties in Kerala & Jaipur |
| **Host** | Kabir Singh | `kabir@example.com` | Host with mountain villa properties |
| **Guest** | Maya | `maya@example.com` | Guest account with past trip history for testing reviews |

*Default password for manual auth*: `password123`.

---

## 📐 Database Schema Overview

```
users (id, email, name, hashed_password, role)
 ├── listings (id, host_id, title, city, region, nightly_price_minor, rating_hundredths, review_count, is_archived)
 │    ├── listing_photos (id, listing_id, url, sort_order)
 │    ├── reviews (id, listing_id, author_id, booking_id [UNIQUE], rating, comment)
 │    └── bookings (id, listing_id, guest_id, check_in, check_out, total_minor, status)
 └── favorites (id, user_id, listing_id)
```

---

## ✨ Core Features & System Capabilities

### 1. Smooth Pagination & Filtering
- Paginated stay fetching (16 listings/page) with client deduplication.
- Airbnb-style "Show more" loader with loaded stays status (`Showing X of Y stays`).
- Resets page sequence cleanly on category, location, or date filter changes.
- Outdated async request cancellation prevents race conditions during rapid searching.

### 2. Global Toast Notification System
- Reusable `ToastProvider` with `aria-live` accessible announcements.
- 4 variants: `success`, `error`, `warning`, `info`.
- Auto-dismissal timers, manual close buttons, and smooth CSS entry/exit animations.

### 3. Verified Host CRUD Dashboard
- Full property creation, field editing, photo uploads, and status management.
- Custom accessible confirmation modal for listing archiving (replaces browser defaults).
- Strict server-side host ownership enforcement (`403 Forbidden` for non-owners).
- Changes reflect immediately across the discovery feed, interactive map, and property pages.

### 4. Verified Stays & Review Eligibility
- `POST /api/v1/listings/{id}/reviews` restricted strictly to guests with completed stays (`check_out <= today`).
- Prevents duplicate reviews for the same reservation using unique `booking_id` constraints.
- Atomic backend recalculation of listing aggregate ratings (`rating_hundredths`, `review_count`).

### 5. Superhost Badging & Aggregation
- Automated Superhost status calculation: Host must possess **>= 3 reviews** with an **average rating >= 4.80**.
- Superhost badges rendered dynamically on listing cards, detail host cards, and host management views.

### 6. Interactive Leaflet Map
- Client-only dynamic loading (SSR-safe) powered by OpenStreetMap tiles.
- Custom price badge markers styled like standard Airbnb price pins.
- Interactive popups displaying cover photo, location, price, rating, and direct property link.
- Graceful tile fallback state handling.

### 7. Dark Mode & Modern Styling
- Light, Dark, and System preference options stored in `localStorage`.
- Zero theme-flash loading via inline root layout scripts.
- Comprehensive CSS design tokens covering all components, cards, popovers, modals, and maps.

---

## 🧪 Testing & Verification Commands

```powershell
# Backend pytest suite (17 integration tests)
cd backend
python -m pytest -v tests/test_api.py

# Frontend linting & build verification
cd frontend
npm run lint
npm run build
```


