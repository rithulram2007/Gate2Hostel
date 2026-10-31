# Gate2Hostel — Phase 0 + Phase 1 (Setup + Auth) + Phase 2 (Order Management)

Phase 1 (authentication) is complete and untouched by this update. Phase 2 adds
the full Order Management module on top of it.

## What's included in this phase

**Backend (`/server`)**
- Layered architecture: routes → controllers → services → models
- MongoDB/Mongoose models: `User`, `Wallet`
- JWT auth (access + refresh tokens, httpOnly cookies) with silent-refresh support
- bcrypt password hashing, VIT-email-only registration (`@vitstudent.ac.in`)
- Email verification + forgot/reset password flow (Nodemailer)
- Role-based access control middleware (`requireAuth`, `requireRole`)
- Centralized error handling (`ApiError` / `errorHandler`)
- Security: Helmet, CORS, rate limiting on auth routes, Mongo sanitization
- Socket.IO bootstrap (handlers land in Phase 5)

**Frontend (`/client`)**
- React + Vite + Tailwind, with a custom design token system (see `tailwind.config.js`)
- `AuthContext` + `ThemeContext`, `useAuth`/`useTheme` hooks
- Axios instance with automatic access-token refresh on 401
- Pages: Landing, Login, Register, Forgot/Reset Password, Verify Email
- `ProtectedRoute` with role-based route guarding
- Role dashboard placeholders (student/partner/admin) — filled in from Phase 4 onward

## Running it locally

### Backend
```bash
cd server
cp .env.example .env   # fill in MONGO_URI, JWT secrets, SMTP creds
npm install
npm run dev             # http://localhost:5000
```

### Frontend
```bash
cd client
cp .env.example .env
npm install
npm run dev              # http://localhost:5173
```

Make sure `CLIENT_URL` in the server `.env` matches the Vite dev URL — CORS and cookie settings depend on it.

## Testing the auth flow

1. `POST /api/auth/register` with a `@vitstudent.ac.in` email → check your inbox (via the SMTP creds you configured) for the verification link.
2. Visit `/verify-email/:token` on the frontend, or hit `GET /api/auth/verify-email/:token` directly.
3. `POST /api/auth/login` → sets `accessToken`/`refreshToken` httpOnly cookies.
4. `GET /api/auth/me` → returns the current user (requires the cookies).
5. Access token expires in 15 minutes; the frontend's axios interceptor calls `/api/auth/refresh` automatically and retries.

## Phase 2 — Order Management

### What's included

**Backend**
- `Order` model: student/partner refs, category, items array, pickup gate, drop hostel/block/room, instructions, Cloudinary-ready image field, pricing (auto-computed `totalAmount`), status + `statusHistory` audit trail, OTP (hashed, rate-limited), cancellation record.
- Status workflow: `pending → accepted → picked_up → delivered`, with `cancelled` reachable from `pending`/`accepted` (and by admin at any non-terminal state). Each transition is its own service function with its own authorization rule — not a single generic `PATCH /status` endpoint — because who's allowed to make each transition differs (student creates/edits/cancels; partner accepts/picks-up/delivers).
- A partner backing out after accepting (before pickup) reopens the order to the feed via `/unassign`, rather than cancelling it — the student still wants it fulfilled.
- OTP is generated when a partner accepts, emailed to the student, and stored **hashed** (not reversible) — same pattern as Phase 1's password-reset tokens, extracted into a shared `utils/hashToken.js`. Since it can't be un-hashed, there's a `resend-otp` action instead of a "get OTP" endpoint. Verification is capped at 5 attempts.
- Pagination + filtering (`page`, `limit`, `status`, `category`, `dropHostel`, `minReward`, `maxReward`, `sort`) via a shared `utils/paginate.js`, reusable by future list endpoints (reviews, complaints, users).
- Socket.IO hooks: `order:created`, `order:accepted`, `order:picked_up`, `order:delivered`, `order:cancelled`, `order:reopened` are emitted at each transition via a new `sockets/socketManager.js` singleton. No client subscribes to these yet — Phase 5 builds the authenticated real-time layer. Emitting now means Phase 5 doesn't have to touch this service.
- Everything above is additive: `app.js` gained one import + one `app.use` line, `validate.middleware.js` gained one new named export (`validateQuery`) alongside the untouched original, and `sockets/index.js` gained a singleton registration + a lightweight room-join handler. `auth.service.js`, `auth.controller.js`, `auth.routes.js`, and every Phase 1 model are unmodified.

**Frontend**
- `src/api/order.api.js` — one function per endpoint below, matching this contract exactly.

### API Contract

All routes are prefixed `/api/orders` and require authentication (the existing `accessToken` cookie). Role required is noted per route.

| Method | Route | Role | Body / Query | Notes |
|---|---|---|---|---|
| POST | `/` | student | `{ category, items[], pickupGate, dropHostel, dropBlock, dropRoom, instructions?, deliveryReward, expectedTime? }` | Creates a pending order |
| GET | `/mine` | student | query: `page, limit, status?, category?, sort?` | Own order history |
| GET | `/feed` | partner | query: `page, limit, category?, dropHostel?, minReward?, maxReward?, sort?` | Open, unassigned pending orders |
| GET | `/assigned` | partner | query: `page, limit, status?, category?, sort?` | Own accepted/in-progress/completed deliveries |
| GET | `/` | admin | query: `page, limit, status?, category?, dropHostel?, sort?` | All orders |
| GET | `/:id` | owner student / assigned partner / admin | — | Single order detail |
| PATCH | `/:id` | student (owner) | any subset of the create fields | Only while `status === 'pending'` |
| DELETE | `/:id` | student (owner) / admin | — | Only while `status === 'pending'` — hard delete |
| PATCH | `/:id/accept` | partner | — | `pending → accepted`; generates + emails OTP |
| PATCH | `/:id/unassign` | partner (assigned) | — | `accepted → pending`; partner backs out |
| PATCH | `/:id/pickup` | partner (assigned) | — | `accepted → picked_up` |
| PATCH | `/:id/deliver` | partner (assigned) | `{ otp: "123456" }` | `picked_up → delivered`; verifies OTP |
| PATCH | `/:id/cancel` | student (owner) / admin | `{ reason? }` | `pending`/`accepted → cancelled` (admin can cancel later states too) |
| POST | `/:id/resend-otp` | student (owner) | — | Invalidates the old OTP, emails a new one |

Every response follows Phase 1's envelope: `{ statusCode, data, message, success }`. List endpoints return `data: { orders: [...], pagination: { currentPage, pageSize, totalCount, totalPages, hasNextPage, hasPrevPage } }`.

### Testing the order flow

1. Log in as a student → `POST /api/orders` with a valid payload.
2. Log in as a partner (separate account) → `GET /api/orders/feed` should list it → `PATCH /api/orders/:id/accept`. The student receives an OTP by email.
3. Partner: `PATCH /api/orders/:id/pickup`, then `PATCH /api/orders/:id/deliver` with the OTP from the email.
4. Student: `GET /api/orders/mine` should show it as `delivered`.

## Next up (Phase 3)

Frontend Shell: the dashboard placeholders from Phase 1 get replaced with real order-creation forms, the partner feed UI, and order-detail/tracking views wired to `order.api.js` above — plus the reusable component library (cards, tables, filters) the later phases will reuse.

Let me know when you're ready and I'll continue to Phase 3.
