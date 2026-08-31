# PUSH LOG — Docufy PSMS

This file logs every push done by any collaborator on this repo, with the date & time in **Philippine time (PHT, UTC+8)**, who pushed, and what the push update did.

New entries are added at the bottom, below the most recent one, so the log reads oldest → newest.

---

## August 3, 2026 11:59 PM (PHT) — Francis William Garcia
**Initial commit / setup**
- First commit of the repo (project scaffolding).

---

## August 24, 2026 10:43 PM & 11:28 PM (PHT) — ethanestoya
- `improve: web responsiveness` — mobile/desktop responsiveness improvements across the app.
- Moved the user profile into the navigation bar.

---

## August 25, 2026 10:26 PM – 11:32 PM (PHT) — ethanestoya
- `fix: dashboard layout`
- `fix: print request layout`
- `fix: job board layout`
- `remove: unecessary back button - header`
- `fix: dashboard layout` (follow-up)

---

## August 26, 2026 03:33 AM (PHT) — pranswg
- `Update README.md`

---

## August 26, 2026 10:09 PM – 10:13 PM (PHT) — Francis William Garcia
- `improved mobile viewing`
- Merge remote changes into `testbranch2`
- `modified readme.md`

---

## August 27, 2026 03:26 AM (PHT) — Francis William Garcia
- `improved mobile viewing`

---

## August 28, 2026 05:20 AM (PHT) — Francis William Garcia
- Added **live PDF preview for the Job Board** and further mobile viewing improvements.

---

## August 28, 2026 09:26 PM (PHT) — Althea09-git
- `Improved Landing Page Cards`

---

## August 29, 2026 12:02 AM & 12:26 AM (PHT) — prans
- `removed attendance form and improved ui`
- `removed attendance and improved UI`

---

## August 29, 2026 12:52 AM (PHT) — Francis William Garcia
- `Remove node_modules and dist from tracking, add .gitignore`

---

## August 29, 2026 02:26 AM – 03:01 AM (PHT) — Francis William Garcia
- `Remove Reports feature and unused docs; rework README`
- `Add collaboration guide for merging changes` (COLLABORATION_GUIDE.md)
- `Remove entire inventory system for rebuild from scratch`

---

## August 29, 2026 04:14 AM (PHT) — Francis William Garcia
- **Rebuilt the inventory system from scratch** + fixed down-payment queue gating:
  - Admin-only `/admin/inventory` page with localStorage `inventoryStore` (paper-piece tracking, Stock In/Out, Add/Edit/Archive).
  - Down-payment/GCash orders gated out of the admin/staff queue until verified (Payment Verification).

---

## August 29, 2026 10:52 AM (PHT) — Francis William Garcia
- `remove live pdf preview system-wide` (committed on `testbranch-pdf` branch):
  - Removed the `print-preview-dialog.tsx` (pdfjs-dist live preview) and the `pdfjs-dist` dependency.
  - Made all print/file preview buttons inert (no window opens) pending a later rebuild.

---

## August 30, 2026 07:54 AM – 07:58 AM (PHT) — aeprnts (collaborator)
- `Add staff clock-in system, staff registration, and admin attendance monitoring`
- Merge remote `testbranch2` (reports removal, inventory rebuild) with local attendance features
- `Update AGENTS.md: staff inventory page deleted in merge; add merge integration note`
- Introduced a full **staff attendance/timekeeping system**:
  - `StaffTimesheet.tsx` (clock-in/out, timesheet, overtime/break metrics) at `/staff/timesheet`.
  - `StaffTimeInGate.tsx` — staff lockout until clocked-in on Orders / Payment Verification / Walk-in pages.
  - `AdminAttendance.tsx` — admin monitoring dashboard at `/admin/attendance`.
  - `attendanceStore.ts` + `staffRoster.ts` (storage + seeded roster).
  - Staff **registration** (admin "Register New Staff" dialog + `registerStaff` in AuthContext).
  - New routes, nav links (Clock-In & Timesheet, Attendance) and Quick Actions.

