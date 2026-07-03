# LastMile Delivery Tracker

A full-stack last-mile delivery management platform built for a logistics operations assignment. Customers place orders, charges are auto-calculated using a zone + volumetric weight engine, agents are assigned (manually or automatically), and everyone gets real-time status visibility through email notifications and a live tracking timeline.

**Stack:** React.js · Node.js (Express) · MySQL

---

## 1. Project Structure

```
lastmile/
├── backend/
│   ├── config/
│   │   ├── db.js              # MySQL connection pool
│   │   └── schema.sql         # Full DB schema + seed admin user
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── orderController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   └── auth.js            # JWT verification + role guard
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── orderRoutes.js
│   │   └── adminRoutes.js
│   ├── utils/
│   │   ├── rateEngine.js      # Zone detection + charge calculation
│   │   ├── agentAssignment.js # Nearest-agent auto-assignment
│   │   └── mailer.js          # Email notification templates
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Login.js / Register.js
    │   │   ├── Customer/  (Dashboard, NewOrder, OrderDetail)
    │   │   ├── Agent/     (AgentDashboard)
    │   │   └── Admin/     (Dashboard + Orders/Zones/RateCards/Agents tabs)
    │   ├── components/    (Topbar, StatusPill, ProtectedRoute)
    │   ├── context/       (AuthContext)
    │   ├── utils/         (api.js — axios instance)
    │   └── styles/global.css
    ├── .env.example
    └── package.json
```

---

## 2. Prerequisites

- Node.js v18+
- MySQL 8.x running locally (or any reachable instance)
- A Gmail account with an **App Password** (for email notifications) — regular passwords won't work since Google requires 2FA + app passwords for SMTP

---

## 3. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your actual values:

```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=lastmile_db
JWT_SECRET=some_long_random_string
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_char_app_password
```

**Initialize the database:**

```bash
mysql -u root -p < config/schema.sql
```

This creates the `lastmile_db` database, all 7 tables, and a default admin account:
- Email: `admin@lastmile.com`
- Password: `Admin@123`

**Start the server:**

```bash
npm run dev    # with nodemon, auto-restarts on changes
# or
npm start
```

Server runs on `http://localhost:5000`. Test it with `GET /api/health`.

---

## 4. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

`.env` should point to your backend:

```
REACT_APP_API_URL=http://localhost:5000/api
```

**Start the app:**

```bash
npm start
```

Runs on `http://localhost:3000`.

---

## 5. Getting Started (Demo Flow)

1. Log in as admin (`admin@lastmile.com` / `Admin@123`)
2. Go to **Zones & Areas** → create a couple of zones (e.g. "Bengaluru Central", "Bengaluru East") and add areas with real 6-digit pincodes to each
3. Go to **Rate Cards** → create rate cards for each zone pair, for both B2B and B2C, with a rate per kg and optional COD surcharge
4. Go to **Agents** → create 1-2 delivery agent accounts and assign them to zones
5. Register a customer account (or use the customer flow from `/register`)
6. As a customer, place a new order — enter pickup/drop addresses **including the pincode you configured**, package dimensions, and weight. The charge preview will calculate automatically.
7. Back in the admin panel, go to **Orders** → click **Auto-assign** or **Manual** to assign an agent
8. Log in as that agent → update the order status step by step (Picked Up → In Transit → Out for Delivery → Delivered)
9. Each status change triggers an email to the customer and is logged immutably in the tracking timeline, visible on the customer's order detail page
10. To test the failed delivery flow, mark an order as "Failed" from the agent dashboard, then log in as the customer and use the **Reschedule** option on that order

---

## 6. Rate Calculation Logic

This is the core of the assignment, so here's exactly how it works (implemented in `backend/utils/rateEngine.js`):

**Step 1 — Zone detection:** The pickup and drop addresses are scanned for a 6-digit pincode. If found, it's matched against the `areas` table to resolve a zone. If no pincode match is found, the system falls back to checking if any configured area name appears as a substring in the address text.

**Step 2 — Volumetric weight:** Calculated as `(Length × Breadth × Height) / 5000`, where dimensions are in centimeters. This is the industry-standard formula used by most Indian courier companies.

**Step 3 — Billed weight:** The system bills on whichever is higher — actual weight or volumetric weight. This protects against bulky-but-light packages being underpriced.

**Step 4 — Rate card lookup:** Using the detected pickup zone, drop zone, and the order's type (B2B or B2C), the system looks up the matching row in `rate_cards`. Each zone-pair + order-type combination has its own configurable rate per kg and minimum charge — nothing is hardcoded.

**Step 5 — COD surcharge:** If the payment type is COD, the surcharge configured on that rate card is added on top.

**Step 6 — Preview before confirm:** The full breakdown (volumetric weight, billed weight, delivery charge, COD surcharge, total) is shown to the customer via the `/orders/preview-charge` endpoint before they confirm the order — same calculation logic is reused on actual order creation so the numbers always match.

---

## 7. Auto-Assignment Logic

Implemented in `backend/utils/agentAssignment.js`:

