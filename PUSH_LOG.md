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

---

## September 01, 2026 08:26 AM (PHT) — prans
- Push to `testbranch2`: multi-dimensional pricing matrix (store + admin + order-flow adoption) along with other accumulated updates.
- **Multi-dimensional pricing matrix (pricingStore)**: `src/app/utils/pricingStore.ts` gained a full pricing matrix on top of the legacy flat rates (legacy kept working, labelled "Legacy Per-Page Rates" on admin). New `ColorTier`/`ContentType`/`PaperSizeKey`/`PhotoSizeKey`/`ServiceType` types + `PricingMatrix` (document[content][color][size], vellum[color][size], sticker[color], photo[price/minQty]); `DEFAULT_MATRIX` with published prices (Photo 2R ₱10 min 6 … A4 ₱60); `STORAGE_VERSION` 1.0→2.0 (reseeds, matrix persisted). Store API: `getMatrix`/`updateMatrixCell`/`setMatrix`/`resetPricing` (+ matrix), `getPriceFromMatrix`, `resolveColorTier`, `mapPaperSizeKey`, label maps + `SERVICE_TAB_LABELS`. `admin/PricingManagement.tsx` rebuilt: tabs per service type (Document card-grids, Vellum color×size table, Sticker per-sheet, Photo price + min order) + Legacy rates section.
- **Order flow adopts matrix + Photo as per-file print type** (customer `NewPrintRequest.tsx` + shared `UnifiedWalkInTransactions.tsx`, both flows): Step-1 service-type selector (Document/Vellum/Sticker/Photo grid) and global Photo config panel REMOVED — every order uploads files in Step 1 and Photo is now a per-file **Print Type** in Step 2 with its own size/finish/qty (`FileData.printType` incl. `"photo"` + `photoSize/photoFinish/photoQty`, defaults `2R`/`matte`/`1`); per-file matrix pricing via `getPriceFromMatrix`, photo → `matrix.photo[size].price * max(1, qty)` with per-file min-qty validation on submit; Step 2 print-type buttons styled like the Back button (`variant="outline"` grid, icons Layers/FileText/StickyNote/Camera); Step 1 headings fixed; Step 4 per-file cards + breakdown dialog show photo info; paper sizes capitalized. PRINT-TYPE HOVER/ACTIVE THEMING: `group` + `group-hover:text-white` on icons/labels (visible on the dark-blue outline hover fill — fixes the perceived "deselect"); selected button = filled blue `bg-[#2F6FD6] text-white`, `transition-all duration-150 active:scale-95` press animation.
- **Dead file-preview UI removed system-wide**: `file-attachments.tsx` dropped inert "View" button + `onView` prop (and unused `Eye`/`Button` imports); `OrderTracking.tsx` removed dead `handleViewFile`/`onView` (kept live "View Invoice"/"View Page Color Breakdown"); `UnifiedOrders.tsx` removed dead `onView`; removed now-unused `Eye` (both flows) + `SERVICE_TYPE_LABELS` (walk-in).
- Build passes.

---

## September 01, 2026 10:26 AM (PHT) — prans
- Push to `testbranch2`: merged pranswg's update (9 commits, 7d7f3761..4fc8fe95) with local Reports/dashboard/inventory work.
- **Dashboard full rewrite** (`admin/AdminDashboard.tsx`): header + welcome + date-range dropdown (This Month/Last Month/This Quarter/This Year/All Time/Custom), 3 tabs **Overview | Sales | Services**, no Inventory tab. Overview with 4 summary cards, Sales Trend area chart, Sales Comparison, Best Selling Services, Top Used Paper Sizes donut, Recent Transactions, **Inventory Snapshot** (Total/Low/Out cards + urgent items + "All inventory levels are currently healthy" + View Inventory button → `/admin/inventory`). All data computed from `dataStore`/`inventoryStore`, no hardcoding.
- **Inventory Reports added** (`admin/InventoryManagement.tsx`): module nav "Inventory Overview | Reports"; Reports section with header + date filter (Today/This Week/This Month/Last Month/Custom), summary cards (Total/Low/Out/Stock In/Stock Out), Most Used Materials, Stock Movement bar chart, Inventory Alerts, Stock-In/Stock-Out history tables, Current Inventory Report table, category + item filters.
- **`inventoryStore.ts` stock-movement tracking**: new `StockMovement`/`StockMovementType` types + `movements[]` persisted to `localStorage('inventoryMovements')`, version bumped to `3.0`, `recordMovement()` helper; `stockIn`/`stockOut`/`deductPaperPieces` now record movements (person + reason); `getMovements(type?)`. `NewPrintRequest.tsx` `deductPaperPieces` call unchanged/backward-compatible.
- **Merged with pranswg's remote update**: pranswg redesigned `InventoryManagement.tsx` overview (2-col summary cards, Active/Archived toggle moved into the toolbar, white-base KPI button styling). The merge kept BOTH his overview redesign AND my Reports section — only the React import line conflicted (resolved to keep `useEffect` + `useMemo`).
- Build passes.