---

## August 30, 2026 10:21 PM (PHT) — Francis William Garcia
- **Created `PUSH_LOG.md`** (this log) and added the "PUSH LOG" tracking note to `AGENTS.md` (commit `59663e30`).
- Also pushed the previously-uncommitted `testbranch2` work to the remote (fast-forward `d89aa5fc..59663e30`): the PDF preview removal + the `testbranch-pdf` merge, combined with the collaborator's attendance update and the inventory system.

---

## August 31, 2026 03:53 AM (PHT) — aeprnts (collaborator)
- `feat: notifications & announcements system (priority tiers)`
- `feat: pricing management`
- `feat: payment methods + QR management`
- `feat: system-wide blue-white theme, pointer cursors, status-card redesign`
- `feat: staff management overhaul & Docufy rebrand`
- **Notifications/Announcements** — centralized `announcementsStore` + shared `NotificationsPage` (`/customer|/staff|/admin/notifications`): admin broadcasts announcements to All Users, per-user read tracking, **priority tiers (Regular / Important / Emergency)** with an **Important Announcements** section on top (red URGENT + amber IMPORTANT cards) and a clean **Notifications** section below; unread badge + amber attention dot in the sidebar (desktop + mobile). `type` field (announcement/pricing/maintenance/reminder/promo) is ready for future system-generated events.
- **Pricing Management** — `pricingStore` + `/admin/pricing`: shared pricing model (B&W / color tiers, paper-size surcharges, duplex savings, down-payment threshold) consumed live by print request, walk-in, invoice, landing, and order-tracking flows.
- **Payment Methods + QR** — `paymentMethodsStore` + `/admin/payment-methods` + shared `PaymentMethodQR`: admin-managed online payment methods used across verification and print requests (legacy hardcoded GCash pages left un-routed).

---