1. Fetch all agents currently marked `is_available = TRUE`
2. Prefer agents whose `zone_id` matches the order's pickup zone (SQL `ORDER BY (zone_id = ?) DESC`)
3. Among those, if GPS coordinates (`current_lat`, `current_lng`) are available, calculate distance to the pickup point using the Haversine formula and pick the closest
4. If no GPS data exists, fall back to the first zone-matched agent
5. Assign the agent, flip the order status to "Assigned", and mark the agent as unavailable (`is_available = FALSE`) until they complete the delivery

Admins can override this at any time with a manual assignment from the dropdown.

---

## 8. Order Status Lifecycle & Tracking History

Statuses flow: `Pending → Assigned → Picked Up → In Transit → Out for Delivery → Delivered` (or `Failed` at any point post-assignment).

Every single status change — whether triggered by the agent, the customer (via reschedule), or an admin override — writes a new row into `order_tracking` with the status, the actor's user ID and role, an optional note, and a timestamp. Rows are never updated or deleted, only inserted, so the full history is always reconstructable and auditable. The customer's order detail page renders this as a visual timeline.

---

## 9. Failed Delivery & Reschedule Flow

1. Agent marks an order "Failed" with a reason note
2. Order status updates, customer receives an email notification
3. Customer opens the order detail page, sees the "Failed" banner, and picks a new date
4. On reschedule: a row is added to `reschedules`, the order status resets to "Pending", `scheduled_date` is updated, and the previously assigned agent is freed up (`is_available = TRUE`) since they're no longer responsible for it
5. Admin (or auto-assign) then assigns a — potentially different — agent for the new attempt

---

## 10. API Documentation

Base URL: `http://localhost:5000/api`

All routes except `/auth/register` and `/auth/login` require a `Authorization: Bearer <token>` header.

### Auth
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a new customer |
| POST | `/auth/login` | Public | Log in, returns JWT + user object |

### Orders
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/orders/preview-charge` | Customer, Admin | Calculate charge without creating the order |
| POST | `/orders` | Customer, Admin | Create a new order (admin can pass `customerId` to create on a customer's behalf) |
| GET | `/orders` | All (role-scoped) | List orders — customers see their own, agents see assigned, admin sees all (supports `?status=&zone=&agentId=` filters) |
| GET | `/orders/:id` | All | Get order details + full tracking timeline |
| PATCH | `/orders/:id/status` | Agent, Admin | Update order status (`Picked Up`, `In Transit`, `Out for Delivery`, `Delivered`, `Failed`) |
| PATCH | `/orders/:id/assign` | Admin | Assign agent — pass `{ agentId }` for manual or `{ auto: true }` for auto-assignment |
| PATCH | `/orders/:id/reschedule` | Customer, Admin | Reschedule a failed delivery — pass `{ newDate }` |

### Admin — Zones & Areas
| Method | Endpoint | Access |
|---|---|---|
| POST / GET / DELETE | `/admin/zones` `/admin/zones/:id` | Admin (GET open to all roles) |
| POST / GET / DELETE | `/admin/areas` `/admin/areas/:id` | Admin |

### Admin — Rate Cards
| Method | Endpoint | Access |
|---|---|---|
| POST | `/admin/rate-cards` | Admin |
| GET | `/admin/rate-cards` | Admin |
| PUT | `/admin/rate-cards/:id` | Admin |
| DELETE | `/admin/rate-cards/:id` | Admin |

### Admin — Agents & Users
| Method | Endpoint | Access |
|---|---|---|
| POST | `/admin/agents` | Admin — creates both the user account and agent profile |
| GET | `/admin/agents` | Admin |
| PATCH | `/admin/agents/location` | Agent — agent updates own GPS coordinates |
| GET | `/admin/users` | Admin |

---

## 11. Database Schema Summary

- **users** — all accounts (customer / agent / admin), role-based
- **zones** — top-level delivery zones
- **areas** — pincode-to-zone mapping, many areas per zone
- **rate_cards** — per zone-pair, per order-type pricing config
- **delivery_agents** — links a user to a zone + GPS + availability flag
- **orders** — full order record with computed charge fields
- **order_tracking** — immutable append-only status history
- **reschedules** — log of reschedule requests per order

Full DDL is in `backend/config/schema.sql`.

---

## 12. Notes on Email/SMS Integration

Email notifications use **Nodemailer with Gmail SMTP** (free tier, no API key needed beyond an app password). SMS was scoped out for this build to keep the deliverable focused, but the same trigger points in `orderController.js` (`sendEmail(...)` calls) are where an SMS provider call (e.g. Twilio free trial) would slot in — the notification logic is already isolated in `utils/mailer.js` so swapping/adding a channel doesn't touch business logic.

---

## 13. Known Limitations / Future Improvements

- Zone detection is pincode/text-match based rather than true geocoding — sufficient for the assignment scope but would use a maps API (Google Geocoding, Mapbox) in production
- Agent GPS coordinates are manually settable via API; a real app would pull this from a mobile app's live location
- No payment gateway integration — COD vs Prepaid is tracked but Prepaid doesn't process an actual transaction
- Single hosting region assumed; no multi-warehouse/hub routing logic