---

## September 01, 2026 09:21 PM (PHT) — prans
- Push to `testbranch2`: merged aeprnts's dashboard/inventory-reports work + expanded mock sales data for dashboard testing.
- **Merge commit** `100acb00` pulled in aeprnts's `96c41a6` ("Add dynamic admin dashboard (Overview/Sales/Services) & inventory reports; stock-movement tracking") — `AdminDashboard.tsx` 3-tab rewrite, `InventoryManagement.tsx` Inventory Overview | Reports toggle, `inventoryStore.ts` stock-movement tracking (v3.0, `inventoryMovements` localStorage). Only `PUSH_LOG.md` conflicted (kept both entries, oldest→newest).
- **Mock customers** `c52332b0`: two online GCash orders seeded in `dataStore` for Payment Verification + Orders-list UI checking (Maria Santos pending / John Dela Cruz in-queue).
- **`src/app/utils/dataStore.ts`**: added **10 more seed orders** (`ORD-2026-0003` → `ORD-2026-0012`) spanning **Jun–Sep 2026** so the admin dashboard has a multi-month **Sales Trend**, varied **Best Selling Services** (Colored/B&W/Photocopy/School Supplies), a filled **paper-size donut** (A4/Short/Long), meaningful **Total Sales / Orders / walk-in / active-customer** KPIs, and populated **Recent Transactions**. Kept the two Payment-Verification orders. Old months are mostly `Completed`/`Released`; one Aug order is `Canceled` (excluded from revenue); Sep has three completed/released today. First time the local branch reflects BOTH prans + aeprnts work in one history for aeprnts to pull.

---

## September 01, 2026 09:37 PM (PHT) — prans
- Push to `testbranch2`: fixed Admin Dashboard Sales tab — trend views now aggregate ALL orders regardless of the selected date range.
- **`src/app/components/admin/AdminDashboard.tsx`**: the Sales tab defaulted to a "This Month" range, so its Daily/Weekly/Monthly trend charts only surfaced September's few orders (looked flat/broken) while the Overview's Sales Trend (all-orders) looked fine. Fix: `dailySales`, `weeklySales`, AND `monthlySales` in `computeMetrics` now iterate over ALL orders (not the range-scoped `filtered`), so all three Sales-tab views show the full Jun–Sep history regardless of the dropdown. Added shared `MONTH_INDEX` constant + `sortByMonthDay()` helper so Daily/Weekly buckets sort chronologically (oldest→newest) like Monthly. Range-scoped values (Total Revenue KPI, Sales Comparison, Best Selling, paper donut, recent transactions) unchanged. Build passes.

---

## September 01, 2026 10:45 PM (PHT) — prans
- Push to `testbranch2`: session persistence, legacy order pages deleted, and collapsed-sidebar fixes.
- **Session persistence (refresh no longer logs you out)**: the auth state now remembers the logged-in user across page reloads. Refreshing while signed in keeps you on the page instead of bouncing back to the login screen; signing out clears it, and the 15-minute inactivity auto-logout still works.
- **Deleted the dead legacy order pages**: `StaffQueueBoard` (staff) and `AdminOrders` (admin) were imported but never routed (live pages are `StaffOrdersUnified` under `/staff/queue` and `AdminOrdersUnified` under `/admin/orders`). Previewed them first via temporary routes, then removed the files, their dead imports, and the temporary routes, and cleaned up the leftover comments referencing them.
- **Fixed collapsed-sidebar hover labels**: in desktop collapsed mode, hovering an icon (like Payment Verification) showed the label floating at the bottom instead of beside the icon. Names are now positioned right next to the hovered icon, vertically centered on it, and clear when the sidebar scrolls.
- **Fixed the collapsed-sidebar Profile button**: clicking the profile avatar while collapsed used to open a floating dropdown over the rail. It now expands the whole sidebar first (showing the full profile button) and opens the profile menu, matching the intended behavior.