## August 31, 2026 04:30 AM (PHT) — prans
- `UI polish + maps + shop location` (commit `934702f8`), then **merged collaborator (aeprnts) `7d7f3761`** into `testbranch2` (merge commit `bd5c6c62`).
- **UI polish**: applied the light-blue-outline buttons (`border-2 border-blue-200`) with blue-fill-on-hover system-wide to non-destructive buttons; fixed white-on-white hover on Preview/View/status-toggle buttons.
- **Login page**: filled-blue "Log In" button + redesigned MFA "Verify" pill with press animation; "Back to Login" as a clean text-link with arrow.
- **Google Maps**: embedded a no-API-key Maps iframe in the landing page *Location* card behind a "Shop Location" button + mini window, and added a "Shop Location" button + map dialog to the customer dashboard (right of the welcome back message).
- **Merge**: resolved 5 conflicting files by keeping both feature sets (`LandingPage`, `ContentManagement`, `CustomerDashboard`, `JobBoard` hand-merged; `Staff.tsx` adopted the collaborator's authoritative rewrite). Build passes (2386 modules).

---

## August 31, 2026 04:55 AM (PHT) — prans
- Post-merge UI/UX session pushed directly to `testbranch2` (4 requests).
- **Task 1 — Live clock & date in Orders header**: `shared/UnifiedOrders.tsx` now shows a live PHT clock (updates every second) + full date (`weekday, month day, year`) under the page subtitle on the shared admin/staff Orders page.
- **Task 2 — Sidebar scroll preservation**: the mobile nav sheet (`shared/MobileNavSheet.tsx`) preserves the nav scroll position across open/close (the Radix sheet unmounts its content when closed; a `navRef` + saved `scrollTop` restores it on reopen). Desktop sidebar already persisted naturally.
- **Task 3 — Uniform buttons (Choose File reference)**: converted the remaining filled-blue primary CTAs in collaborator-added files (not covered by the earlier system-wide restyle) to the uniform white + light-blue-outline (`border-2 border-blue-200`, blue-fill-on-hover) style: `shared/NotificationsPage.tsx` (Create/Send Notification), `admin/Staff.tsx` (Add Staff / Create Staff Account / Save Changes), `admin/PricingManagement.tsx` (Save Changes), `admin/PaymentMethodsManagement.tsx` (Add Payment Method / Save). Kept AGENTS.md exclusions (destructive/red, amber warnings, green positive, status chips, nav, stateful Clock-In, and the reverted Place Order/Next Step CTAs).
- **Task 4 — Unified notifications (show both in each)**: made the bell dropdown AND the `/notifications` page show the SAME combined feed of admin announcements (`announcementsStore`) + order/payment/status system notifications (`notificationStore`). Bell dropdown (`Layout.tsx`) merges both kinds into one chronological list (announcements get priority-colored icons Megaphone/amber/red), and its unread badge now sums announcements + system notifications. The Notifications page adds a system-notification subscription, merges them into the "Notifications" section sorted newest-first with matching cards, and its unread count/mark-all-read covers both stores.
- Build passes (2386 modules).

---

## August 31, 2026 05:06 AM (PHT) — prans
- Follow-up polish pushed to `testbranch2` (3 requests).
- **SIEM security alerts removed**: deleted the admin Shield "Security Alerts" icon + its dropdown entirely from `Layout.tsx` (header) — state, presence, subscription, handlers, helpers, and the unused `Shield/MapPin/XCircle/Clock/Upload` icon imports all removed. Also deleted the now-orphaned `src/app/utils/siemAlertStore.ts` (no remaining imports anywhere). Build module count 2385.
- **Desktop sidebar scroll persistence**: the desktop sidebar `<nav>` in `Layout.tsx` now keeps its scroll position across navigation. Root cause: each page renders its own `<Layout>`, so Layout remounts on every route change and the sidebar jumped back to top. Fixed with a module-level `savedSidebarScrollTop` (survives remounts) + a `navRef`/`onScroll` on the `<nav>` and a mount-time restore. The sidebar now stays where the user left it until they scroll again. (The mobile sheet already had this from the prior push.)
- **Pricing hover text fix**: in `admin/PricingManagement.tsx`, "Reset to Defaults" (and the same-pattern per-row "Edit") buttons use `variant="outline"` whose base adds `hover:text-white` — combined with the light-blue `hover:bg-[#F2F7FF]` override it made the label white-on-light-blue (invisible). Added `hover:text-[#2F6FD6]` so the font stays a readable blue on hover.
- Build passes (2385 modules).

---

## August 31, 2026 10:31 AM (PHT) — prans
- Push of accumulated uncommitted work to `testbranch2` (5 requests this session).
- **Task 1 — Mark all as read font**: `Layout.tsx` bell dropdown "Mark all as read" button restyled to the uniform full-width style.
- **Task 2 — Search bar visibility**: added `bg-[#FBFDFF] shadow-sm ring-1 ring-blue-300` to the search inputs on `shared/UnifiedOrders`, `shared/UnifiedPaymentVerification`, `admin/InventoryManagement`, `admin/Staff`, `admin/AdminAttendance`, `shared/NotificationsPage`.
- **Task 3 — Inventory Active/Archived buttons**: moved the Active/Archived toggle next to "Add Item" in `admin/InventoryManagement.tsx` (2-col summary grid, matching button styling).
- **Task 4 — Staff AM/PM time-in/out**: `attendanceStore.ts` `getNextAction`/`timeIn`/`timeOut` are now period-aware (AM → morning, PM → afternoon; Time Out maps to the current active period). `staff/StaffTimesheet.tsx` + `shared/StaffTimeInGate.tsx` derive everything from `getCurrentPeriod()` + logs instead of the removed `nextAction` state; PHT date keys via `toDateKey(nowPHT())`.
- **Task 5 — System-wide PHT (UTC+8) time**: new centralized `src/app/utils/pht.ts` (toPHT/nowPHT/todayPHTKey/toPHTKey/formatPHTime/formatPHDate/formatPHDateTime) applied across all active display sites: announcements, order tracking, customer orders, customer dashboard notifications, shared orders (header clock + invoice + table + order-placed-at via `createdAt`), walk-in transactions, payment verification, admin attendance (adjust-dialog PHT input + late cutoff), ordersStore date key, new print request date, file-attachments upload date, Staff joinDate, job postedDate (JobApplyForm/JobBoardManagement/StaffProfile), JobBoard applied/interview dates. Dead/unrouted legacy files (AdminOrders, StaffQueueBoard, PaymentVerificationAdmin, staff/PaymentVerification) intentionally untouched.
- Also included earlier uncommitted work: Google Maps embed (LandingPage + CustomerDashboard), View Applicants uniform style (JobBoardManagement), per-user customer notifications (UnifiedOrders + NotificationsPage + Layout), bell badge removal (desktop + mobile), notification deep-open-to-order routing.
- Build passes (2386 modules).

---

## August 31, 2026 10:10 PM (PHT) — prans
- Push to `testbranch2`: fix Orders list time grouping to match the whole system.
- **Orders list time grouping fixed**: in `shared/UnifiedOrders.tsx`, the Orders table Time column already showed PHT (`formatPHTime`), but the Morning/Afternoon/Evening grouping headers used `date.getHours()` — the DEVICE-LOCAL hour, not PHT. On any browser outside the PH timezone, an order would show e.g. "09:00 AM" yet be grouped under the wrong time period. `getTimePeriod` now derives the hour in PHT via `toPHT(date).getHours()`, so the grouping matches the PHT time displayed system-wide.
- Note: the admin "Time In Limit" feature was implemented then removed (per user) before this push — no trace remains; `AdminAttendance.tsx` and `attendanceStore.ts` reverted to their committed state.
- Build passes (2386 modules).

---

## September 01, 2026 04:41 AM (PHT) — prans
- Push to `testbranch2`: system-wide header clock (internet GMT+8/Manila time) + New Print Request scroll-to-top.
- **Time utilities made timezone-independent**: `src/app/utils/pht.ts` rewritten. The old "add +8h then read device-local" hack double-added the offset on a GMT+8 device (showed 7am when it was actually 11pm). All "now"/format helpers now resolve the Manila wall-clock through `Intl.DateTimeFormat` with `timeZone: "Asia/Manila"`, so they are correct on any device. `nowPHT()` returns a synthetic Date whose device-local getters equal Manila wall-clock; `formatPHTime`/`formatPHDate` use Intl Manila directly. Internet sync (`syncInternetTime()`, worldtimeapi.org) still corrects a wrong device clock; kicked off globally in `src/main.tsx`.
- **`attendanceStore.ts`**: `nowPHT`/`formatPHT` delegate to the Intl Manila helpers (removed the +8h double-add); `formatPHT` now wraps `formatPHTime(d, { hour12:false })`.
- **Live header clock for ALL users**: `Layout.tsx` added a live clock immediately LEFT of the bell/notification icon in the shared top header (present on every authenticated page for customer/staff/admin). Desktop shows time + full date incl. year; mobile shows compact time with Clock icon. Styling: time text black, date darker blue `#2F6FD6`, reduced font sizes, no uppercase, "GMT+8" label removed. Ticks every second and re-renders once internet time resolves.
- **`UnifiedOrders.tsx` / `StaffTimesheet.tsx` / `StaffTimeInGate.tsx`**: all live clocks/timers/toast timestamps now use internet-corrected Manila time via `nowPHT()`/`toPHT()`/`internetUtcMs()`.
- **New Print Request includes images step auto-scroll**: pressing "Next Step"/"Back" in the Print Request stepper now scrolls back to the top. Root cause: the page scrolls inside Layout's `<main>` (`overflow-y-auto`), not the window, so the old `window.scrollTo(0,0)` did nothing. Added `scrollPageToTop()` (`NewPrintRequest.tsx`) which scrolls `document.querySelector("main")` (smooth) in addition to the window.
- Build passes (2386 modules).
