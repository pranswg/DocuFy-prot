# DocuFy PSMS

**DocuFy PSMS** (Print Shop Management System) is a frontend prototype for managing a print shop's day-to-day operations. It provides role-based dashboards for **Customers**, **Staff**, and **Admins**, covering everything from placing print orders to managing inventory, employees, and job applications.

> **Note:** This is a frontend-only prototype. There is no backend — data is stored in `localStorage` and in-memory and does not persist across sessions/devices.

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** (build tool & dev server)
- **Tailwind CSS v4** (styling)
- **Radix UI** / **shadcn/ui** components
- **React Router** (routing)
- **Recharts** (charts), **Lucide** (icons), **MUI** (Material UI)

## Features

### Roles

The app has three roles, each with its own set of pages and permissions:

| Role   | Highlights |
|--------|-----------|
| **Customer** | Dashboard, new print requests, order history & tracking, online payments, job board & applications |
| **Staff** | Dashboard with KPIs, order queue, walk-in transactions, payment verification, inventory |
| **Admin** | Full dashboard, order/payment/inventory management, staff & employee management, job board management, content management |

### Key Modules

- **Authentication** — role-based routing with `ProtectedRoute`; customer, staff, and admin accounts.
- **Orders** — customers submit print requests; staff move them through statuses (Received → In Queue → Printing → Completed → Released); customers can track progress and cancel in-queue orders.
- **Payments** — online payment flow with verification by staff/admin.
- **Job Board** — the shop posts open positions; customers apply; admins review and manage applicants.
- **Inventory** — stock tracking with automatic deduction when orders are fulfilled.
- **Notifications** — role-specific in-app notifications (order status changes, payment verifications, job applications, inventory alerts).
- **Responsive UI** — a uniform blue/white theme with a responsive layout (sidebar + header, plus a mobile bottom sheet).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (18+)

### Install

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

### Build for production

```bash
npm run build
```

The built app is output to `dist/`.

## Project Structure

```
src/
├── app/
│   ├── App.tsx             # Router setup (role-based routes)
│   ├── components/         # Pages & shared UI
│   │   ├── admin/
│   │   ├── customer/
│   │   ├── staff/
│   │   ├── shared/
│   │   └── ui/             # shadcn/ui primitives
│   ├── contexts/           # Auth, mobile-nav state
│   └── utils/              # Stores & helpers (orders, inventory, jobs, etc.)
├── assets/
└── styles/                 # Tailwind + global styles
```

## Data & Backend

This prototype runs entirely in the browser:

- **`localStorage`** persists data like jobs and orders *per browser*.
- File uploads (e.g., portfolio/attachments) are **in-memory only** — they are not shared across sessions or devices.

Real multi-device sharing and durability require connecting a backend (e.g., Supabase) and moving the stores (`ordersStore`, `jobsStore`, `inventoryStore`, etc.) to database tables plus storage for uploaded files.