---

## September 2, 2026 12:47 AM (PHT) - prans
- Push to `testbranch2`: system-wide in-app confirmation dialogs for every significant data-changing action (no browser alerts).
- **Rebuilt the shared `ConfirmationDialog`** (`src/app/components/ui/confirmation-dialog.tsx`) so every module confirms with an EXACT action-name confirm button (e.g. `Place Order`, `Cancel Order`, `Stock Out`, `Save Changes`, `Approve Payment`, `Reject Payment`) and a SAFE cancel label (`Go Back`/`Keep Item`/`Keep It`). Older dialogs no longer force typing `Docufy` (`requirePhrase` is now opt-in and reserved for highly destructive/irreversible actions: Payment Method delete, Pricing reset, Order cancellation, Payment rejection, Attendance reset day, Notification delete). Optional `loading` prop shows a spinner and disables both buttons as a duplicate-submit guard. Destructive styling stays on deletes/rejects/cancels; positive/save/approve actions use the non-destructive state.
- **Confirmation added to customer flows**: New Print Request `Place Order` (confirms file count/pages/total + payment method before reserving paper and creating the order); Payment Verification `Submit Reference`/`Confirm Order` (queued for admin/staff approval); Job Board customer application `Submit Application` (portfolio file noted); Walk-in Transactions `Proceed to In Queue` (order summary + total before enqueueing).
- **Confirmation added to Notifications**: the old browser `confirm()` for deleting a notification was replaced with the shared dialog (type `Docufy` + `Delete Notification`/`Keep It`); broadcasting a new announcement now confirms `Send ... Notification` first. Removed the last remaining `window.confirm()`/`alert()` calls in the app.
- **Sign Out confirmation everywhere**: Layout desktop sidebar + top-right profile menu, the mobile nav sheet, and the Customer/Staff/Admin profile pages now confirm `Sign Out` (`Stay Signed In` to cancel).
- **Staff Timesheet**: Time In / Time Out actions now confirm (live timer context + session name shown).
- **Staff admin page**: the Activate/Deactivate staff dialogs now use exact buttons `Activate`/`Deactivate` (were generic `Confirm`).
- All of the above build cleanly (`npm run build` passes; only the pre-existing large-chunk warning remains).

## September 2, 2026 (PHT) - prans
- Inventory Low Stock / Out of Stock alerts: added an automatic inventory alert module that watches the inventory store and emits a system notification whenever an item drops to or below its minimum stock (`Low Stock`, amber, Important). If an item runs completely out of stock, it emits an emergency `Out of Stock` alert (red, Emergency) instead. Alerts only go to **Staff and Admin** (not customers), each alert fires once per item (a localStorage state prevents duplicates while the item stays at the same status), and a low-stock alert is promoted to emergency if the item later goes fully out of stock. New alerts show at the top of the notifications panel, and the bell icon shows a colored unread dot (red for emergency, amber for important).
- **Staff Inventory page**: added a new read-only **Inventory** page for staff at `/staff/inventory` in the sidebar (also reachable by clicking `View Inventory` on an alert). It shows summary cards, a papers-left (pieces) card, and a filterable table with `All` / `Low Stock` / `Out of Stock` filter chips, so staff can see low/out items at a glance without editing stock.
- **View Inventory action from notifications**: the `View Inventory` button on an inventory alert runs the correct page for the signed-in role — `/staff/inventory` for staff, `/admin/inventory` for admin.
- **Inventory-aware notifications**: the notifications page now renders inventory alerts with color-coded styling (red emergency border + icon / amber important border + icon). Because this is a system alert, it only shows a `View Inventory` button and cannot be marked read.
- **Dashboard inventory snapshot**: the admin dashboard's Inventory snapshot now uses the same shared status logic as the rest of the app to detect low/out items, so the snapshot and the alerts stay consistent with the inventory page.
- All of the above build cleanly (`npm run build` passes; only the pre-existing large-chunk warning remains).

---

