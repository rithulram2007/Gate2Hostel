# Gate2Hostel 🚀

A modern, secure, full-stack peer-to-peer campus delivery platform designed for university students. Gate2Hostel bridges hostel students who need items delivered from campus gates or stores with fellow student delivery partners heading in the same direction.

---

## 📋 Table of Contents

- [Core Features](#-core-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Repository Structure](#-repository-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#1-backend-setup)
  - [Frontend Setup](#2-frontend-setup)
- [Environment Variables](#-environment-variables)
- [API Overview](#-api-overview)
- [Security & Production Hardening](#-security--production-hardening)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [License](#-license)

---

## ✨ Core Features

### 1. Peer-to-Peer Order Lifecycle
- **Order Creation:** Students create delivery requests specifying category, pickup gate, drop hostel/room, instructions, and delivery reward.
- **Partner Feed:** Delivery partners can browse available requests filtered by category, search terms, and reward amounts.
- **Workflow State Machine:** Orders transition securely through `pending` → `accepted` → `picked_up` → `delivered` (or `cancelled`).
- **Secure 6-Digit Delivery OTP:** The delivery OTP is generated upon partner pickup, hidden from public discovery feeds, and validated on delivery with rate-limited attempts.

### 2. Real-Time Tracking & Chat
- **Live State Updates:** Socket.IO events broadcast order status updates (`order:created`, `order:accepted`, `order:picked_up`, `order:delivered`, `order:cancelled`) in real time.
- **In-App Messaging:** Direct messaging between the requester and assigned delivery partner.
- **Real-Time Notifications:** Instant alerts for order updates, assignments, and deliveries.

### 3. In-App Wallet & Transactions
- **Campus Wallet:** Balance mutations for rewards and fees with atomic MongoDB operations.
- **Transaction Ledger:** Complete history of wallet transactions with status auditing.

### 4. Reviews & Dispute Resolution
- **Peer Ratings:** Students and partners can rate and review completed delivery experiences.
- **Complaint Management:** Users can raise delivery disputes and complaints with administrative resolution workflows.

### 5. Role-Based Admin Portal
- **Platform Analytics:** Real-time metrics on users, active orders, platform revenue, and completion rates.
- **User & Order Moderation:** Role management, order inspection, and dispute escalation handling.

### 6. Discovery, Pagination & High-Performance Search (Unit 9)
- **Server-Side Pagination:** `GET /api/orders` supports `page` and `limit` query parameters with metadata (`totalOrders`, `totalPages`, `hasMore`).
- **Whitelisted Sorting:** Secure sorting by `newest`, `oldest`, `reward_desc`, and `reward_asc`.
- **Safe Regex Search:** Multi-field search (title, description, pickup/drop locations) bounded to 100 characters with regex escaping to prevent ReDoS.
- **Compound Database Indexes:** Optimized queries backed by compound indexes (`{ status: 1, category: 1, createdAt: -1 }` and `{ status: 1, rewardAmount: -1 }`).

---

## 🛠 Architecture & Tech Stack

### Backend
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **Database:** MongoDB via Mongoose ODM
- **Real-Time:** Socket.IO
- **Authentication:** JWT (Access + Refresh tokens), Google OAuth 2.0 (`google-auth-library`), bcryptjs
- **Validation & Security:** Zod, Helmet, Express-Rate-Limit, CORS
- **Media Storage:** Cloudinary & Multer
- **Email:** Nodemailer (SMTP)

### Frontend
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS + PostCSS
- **Animations:** Framer Motion
- **HTTP Client:** Axios (with automatic token refresh interceptors)
- **Real-Time:** Socket.IO Client
- **Icons:** React Icons
- **Forms:** React Hook Form
- **Linter:** Oxlint

---

## 📁 Repository Structure

```
gate2hostel_modern/
├── backend/
│   ├── config/              # MongoDB, Cloudinary, and service configs
│   ├── controllers/         # Business logic for auth, orders, admin, chat, etc.
│   ├── middleware/          # Auth, role-checking, rate-limiting, error handling
│   ├── models/              # Mongoose schemas (User, Order, Wallet, Complaint, etc.)
│   ├── routes/              # Express API route declarations
│   ├── utils/               # Token hashing, OTP generation, pagination helpers
│   ├── .env.example         # Backend environment template
│   ├── package.json
│   └── server.js            # Express & Socket.IO entry point
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios API client functions
│   │   ├── components/      # UI components (Navbar, Cards, Modals, Pagination)
│   │   ├── context/         # AuthContext, SocketContext, ThemeContext
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Home, Login, Register, Dashboard, OrderDetails, Admin, Profile
│   │   ├── App.jsx          # App routing and layout
│   │   └── main.jsx         # React entry point
│   ├── .env.example         # Frontend environment template
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── README.md
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (running locally on port 27017 or a MongoDB Atlas URI)
- [Git](https://git-scm.com/)

---

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secrets, and optional Cloudinary/OAuth keys

# Start development server
npm run dev
# The API server runs at http://localhost:5000
```

---

### 2. Frontend Setup

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env

# Start development server
npm run dev
# The frontend development app runs at http://localhost:5173
```

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | Express server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/gate2hostel` |
| `JWT_ACCESS_SECRET` | Secret key for JWT access tokens | Random high-entropy string |
| `JWT_REFRESH_SECRET` | Secret key for JWT refresh tokens | Random high-entropy string |
| `JWT_ACCESS_EXPIRE` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRE` | Refresh token lifetime | `7d` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `your_google_oauth_client_id` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `your_cloudinary_name` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `your_cloudinary_key` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `your_cloudinary_secret` |
| `FRONTEND_URL` | Frontend origin for CORS | `http://localhost:5173` |

### Frontend (`frontend/.env`)

| Variable | Description | Default / Example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000/api` |
| `VITE_GOOGLE_CLIENT_ID` | Client ID for Google OAuth login | `your_google_client_id` |

---

## 📡 API Overview

| Method | Endpoint | Access | Description |
|---|---|---|---|
| **Auth** | | | |
| `POST` | `/api/auth/register` | Public | Register a new user account |
| `POST` | `/api/auth/login` | Public | Authenticate user & issue tokens |
| `POST` | `/api/auth/google` | Public | Google Single Sign-On |
| `POST` | `/api/auth/refresh` | Public | Refresh expired access token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated user profile |
| **Orders** | | | |
| `GET` | `/api/orders` | Public / Auth | Paginated orders with search, filter, and sorting |
| `POST` | `/api/orders` | Student | Create a new delivery request |
| `GET` | `/api/orders/:id` | Authenticated | Fetch order details (OTP hidden for unassigned) |
| `PATCH` | `/api/orders/:id/accept` | Partner | Accept an open delivery order |
| `PATCH` | `/api/orders/:id/pickup` | Partner | Mark order as picked up |
| `PATCH` | `/api/orders/:id/deliver` | Partner | Complete delivery using the 6-digit OTP |
| `PATCH` | `/api/orders/:id/cancel` | Student/Admin | Cancel an order |
| **Profile & Wallet** | | | |
| `GET` | `/api/profile` | Authenticated | Retrieve user profile & wallet balance |
| `GET` | `/api/transactions` | Authenticated | Retrieve wallet transaction ledger |
| **Admin** | | | |
| `GET` | `/api/admin/stats` | Admin | System dashboard metrics & analytics |
| `GET` | `/api/admin/orders` | Admin | Manage all platform orders |
| `GET` | `/api/admin/users` | Admin | User management and moderation |

---

## 🛡️ Security & Production Hardening

Gate2Hostel incorporates multi-layered defensive security practices:

- **Delivery OTP Confidentiality:** The 6-digit delivery verification OTP is marked with `select: false` in Mongoose and filtered via `.select('-otp')` so it is never exposed in public order listings or network responses.
- **Strict Query Sanitization:** Regex searches escape user input and enforce a 100-character boundary to eliminate Regular Expression Denial of Service (ReDoS).
- **Sort Whitelist:** Database sorting is restricted to explicit allowed tokens (`newest`, `oldest`, `reward_desc`, `reward_asc`), preventing injection.
- **Tiered Rate Limiting:** Dedicated rate limiters on authentication, order creation, wallet transfers, and public endpoints.
- **HTTP Security Headers:** Protected with `helmet` and secured CORS policies matching `FRONTEND_URL`.
- **Environment Isolation:** `.env` secret files are strictly excluded from version control (`.gitignore`).

---

## 🧪 Testing & Quality Assurance

- **Regression & Unit Tests:** Over 66 automated tests covering authentication, order workflows, wallet operations, rate limiting, and pagination.
- **Frontend Linter:** Zero errors verified via `oxlint`.
- **Production Build:** Verified clean Vite production builds (`npm run build`).

```bash
# Run frontend linting
cd frontend && npm run lint

# Run frontend build
cd frontend && npm run build
```

---

## 📄 License

This project is licensed under the MIT License.