## September 3, 2026 09:35 AM (PHT) — prans
- Push to `testbranch2`: merged aeprnts's inventory alerts / confirmation-dialog work into the local branch and landed the "Home" + order-list + nav-order changes.
- **Merged aeprnts's commits locally** (`0b5e2763` confirmation dialogs + `3b904ea7` inventory low/out alerts & staff inventory page), resolving import conflicts in `Layout.tsx` and `MobileNavSheet.tsx` by keeping both sides' icon imports (`Home` + `Boxes`). Build passes.
- **"Home" added to profile dropdowns**: the desktop sidebar, top-right profile menu, and mobile nav profile dropdowns now include a **Home** option that navigates back to the landing page (`/`) for all roles.
- **Order list columns + details dialog cleanup** (`unified/UnifiedOrders.tsx`): removed the Type/Pages/Copies columns (and their sort wiring) from the admin/staff orders table for a tidier list; collapsed the Print Job Details and Additional Information sections of the order-details dialog so each is one unified container with hairline-separated grid cells (Attached Files, status/payment, hold/cancel/notes, Verify Payment inside).
- **Admin & staff sidebar tab order** (`adminMenuItems.tsx` + all staff page menus + mobile nav): reordered in both sidebars to: Dashboard, Walk-in Transactions, Payment Verification, Orders, Inventory, Attendance (admin), Staff (admin), Job Board (admin), Pricing Management (admin), Content Management (admin), Notifications. Staff keeps its staff-only **Clock-In & Timesheet** right after Dashboard; both keep **Inventory** and **Notifications**; admin keeps **Payment Methods** after Payment Verification.
- Build passes.

---

## September 3, 2026 01:35 PM (PHT) — prans
- **Reverted the customer mobile responsive polish** (`98ed32a2`, reverts `140574d1`): the previous push added an Order Progress timeline to `OrderTracking`, turned the CustomerDashboard/CustomerOrders order lists into mobile card rows, added a "Start a New Order" CTA to the customer dashboard, and reworked the NewPrintRequest nav buttons. These were deemed incorrect and reverted wholesale — the customer files (CustomerDashboard, CustomerOrders, NewPrintRequest, OrderTracking) and the docs (AGENTS.md, PUSH_LOG.md) are back to their state before that commit. Build passes.



---

## September 3, 2026 02:15 PM (PHT) - prans
- **ENTER KEY = PRIMARY ACTION (system-wide)**: pressing Enter in any dialog, confirmation prompt, or form now triggers that context's primary action (submit/confirm) instead of nothing or a stray newline - while never hijacking multiline text areas (Enter still inserts a new line there) and never double-submitting. Centralized in the shared dialog so it applies everywhere with one change.
- **Shared DialogContent Enter handler** (`ui/dialog.tsx`): while a dialog is open, a document-level Enter listener (added per-open, removed on close) finds the dialog's primary action - a `button[type="submit"]` first, else an element marked `data-primary-action` - and clicks it exactly once after `preventDefault()` (blocks the native double-submit). It skips when focus is inside a `textarea` (newline preserved) or outside that dialog; `Shift+Enter` is never intercepted.
- **ConfirmationDialog now submits on Enter** (`ui/confirmation-dialog.tsx`): the header + phrase field + footer are wrapped in a `display:contents` form whose submit handler runs the confirm action, and the confirm button is now `type="submit"` (kept `disabled={!canConfirm || loading}` for the destructive/cancel/requirePhrase safety); the legacy `onKeyPress`/`handleKeyPress` dead logic was removed. Covers all 59 confirmation usages (Place Order, Cancel Order, Stock Out/In, Approve/Reject Payment, Delete Notification, Reset Pricing, Sign Out, Time In/Out, etc.).
- **Formless admin CRUD dialogs get `data-primary-action`** so Enter triggers their primary button (which previously did nothing because there was no `<form>`): Inventory Add/Edit + Stock In/Out, Staff Register/Edit, Payment Methods Add/Edit, Pricing Management matrix price + legacy rate editors, AdminAttendance Adjust Time, and AdminProfile Change Password. Form-based dialogs (Job Board, Staff/Job apply, Login/SignUp/ForgotPassword, customer Payment Verification) already submit natively via their `type="submit"` button + `<form onSubmit>`. Read-only detail/invoice dialogs (no meaningful primary action) are intentionally left alone. Build passes.
