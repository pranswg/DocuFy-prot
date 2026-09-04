# PUSH LOG â€” Docufy PSMS

This file logs every push done by any collaborator on this repo, with the date & time in **Philippine time (PHT, UTC+8)**, who pushed, and what the push update did.

New entries are added at the bottom, below the most recent one, so the log reads oldest â†’ newest.

---

## August 3, 2026 11:59 PM (PHT) â€” Francis William Garcia
**Initial commit / setup**
- First commit of the repo (project scaffolding).

---

## August 24, 2026 10:43 PM & 11:28 PM (PHT) â€” ethanestoya
- `improve: web responsiveness` â€” mobile/desktop responsiveness improvements across the app.
- Moved the user profile into the navigation bar.

---

## August 25, 2026 10:26 PM â€“ 11:32 PM (PHT) â€” ethanestoya
- `fix: dashboard layout`
- `fix: print request layout`
- `fix: job board layout`
- `remove: unecessary back button - header`
- `fix: dashboard layout` (follow-up)

---

## August 26, 2026 03:33 AM (PHT) â€” pranswg
- `Update README.md`

---

## August 26, 2026 10:09 PM â€“ 10:13 PM (PHT) â€” Francis William Garcia
- `improved mobile viewing`
- Merge remote changes into `testbranch2`
- `modified readme.md`

---

## August 27, 2026 03:26 AM (PHT) â€” Francis William Garcia
- `improved mobile viewing`

---

## August 28, 2026 05:20 AM (PHT) â€” Francis William Garcia
- Added **live PDF preview for the Job Board** and further mobile viewing improvements.

---

## August 28, 2026 09:26 PM (PHT) â€” Althea09-git
- `Improved Landing Page Cards`

---

## August 29, 2026 12:02 AM & 12:26 AM (PHT) â€” prans
- `removed attendance form and improved ui`
- `removed attendance and improved UI`

---

## August 29, 2026 12:52 AM (PHT) â€” Francis William Garcia
- `Remove node_modules and dist from tracking, add .gitignore`

---

## August 29, 2026 02:26 AM â€“ 03:01 AM (PHT) â€” Francis William Garcia
- `Remove Reports feature and unused docs; rework README`
- `Add collaboration guide for merging changes` (COLLABORATION_GUIDE.md)
- `Remove entire inventory system for rebuild from scratch`

---

## August 29, 2026 04:14 AM (PHT) â€” Francis William Garcia
- **Rebuilt the inventory system from scratch** + fixed down-payment queue gating:
  - Admin-only `/admin/inventory` page with localStorage `inventoryStore` (paper-piece tracking, Stock In/Out, Add/Edit/Archive).
  - Down-payment/GCash orders gated out of the admin/staff queue until verified (Payment Verification).

---

## August 29, 2026 10:52 AM (PHT) â€” Francis William Garcia
- `remove live pdf preview system-wide` (committed on `testbranch-pdf` branch):
  - Removed the `print-preview-dialog.tsx` (pdfjs-dist live preview) and the `pdfjs-dist` dependency.
  - Made all print/file preview buttons inert (no window opens) pending a later rebuild.

---

## August 30, 2026 07:54 AM â€“ 07:58 AM (PHT) â€” aeprnts (collaborator)
- `Add staff clock-in system, staff registration, and admin attendance monitoring`
- Merge remote `testbranch2` (reports removal, inventory rebuild) with local attendance features
- `Update AGENTS.md: staff inventory page deleted in merge; add merge integration note`
- Introduced a full **staff attendance/timekeeping system**:
  - `StaffTimesheet.tsx` (clock-in/out, timesheet, overtime/break metrics) at `/staff/timesheet`.
  - `StaffTimeInGate.tsx` â€” staff lockout until clocked-in on Orders / Payment Verification / Walk-in pages.
  - `AdminAttendance.tsx` â€” admin monitoring dashboard at `/admin/attendance`.
  - `attendanceStore.ts` + `staffRoster.ts` (storage + seeded roster).
  - Staff **registration** (admin "Register New Staff" dialog + `registerStaff` in AuthContext).
  - New routes, nav links (Clock-In & Timesheet, Attendance) and Quick Actions.

---

## August 30, 2026 10:21 PM (PHT) â€” Francis William Garcia
- **Created `PUSH_LOG.md`** (this log) and added the "PUSH LOG" tracking note to `AGENTS.md` (commit `59663e30`).
- Also pushed the previously-uncommitted `testbranch2` work to the remote (fast-forward `d89aa5fc..59663e30`): the PDF preview removal + the `testbranch-pdf` merge, combined with the collaborator's attendance update and the inventory system.

---

## August 31, 2026 03:53 AM (PHT) â€” aeprnts (collaborator)
- `feat: notifications & announcements system (priority tiers)`
- `feat: pricing management`
- `feat: payment methods + QR management`
- `feat: system-wide blue-white theme, pointer cursors, status-card redesign`
- `feat: staff management overhaul & Docufy rebrand`
- **Notifications/Announcements** â€” centralized `announcementsStore` + shared `NotificationsPage` (`/customer|/staff|/admin/notifications`): admin broadcasts announcements to All Users, per-user read tracking, **priority tiers (Regular / Important / Emergency)** with an **Important Announcements** section on top (red URGENT + amber IMPORTANT cards) and a clean **Notifications** section below; unread badge + amber attention dot in the sidebar (desktop + mobile). `type` field (announcement/pricing/maintenance/reminder/promo) is ready for future system-generated events.
- **Pricing Management** â€” `pricingStore` + `/admin/pricing`: shared pricing model (B&W / color tiers, paper-size surcharges, duplex savings, down-payment threshold) consumed live by print request, walk-in, invoice, landing, and order-tracking flows.
- **Payment Methods + QR** â€” `paymentMethodsStore` + `/admin/payment-methods` + shared `PaymentMethodQR`: admin-managed online payment methods used across verification and print requests (legacy hardcoded GCash pages left un-routed).

---

## August 31, 2026 04:30 AM (PHT) â€” prans
- `UI polish + maps + shop location` (commit `934702f8`), then **merged collaborator (aeprnts) `7d7f3761`** into `testbranch2` (merge commit `bd5c6c62`).
- **UI polish**: applied the light-blue-outline buttons (`border-2 border-blue-200`) with blue-fill-on-hover system-wide to non-destructive buttons; fixed white-on-white hover on Preview/View/status-toggle buttons.
- **Login page**: filled-blue "Log In" button + redesigned MFA "Verify" pill with press animation; "Back to Login" as a clean text-link with arrow.
- **Google Maps**: embedded a no-API-key Maps iframe in the landing page *Location* card behind a "Shop Location" button + mini window, and added a "Shop Location" button + map dialog to the customer dashboard (right of the welcome back message).
- **Merge**: resolved 5 conflicting files by keeping both feature sets (`LandingPage`, `ContentManagement`, `CustomerDashboard`, `JobBoard` hand-merged; `Staff.tsx` adopted the collaborator's authoritative rewrite). Build passes (2386 modules).

---

## August 31, 2026 04:55 AM (PHT) â€” prans
- Post-merge UI/UX session pushed directly to `testbranch2` (4 requests).
- **Task 1 â€” Live clock & date in Orders header**: `shared/UnifiedOrders.tsx` now shows a live PHT clock (updates every second) + full date (`weekday, month day, year`) under the page subtitle on the shared admin/staff Orders page.
- **Task 2 â€” Sidebar scroll preservation**: the mobile nav sheet (`shared/MobileNavSheet.tsx`) preserves the nav scroll position across open/close (the Radix sheet unmounts its content when closed; a `navRef` + saved `scrollTop` restores it on reopen). Desktop sidebar already persisted naturally.
- **Task 3 â€” Uniform buttons (Choose File reference)**: converted the remaining filled-blue primary CTAs in collaborator-added files (not covered by the earlier system-wide restyle) to the uniform white + light-blue-outline (`border-2 border-blue-200`, blue-fill-on-hover) style: `shared/NotificationsPage.tsx` (Create/Send Notification), `admin/Staff.tsx` (Add Staff / Create Staff Account / Save Changes), `admin/PricingManagement.tsx` (Save Changes), `admin/PaymentMethodsManagement.tsx` (Add Payment Method / Save). Kept AGENTS.md exclusions (destructive/red, amber warnings, green positive, status chips, nav, stateful Clock-In, and the reverted Place Order/Next Step CTAs).
- **Task 4 â€” Unified notifications (show both in each)**: made the bell dropdown AND the `/notifications` page show the SAME combined feed of admin announcements (`announcementsStore`) + order/payment/status system notifications (`notificationStore`). Bell dropdown (`Layout.tsx`) merges both kinds into one chronological list (announcements get priority-colored icons Megaphone/amber/red), and its unread badge now sums announcements + system notifications. The Notifications page adds a system-notification subscription, merges them into the "Notifications" section sorted newest-first with matching cards, and its unread count/mark-all-read covers both stores.
- Build passes (2386 modules).

---

## August 31, 2026 05:06 AM (PHT) â€” prans
- Follow-up polish pushed to `testbranch2` (3 requests).
- **SIEM security alerts removed**: deleted the admin Shield "Security Alerts" icon + its dropdown entirely from `Layout.tsx` (header) â€” state, presence, subscription, handlers, helpers, and the unused `Shield/MapPin/XCircle/Clock/Upload` icon imports all removed. Also deleted the now-orphaned `src/app/utils/siemAlertStore.ts` (no remaining imports anywhere). Build module count 2385.
- **Desktop sidebar scroll persistence**: the desktop sidebar `<nav>` in `Layout.tsx` now keeps its scroll position across navigation. Root cause: each page renders its own `<Layout>`, so Layout remounts on every route change and the sidebar jumped back to top. Fixed with a module-level `savedSidebarScrollTop` (survives remounts) + a `navRef`/`onScroll` on the `<nav>` and a mount-time restore. The sidebar now stays where the user left it until they scroll again. (The mobile sheet already had this from the prior push.)
- **Pricing hover text fix**: in `admin/PricingManagement.tsx`, "Reset to Defaults" (and the same-pattern per-row "Edit") buttons use `variant="outline"` whose base adds `hover:text-white` â€” combined with the light-blue `hover:bg-[#F2F7FF]` override it made the label white-on-light-blue (invisible). Added `hover:text-[#2F6FD6]` so the font stays a readable blue on hover.
- Build passes (2385 modules).

---

## August 31, 2026 10:31 AM (PHT) â€” prans
- Push of accumulated uncommitted work to `testbranch2` (5 requests this session).
- **Task 1 â€” Mark all as read font**: `Layout.tsx` bell dropdown "Mark all as read" button restyled to the uniform full-width style.
- **Task 2 â€” Search bar visibility**: added `bg-[#FBFDFF] shadow-sm ring-1 ring-blue-300` to the search inputs on `shared/UnifiedOrders`, `shared/UnifiedPaymentVerification`, `admin/InventoryManagement`, `admin/Staff`, `admin/AdminAttendance`, `shared/NotificationsPage`.
- **Task 3 â€” Inventory Active/Archived buttons**: moved the Active/Archived toggle next to "Add Item" in `admin/InventoryManagement.tsx` (2-col summary grid, matching button styling).
- **Task 4 â€” Staff AM/PM time-in/out**: `attendanceStore.ts` `getNextAction`/`timeIn`/`timeOut` are now period-aware (AM â†’ morning, PM â†’ afternoon; Time Out maps to the current active period). `staff/StaffTimesheet.tsx` + `shared/StaffTimeInGate.tsx` derive everything from `getCurrentPeriod()` + logs instead of the removed `nextAction` state; PHT date keys via `toDateKey(nowPHT())`.
- **Task 5 â€” System-wide PHT (UTC+8) time**: new centralized `src/app/utils/pht.ts` (toPHT/nowPHT/todayPHTKey/toPHTKey/formatPHTime/formatPHDate/formatPHDateTime) applied across all active display sites: announcements, order tracking, customer orders, customer dashboard notifications, shared orders (header clock + invoice + table + order-placed-at via `createdAt`), walk-in transactions, payment verification, admin attendance (adjust-dialog PHT input + late cutoff), ordersStore date key, new print request date, file-attachments upload date, Staff joinDate, job postedDate (JobApplyForm/JobBoardManagement/StaffProfile), JobBoard applied/interview dates. Dead/unrouted legacy files (AdminOrders, StaffQueueBoard, PaymentVerificationAdmin, staff/PaymentVerification) intentionally untouched.
- Also included earlier uncommitted work: Google Maps embed (LandingPage + CustomerDashboard), View Applicants uniform style (JobBoardManagement), per-user customer notifications (UnifiedOrders + NotificationsPage + Layout), bell badge removal (desktop + mobile), notification deep-open-to-order routing.
- Build passes (2386 modules).

---

## August 31, 2026 10:10 PM (PHT) â€” prans
- Push to `testbranch2`: fix Orders list time grouping to match the whole system.
- **Orders list time grouping fixed**: in `shared/UnifiedOrders.tsx`, the Orders table Time column already showed PHT (`formatPHTime`), but the Morning/Afternoon/Evening grouping headers used `date.getHours()` â€” the DEVICE-LOCAL hour, not PHT. On any browser outside the PH timezone, an order would show e.g. "09:00 AM" yet be grouped under the wrong time period. `getTimePeriod` now derives the hour in PHT via `toPHT(date).getHours()`, so the grouping matches the PHT time displayed system-wide.
- Note: the admin "Time In Limit" feature was implemented then removed (per user) before this push â€” no trace remains; `AdminAttendance.tsx` and `attendanceStore.ts` reverted to their committed state.
- Build passes (2386 modules).

---

## September 01, 2026 04:41 AM (PHT) â€” prans
- Push to `testbranch2`: system-wide header clock (internet GMT+8/Manila time) + New Print Request scroll-to-top.
- **Time utilities made timezone-independent**: `src/app/utils/pht.ts` rewritten. The old "add +8h then read device-local" hack double-added the offset on a GMT+8 device (showed 7am when it was actually 11pm). All "now"/format helpers now resolve the Manila wall-clock through `Intl.DateTimeFormat` with `timeZone: "Asia/Manila"`, so they are correct on any device. `nowPHT()` returns a synthetic Date whose device-local getters equal Manila wall-clock; `formatPHTime`/`formatPHDate` use Intl Manila directly. Internet sync (`syncInternetTime()`, worldtimeapi.org) still corrects a wrong device clock; kicked off globally in `src/main.tsx`.
- **`attendanceStore.ts`**: `nowPHT`/`formatPHT` delegate to the Intl Manila helpers (removed the +8h double-add); `formatPHT` now wraps `formatPHTime(d, { hour12:false })`.
- **Live header clock for ALL users**: `Layout.tsx` added a live clock immediately LEFT of the bell/notification icon in the shared top header (present on every authenticated page for customer/staff/admin). Desktop shows time + full date incl. year; mobile shows compact time with Clock icon. Styling: time text black, date darker blue `#2F6FD6`, reduced font sizes, no uppercase, "GMT+8" label removed. Ticks every second and re-renders once internet time resolves.
- **`UnifiedOrders.tsx` / `StaffTimesheet.tsx` / `StaffTimeInGate.tsx`**: all live clocks/timers/toast timestamps now use internet-corrected Manila time via `nowPHT()`/`toPHT()`/`internetUtcMs()`.
- **New Print Request includes images step auto-scroll**: pressing "Next Step"/"Back" in the Print Request stepper now scrolls back to the top. Root cause: the page scrolls inside Layout's `<main>` (`overflow-y-auto`), not the window, so the old `window.scrollTo(0,0)` did nothing. Added `scrollPageToTop()` (`NewPrintRequest.tsx`) which scrolls `document.querySelector("main")` (smooth) in addition to the window.
- Build passes (2386 modules).

---

## September 01, 2026 08:26 AM (PHT) â€” prans
- Push to `testbranch2`: multi-dimensional pricing matrix (store + admin + order-flow adoption) along with other accumulated updates.
- **Multi-dimensional pricing matrix (pricingStore)**: `src/app/utils/pricingStore.ts` gained a full pricing matrix on top of the legacy flat rates (legacy kept working, labelled "Legacy Per-Page Rates" on admin). New `ColorTier`/`ContentType`/`PaperSizeKey`/`PhotoSizeKey`/`ServiceType` types + `PricingMatrix` (document[content][color][size], vellum[color][size], sticker[color], photo[price/minQty]); `DEFAULT_MATRIX` with published prices (Photo 2R â‚±10 min 6 â€¦ A4 â‚±60); `STORAGE_VERSION` 1.0â†’2.0 (reseeds, matrix persisted). Store API: `getMatrix`/`updateMatrixCell`/`setMatrix`/`resetPricing` (+ matrix), `getPriceFromMatrix`, `resolveColorTier`, `mapPaperSizeKey`, label maps + `SERVICE_TAB_LABELS`. `admin/PricingManagement.tsx` rebuilt: tabs per service type (Document card-grids, Vellum colorÃ—size table, Sticker per-sheet, Photo price + min order) + Legacy rates section.
- **Order flow adopts matrix + Photo as per-file print type** (customer `NewPrintRequest.tsx` + shared `UnifiedWalkInTransactions.tsx`, both flows): Step-1 service-type selector (Document/Vellum/Sticker/Photo grid) and global Photo config panel REMOVED â€” every order uploads files in Step 1 and Photo is now a per-file **Print Type** in Step 2 with its own size/finish/qty (`FileData.printType` incl. `"photo"` + `photoSize/photoFinish/photoQty`, defaults `2R`/`matte`/`1`); per-file matrix pricing via `getPriceFromMatrix`, photo â†’ `matrix.photo[size].price * max(1, qty)` with per-file min-qty validation on submit; Step 2 print-type buttons styled like the Back button (`variant="outline"` grid, icons Layers/FileText/StickyNote/Camera); Step 1 headings fixed; Step 4 per-file cards + breakdown dialog show photo info; paper sizes capitalized. PRINT-TYPE HOVER/ACTIVE THEMING: `group` + `group-hover:text-white` on icons/labels (visible on the dark-blue outline hover fill â€” fixes the perceived "deselect"); selected button = filled blue `bg-[#2F6FD6] text-white`, `transition-all duration-150 active:scale-95` press animation.
- **Dead file-preview UI removed system-wide**: `file-attachments.tsx` dropped inert "View" button + `onView` prop (and unused `Eye`/`Button` imports); `OrderTracking.tsx` removed dead `handleViewFile`/`onView` (kept live "View Invoice"/"View Page Color Breakdown"); `UnifiedOrders.tsx` removed dead `onView`; removed now-unused `Eye` (both flows) + `SERVICE_TYPE_LABELS` (walk-in).
- Build passes.

---

## September 01, 2026 10:26 AM (PHT) â€” prans
- Push to `testbranch2`: merged pranswg's update (9 commits, 7d7f3761..4fc8fe95) with local Reports/dashboard/inventory work.
- **Dashboard full rewrite** (`admin/AdminDashboard.tsx`): header + welcome + date-range dropdown (This Month/Last Month/This Quarter/This Year/All Time/Custom), 3 tabs **Overview | Sales | Services**, no Inventory tab. Overview with 4 summary cards, Sales Trend area chart, Sales Comparison, Best Selling Services, Top Used Paper Sizes donut, Recent Transactions, **Inventory Snapshot** (Total/Low/Out cards + urgent items + "All inventory levels are currently healthy" + View Inventory button â†’ `/admin/inventory`). All data computed from `dataStore`/`inventoryStore`, no hardcoding.
- **Inventory Reports added** (`admin/InventoryManagement.tsx`): module nav "Inventory Overview | Reports"; Reports section with header + date filter (Today/This Week/This Month/Last Month/Custom), summary cards (Total/Low/Out/Stock In/Stock Out), Most Used Materials, Stock Movement bar chart, Inventory Alerts, Stock-In/Stock-Out history tables, Current Inventory Report table, category + item filters.
- **`inventoryStore.ts` stock-movement tracking**: new `StockMovement`/`StockMovementType` types + `movements[]` persisted to `localStorage('inventoryMovements')`, version bumped to `3.0`, `recordMovement()` helper; `stockIn`/`stockOut`/`deductPaperPieces` now record movements (person + reason); `getMovements(type?)`. `NewPrintRequest.tsx` `deductPaperPieces` call unchanged/backward-compatible.
- **Merged with pranswg's remote update**: pranswg redesigned `InventoryManagement.tsx` overview (2-col summary cards, Active/Archived toggle moved into the toolbar, white-base KPI button styling). The merge kept BOTH his overview redesign AND my Reports section â€” only the React import line conflicted (resolved to keep `useEffect` + `useMemo`).
- Build passes.

---

## September 01, 2026 09:21 PM (PHT) â€” prans
- Push to `testbranch2`: merged aeprnts's dashboard/inventory-reports work + expanded mock sales data for dashboard testing.
- **Merge commit** `100acb00` pulled in aeprnts's `96c41a6` ("Add dynamic admin dashboard (Overview/Sales/Services) & inventory reports; stock-movement tracking") â€” `AdminDashboard.tsx` 3-tab rewrite, `InventoryManagement.tsx` Inventory Overview | Reports toggle, `inventoryStore.ts` stock-movement tracking (v3.0, `inventoryMovements` localStorage). Only `PUSH_LOG.md` conflicted (kept both entries, oldestâ†’newest).
- **Mock customers** `c52332b0`: two online GCash orders seeded in `dataStore` for Payment Verification + Orders-list UI checking (Maria Santos pending / John Dela Cruz in-queue).
- **`src/app/utils/dataStore.ts`**: added **10 more seed orders** (`ORD-2026-0003` â†’ `ORD-2026-0012`) spanning **Junâ€“Sep 2026** so the admin dashboard has a multi-month **Sales Trend**, varied **Best Selling Services** (Colored/B&W/Photocopy/School Supplies), a filled **paper-size donut** (A4/Short/Long), meaningful **Total Sales / Orders / walk-in / active-customer** KPIs, and populated **Recent Transactions**. Kept the two Payment-Verification orders. Old months are mostly `Completed`/`Released`; one Aug order is `Canceled` (excluded from revenue); Sep has three completed/released today. First time the local branch reflects BOTH prans + aeprnts work in one history for aeprnts to pull.

---

## September 01, 2026 09:37 PM (PHT) â€” prans
- Push to `testbranch2`: fixed Admin Dashboard Sales tab â€” trend views now aggregate ALL orders regardless of the selected date range.
- **`src/app/components/admin/AdminDashboard.tsx`**: the Sales tab defaulted to a "This Month" range, so its Daily/Weekly/Monthly trend charts only surfaced September's few orders (looked flat/broken) while the Overview's Sales Trend (all-orders) looked fine. Fix: `dailySales`, `weeklySales`, AND `monthlySales` in `computeMetrics` now iterate over ALL orders (not the range-scoped `filtered`), so all three Sales-tab views show the full Junâ€“Sep history regardless of the dropdown. Added shared `MONTH_INDEX` constant + `sortByMonthDay()` helper so Daily/Weekly buckets sort chronologically (oldestâ†’newest) like Monthly. Range-scoped values (Total Revenue KPI, Sales Comparison, Best Selling, paper donut, recent transactions) unchanged. Build passes.

---

## September 01, 2026 10:45 PM (PHT) â€” prans
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
- **View Inventory action from notifications**: the `View Inventory` button on an inventory alert runs the correct page for the signed-in role â€” `/staff/inventory` for staff, `/admin/inventory` for admin.
- **Inventory-aware notifications**: the notifications page now renders inventory alerts with color-coded styling (red emergency border + icon / amber important border + icon). Because this is a system alert, it only shows a `View Inventory` button and cannot be marked read.
- **Dashboard inventory snapshot**: the admin dashboard's Inventory snapshot now uses the same shared status logic as the rest of the app to detect low/out items, so the snapshot and the alerts stay consistent with the inventory page.
- All of the above build cleanly (`npm run build` passes; only the pre-existing large-chunk warning remains).

---

## September 3, 2026 09:35 AM (PHT) â€” prans
- Push to `testbranch2`: merged aeprnts's inventory alerts / confirmation-dialog work into the local branch and landed the "Home" + order-list + nav-order changes.
- **Merged aeprnts's commits locally** (`0b5e2763` confirmation dialogs + `3b904ea7` inventory low/out alerts & staff inventory page), resolving import conflicts in `Layout.tsx` and `MobileNavSheet.tsx` by keeping both sides' icon imports (`Home` + `Boxes`). Build passes.
- **"Home" added to profile dropdowns**: the desktop sidebar, top-right profile menu, and mobile nav profile dropdowns now include a **Home** option that navigates back to the landing page (`/`) for all roles.
- **Order list columns + details dialog cleanup** (`unified/UnifiedOrders.tsx`): removed the Type/Pages/Copies columns (and their sort wiring) from the admin/staff orders table for a tidier list; collapsed the Print Job Details and Additional Information sections of the order-details dialog so each is one unified container with hairline-separated grid cells (Attached Files, status/payment, hold/cancel/notes, Verify Payment inside).
- **Admin & staff sidebar tab order** (`adminMenuItems.tsx` + all staff page menus + mobile nav): reordered in both sidebars to: Dashboard, Walk-in Transactions, Payment Verification, Orders, Inventory, Attendance (admin), Staff (admin), Job Board (admin), Pricing Management (admin), Content Management (admin), Notifications. Staff keeps its staff-only **Clock-In & Timesheet** right after Dashboard; both keep **Inventory** and **Notifications**; admin keeps **Payment Methods** after Payment Verification.
- Build passes.

---

## September 3, 2026 01:35 PM (PHT) â€” prans
- **Reverted the customer mobile responsive polish** (`98ed32a2`, reverts `140574d1`): the previous push added an Order Progress timeline to `OrderTracking`, turned the CustomerDashboard/CustomerOrders order lists into mobile card rows, added a "Start a New Order" CTA to the customer dashboard, and reworked the NewPrintRequest nav buttons. These were deemed incorrect and reverted wholesale â€” the customer files (CustomerDashboard, CustomerOrders, NewPrintRequest, OrderTracking) and the docs (AGENTS.md, PUSH_LOG.md) are back to their state before that commit. Build passes.



---

## September 3, 2026 02:15 PM (PHT) - prans
- **ENTER KEY = PRIMARY ACTION (system-wide)**: pressing Enter in any dialog, confirmation prompt, or form now triggers that context's primary action (submit/confirm) instead of nothing or a stray newline - while never hijacking multiline text areas (Enter still inserts a new line there) and never double-submitting. Centralized in the shared dialog so it applies everywhere with one change.
- **Shared DialogContent Enter handler** (`ui/dialog.tsx`): while a dialog is open, a document-level Enter listener (added per-open, removed on close) finds the dialog's primary action - a `button[type="submit"]` first, else an element marked `data-primary-action` - and clicks it exactly once after `preventDefault()` (blocks the native double-submit). It skips when focus is inside a `textarea` (newline preserved) or outside that dialog; `Shift+Enter` is never intercepted.
- **ConfirmationDialog now submits on Enter** (`ui/confirmation-dialog.tsx`): the header + phrase field + footer are wrapped in a `display:contents` form whose submit handler runs the confirm action, and the confirm button is now `type="submit"` (kept `disabled={!canConfirm || loading}` for the destructive/cancel/requirePhrase safety); the legacy `onKeyPress`/`handleKeyPress` dead logic was removed. Covers all 59 confirmation usages (Place Order, Cancel Order, Stock Out/In, Approve/Reject Payment, Delete Notification, Reset Pricing, Sign Out, Time In/Out, etc.).
- **Formless admin CRUD dialogs get `data-primary-action`** so Enter triggers their primary button (which previously did nothing because there was no `<form>`): Inventory Add/Edit + Stock In/Out, Staff Register/Edit, Payment Methods Add/Edit, Pricing Management matrix price + legacy rate editors, AdminAttendance Adjust Time, and AdminProfile Change Password. Form-based dialogs (Job Board, Staff/Job apply, Login/SignUp/ForgotPassword, customer Payment Verification) already submit natively via their `type="submit"` button + `<form onSubmit>`. Read-only detail/invoice dialogs (no meaningful primary action) are intentionally left alone. Build passes.



---

## September 3, 2026 03:00 PM (PHT) - prans
- **MOBILE HEADER - PROFILE ICON REMOVED, ACCOUNT VIA SIDEBAR ONLY**: the top-right circular avatar/profile button (and its dropdown) in the shared header (`Layout.tsx`) is now hidden at mobile widths for ALL roles (`{!isMobile && ...}` wraps it), so the mobile header stays clean and uncluttered at `hamburger | page title | notifications` with no empty gap. Desktop is unchanged - staff/admin/customer still open their profile from the top-right avatar and the desktop left sidebar. On mobile, account access is exclusively through the hamburger menu's sidebar (`MobileNavSheet`), which already has a clearly-tappable account section at its bottom (avatar + email/role + dropdown `Home` / `My Profile` / `Sign Out`); tapping `My Profile` closes the sidebar and lands on the full profile page (Account Settings / Personal Information / Change Password all live there), and the browser Back / profile back-arrow return to the previous page naturally via normal router history. No separate profile system created; existing account functionality untouched. Build passes.



---

## September 3, 2026 03:30 PM (PHT) - prans
- **LANDING PAGE "GET STARTED" CTA - ALWAYS SOLID FILLED**: the hero "Get Started" button (the Landing Page's primary CTA, navigates to `/signup`) is now always a filled primary-color button instead of the previous white/outline style. It uses `bg-[#1D73EC]` (Docufy customer primary blue) with white text for contrast, a desktop hover that darkens to `bg-[#10316B]` plus a subtle lift, and an `active:scale-95` pressed/active state for touch devices. It stays `size="lg"` (`h-10 px-6`) for a comfortable mobile tap target and gets a subtle blue shadow for extra prominence. The filled style is consistent on desktop, tablet, and mobile and never switches to an outline/transparent style at smaller widths. The button's functionality and destination (`/signup`) are unchanged. Build passes.



---

## September 3, 2026 04:00 PM (PHT) - prans
- **NOTIFICATIONS - SIDEBAR TAB REMOVED, ACCESS VIA HEADER BELL DROPDOWN**: removed the dedicated "Notifications" tab/item from EVERY sidebar (desktop left sidebar, admin menu, staff/customer mobile `MobileNavSheet`, and all per-page `menuItems` arrays passed to the shared Layout), so no empty space or broken nav item remains. The buried urgent-announcement dot on that sidebar item and its now-unused `urgentAnnouncements` state in Layout/MobileNavSheet were removed too. The original Notification page/routes (`/customer/notifications`, `/staff/notifications`, `/admin/notifications`) are UNCHANGED and still exist.
- **Header bell icon kept + "Show All Notifications" button**: the header bell stays fully functional on all screen sizes with its unread-count badge and dropdown (merged notifications + announcements feed). A new prominent solid-blue "Show All Notifications" button was added at the BOTTOM of that bell dropdown (below "Mark all as read") that closes the dropdown and navigates to the role's original Notifications page (`handleShowAllNotifications` -> `navigate('/{role}/notifications')`).
- **Navigation flow change**: access to the full Notifications page is now `Header Bell Icon -> Notification Preview/Dropdown -> Show All Notifications -> Original Notification Page` instead of `Sidebar -> Notifications -> Page`. No duplicate notification system, no second page, no bottom navigation bar, no broken routes or dead links. Build passes.



---

## September 3, 2026 06:30 PM (PHT) - prans
- **NOTIFICATION DROPDOWN - LARGER, READABLE PANEL**: the header bell dropdown is now a proper notification panel instead of a small compact popover. Width grew (20rem -> 24rem) and it got a max-height capped to the viewport (`max-h-[min(32rem,calc(100vh-6rem))]`) as a flex column so the header + footer buttons stay fixed while only the list scrolls. Each notification item is roomier and more legible: more horizontal/vertical padding, a bigger icon chip (40px, larger icon), larger title/message/time text, and a bigger unread dot. The header shows the title plus an "N unread" count, the empty state is larger, and the "Mark all as read" / "Show All Notifications" buttons are taller (h-11) with comfortable spacing. Responsive on mobile - it stays within the viewport width (`min(24rem, calc(100vw-1.5rem))`, right-anchored) and height so there is NO horizontal scrolling.
- **NOTIFICATION CLICK = VIEW FIRST, THEN MARK READ**: clicking a notification/announcement in the bell dropdown no longer just silently marks it read and closes. It now opens a DETAIL DIALOG that shows the type badge (Order / Payment / Status Update / Inventory Alert, or the announcement type), an Important/Emergency priority badge when applicable, the full title, the COMPLETE message, and the date/time (PHT). Mark-as-read now happens ONLY once the detail is opened/viewed, never before.
- **Action button + no accidental navigation**: if the notification has a destination, the detail dialog shows a primary action button - "View Order", "View Inventory", or "Go to Page" - that the user clicks to navigate to the relevant page (order tracking for customers, orders list for staff/admin, inventory for alerts). Notifications without a destination show a plain Close. Already-read notifications still open the same detail view. Notifications are never deleted or hidden when marked read and stay in the full Notifications page/history. "Mark all as read" remains its own separate action.



---

## September 3, 2026 08:15 PM (PHT) - prans
- **STAFF GAIN FULL INVENTORY ACCESS (same as admin)**: staff can now manage inventory exactly like the administrator instead of only viewing read-only stock levels. The read-only `StaffInventory.tsx` was replaced with a thin wrapper that reuses the shared admin `InventoryManagement` component (with the staff sidebar menu + "Inventory" title), and that admin component was made configurable (optional `menuItems`/`title` props, defaulting to the admin values) so the same full module serves both roles. Staff at `/staff/inventory` now have every capability admins do: Add/Edit items, Archive/Restore, Stock In / Stock Out, the Papers Left card, Low-Stock banner, summary cards, Active/Archived filters with search, and the Reports tab (material usage, stock-movement chart, inventory alerts, Stock-In/Out history, and Current Inventory report). Stocking actions record the acting staff member's name just like admin. This also means the inventory notification "View Inventory" action now lands staff on the full management page for both low-stock and out-of-stock alerts. Build passes.

---

## September 3, 2026 05:20 PM (PHT) - prans
- **SIGN OUT CONFIRMATION â†’ RED "LOG OUT" BUTTON (all roles)**: the Confirmation dialog's action button now reads "Log Out" instead of "Sign Out" and renders as a red (destructive) filled button with white text that darkens on hover - so the destructive intent is clear and the font color stays legible. Applied consistently across every sign-out confirmation (desktop sidebar, top-right profile dropdown, admin/staff/customer profile pages, and the mobile nav sheet).
- **ERROR USAGE CONFIRMATION ON ORDER COMPLETION**: staff/admin no longer auto-deduct paper when an order is placed. Instead, when marking an order **Completed**, a confirmation dialog opens showing the **Inventory items used** (each paper size with its expected sheet count). The dialog has a dropdown to select an **Error Usage reason** (Printing Error, Equipment Issue, Out of Ink, Paper Jam, Misalignment, Customer Request, Other) plus a **Wasted Sheets** counter. Two footer actions: **"No Errors"** confirms the order with no errors, and **"Confirm Error Usage"** (requires a reason) records the error. Only on completion does the expected paper get deducted from inventory (skipping legacy orders to avoid double-counting), and the error usage (reason + wasted sheets + no-errors flag) is stored on the order for audit.
- **ONE ORDER PER STATUS MOCK DATA**: the seeded orders were rebuilt so there is exactly one order for each status (Awaiting Payment, Received, In Queue, Printing, Completed, On Hold, Released, Canceled) instead of many duplicates - making each status card / filter demo cleanly.
- **TERMINAL STATUSES HIDDEN BY DEFAULT IN QUEUE**: Completed, Released, and Canceled orders no longer appear in the default orders list/view (alongside Awaiting Payment) - they only show when their specific status filter is selected, keeping the active queue focused on in-progress work.
- **STATUS BUTTON FONT COLOR FIXED (order details)**: the selected (active) status buttons in the order detail view - Received, In Queue, Printing, Completed, On Hold, Released - previously had solid blue/gray fills with dark default text (low contrast). They now use white text on the colored fill so the label is always readable. Build passes.

---

## September 4, 2026 11:31 AM (PHT) - Althea09-git
- **SERVICES & PRICING MOBILE REDESIGN** (LandingPage.tsx): the Services & Pricing section on mobile is now a compact, interactive 3-card carousel instead of large stacked vertical cards.
- **3 COMPRESSED CARDS**: redesigned the cards as (1) Standard Document Printing, (2) Binding & Finishing, and (3) Document Encoding & Layout, with a compact primary "Order Now" CTA at the bottom of each.
- **INTERACTIVE B&W / COLOR TOGGLE**: the Standard Document Printing card now has an inline pill toggle that switches between the B&W per-page rate and the Color per-page rate (and swaps the description), wired to the live pricing store.
- **CAROUSEL INTERACTION**: the cards form a horizontally swipeable/snapping slider with left/right navigation arrows and pagination dots at the bottom; the centered/active card gets a blue border + soft glow highlight that follows swipe, arrow, dot, or hover.
- **COMPACT + SQUARE LAYOUT**: reduced internal padding, icons placed inline next to the card headers, and mobile cards are square (aspect-square) instead of tall rectangles; hover uses a smooth elevation lift hover:-translate-y-1 hover:shadow-lg with the same 	ransition-all duration-300.

---

## September 4, 2026 (PHT) - prans
- **CUSTOMER SIDEBAR - NOTIFICATIONS TAB REMOVED (re-applied after PrintTransaction merge)**: the customer print-request page (`shared/PrintTransaction.tsx`, which now powers customer New Print Request after the print-flow unification) had re-introduced a "Notifications" tab in the customer sidebar menu. Removed it so the customer sidebar again shows only Dashboard, Print Request, My Orders, and Job Board - notifications are accessed only via the header bell dropdown (Bell -> "Show All Notifications" -> `/customer/notifications`), the same as before the unify. The staff menu in the same file is unchanged. Build passes.

---

## September 4, 2026 2:57 PM (PHT) - Althea09-git
- **SERVICES & PRICING MOBILE CARDS COMPACTED**: reduced card width to 200px, padding to p-4, icons/text/price all smaller for a more compact carousel on mobile; cards use a square (aspect-square) layout on mobile.
- **SERVICES & PRICING BLUE HIGHLIGHT FIXED**: removed the isManualNav guard that was blocking the scroll-based active-card detection; cards now highlight reliably on click/tap/swipe with a clear blue background tint (bg-[#F0F7FF]), thick blue border, blue ring, and strong shadow; added onTouchStart for reliable mobile tap detection.
- **CAROUSEL AUTO-CENTERS ACTIVE CARD**: added IntersectionObserver so the active card auto-scrolls to center when the Services & Pricing section enters the viewport; on initial page load the first card centers after a short delay; arrows/dots also scroll to center.
- **SHOP INFO CARDS SIDE-BY-SIDE ON MOBILE**: changed the grid from grid-cols-1 to grid-cols-2 so Shop Hours and Location sit in one row on mobile; cards made compact with smaller padding, icons, text, and a responsive stacked layout.
- **JOB OPENINGS COMPACT ACCORDION ON MOBILE**: replaced the large vertical job cards with a compact collapsible accordion list; collapsed row shows title, schedule, Active badge, and a rotating chevron; tap expands to reveal description and Apply Now button with smooth height animation; title wraps instead of truncating, 44px touch target, flexible header layout.
- **ABOUT DOCUFY INTERACTIVE ON MOBILE**: made the about card compact (p-5 instead of p-12) with a short one-line preview and a Show more/Show less toggle; expands with a smooth height animation; added hover lift effect; desktop keeps the full body.
- **FOOTER MINIMALIST ON MOBILE**: centered stack layout with smaller logo, shorter link labels (Terms/Privacy/Contact), subtle copyright, and clean spacing.

---

## September 4, 2026 3:09 PM (PHT) - Althea09-git
- **HEADER LOGO/TITLE ALIGNMENT**: grouped the logo icon and "Docufy PSMS" text with a fixed 8px (gap-2) flexbox gap at all screen sizes so they align cleanly on the left of the header (removed the larger desktop gap).
- **HERO TITLE SPACING FIX**: the hero title now trims the first segment of the stored heroTitle before rendering, so a saved "Print , Track" value displays cleanly as "Print, Track" (no stray space before the comma/output line break).
- **JOB OPENING ACCORDION HEADER CONSISTENCY**: moved the "Active" badge out of the job-title row and positioned it inline next to the "Schedule" text on its own line, so the job title (left) and the right-aligned chevron button stay perfectly vertically aligned regardless of title length; headers now share a uniform minimum height (min-h 52px).
- **SERVICES & PRICING PRICE ELEMENTS NORMALIZED**: normalized the pricing typography across all three cards into one consistent structure - currency symbol (â‚±) at small semibold, the price digit at a uniform 2xl bold, and the unit/qualifier (/ page, starting, / document) at a small medium-weight gray, all baseline-aligned so the currency, digit, and unit line up identically on every card.

---

## September 4, 2026 3:40 PM (PHT) - Althea09-git
- **ADMIN DASHBOARD MOBILE - METRIC CARDS (Overview)**: the four metric cards (Total Sales, Total Orders, Walk-in Transactions, Active Customers) now sit in a 2-column grid on mobile (grid-cols-2 gap-3) instead of full-width stacked cards. Card interiors compacted to p-3 rounded-xl with the icon left and label+value beside it (flex gap-3); labels are small gray (text-xs text-gray-500, uppercase on mobile), values are text-lg font-bold; the percentage trend stays but the "vs previous period" subtext is hidden on small screens to keep card height tight.
- **ADMIN DASHBOARD - SALES TREND CHART**: chart container height capped to h-48 on mobile (about 192px) so it stops causing excessive vertical scrolling, expanding back to 280px on desktop (lg).
- **ADMIN DASHBOARD - SALES COMPARISON CARD**: This Period and Previous Period changed from stacked blocks into a side-by-side 2-column grid on mobile (flex justify-between on desktop); the percentage badge was moved up onto the same line as the currency amount (e.g. â‚±625.00 + green/red trend pill); the "You earned â‚±X more/less..." summary note compacted to text-xs text-gray-500 with a reduced top margin and a slimmer progress bar (h-2 on mobile).
- **ADMIN DASHBOARD - RECENT TRANSACTIONS**: on mobile the transaction list now shows only the first 4 by default with a "See all N transactions / Show less" toggle button to reveal the full list (the header "View All" still links to the orders page). Rows compacted to py-2.5 vertical padding, keeping Order ID + type badge on top, customer name below, and price + Paid/Pending status badge on the far right.
- **ADMIN DASHBOARD - INVENTORY SNAPSHOT**: the three metric counts (Total Items, Low Stock, Out of Stock) were converted from a stacked list into a 3-column centered grid (grid-cols-3 gap-2 text-center) with compact gray boxes (p-2.5 bg-gray-50 rounded-lg) instead of large colored tiles. The "All inventory levels are currently healthy" message is now a compact single-line text-xs banner (flex gap-2 p-2 bg-green-50 text-green-700 rounded-md).

---

## September 4, 2026 3:50 PM (PHT) - Althea09-git
- **ADMIN DASHBOARD - SALES TAB METRIC CARDS (mobile)**: the four sales metric cards (Total Revenue, Highest Sales, Lowest Sales, Sales Periods) were converted from a vertical stack into a 2-column grid on mobile (grid-cols-2 gap-3). Cards compacted to p-3.5 rounded-xl; section titles are uppercase text-[10px] font-bold tracking-wider gray; key numbers are text-base font-bold gray-900. Highest/Lowest Sales now show the month as a compact green/red badge with the price underneath (tight grouping); Sales Periods keeps the count and "months with data" inline on the same row.
- **ADMIN DASHBOARD - SERVICES TAB TOP METRIC CARDS (mobile)**: the three cards (Most-Used Service, Best-Selling Revenue, Total Orders) were converted to a compact grid (grid-cols-2 on mobile, grid-cols-3 on desktop) with p-3 padding; section titles are uppercase text-[10px] font-bold gray; primary text is text-xs font-semibold gray-900 with the count/revenue shown as a small pill badge underneath. On mobile the third card (Total Orders) centers beneath the top two via col-span-2 + max-w-[50%] + centered flex column so the number and "all services" badge are balanced.
- **ADMIN DASHBOARD - SERVICES TAB BREAKDOWN TABLE (mobile)**: table padding compacted to py-2 px-2.5 with text-xs; the "% of Total" column is hidden on mobile and replaced by a mini inline blue progress bar under each service name; the table wrapper is w-full overflow-x-auto.
- **ADMIN DASHBOARD - SERVICES TAB REVENUE CHART (mobile)**: the Revenue by Service bar chart container was capped to h-44 on mobile (restoring to 300px on desktop) to prevent excessive vertical scrolling.

---

## September 4, 2026 5:02 PM (PHT) - Althea09-git
- **HEADER CLOCK / TITLE COLLISION FIX (all dashboard views)**: in the shared Layout header (src/app/components/Layout.tsx), the page-title container gained min-w-0 flex-1 and the h1 gained min-w-0 truncate, while the hamburger/back buttons got shrink-0 and the live clock + notification bell container got flex-shrink-0. Long page titles now truncate cleanly instead of pushing the live timestamp/bell off-screen on narrow mobile viewports. Because this is the single shared header, it applies globally to Attendance, Orders, Job Board, Inventory, and every other dashboard page.
- **ADMIN JOB BOARD - COMPACT CARDS WITH ACCORDION (mobile)**: job cards are now compact by default showing only the Title, Job Type tag, Applications count chip, and action buttons; the full description is hidden behind a collapsible accordion ("Show description"/"Hide description" with animated height + rotating chevron) via a new expandedJobId state. Action buttons are grouped in a flex items-center justify-between row with compact text-xs styles so they no longer overflow the right edge. Duration, Applications, and Posted ID were condensed into a single horizontal stats bar (flex gap-4 text-xs text-gray-500 py-2 border-t border-gray-100).
- **ADMIN JOB BOARD - APPLICANTS VIEW (mobile)**: the applicants header is now left-aligned and stacks vertically on mobile with the "Back to Job Postings" button above the title; the title is compact (text-lg font-bold text-gray-900 on mobile, restoring to text-2xl on desktop) and the subtitle is smaller (text-xs text-gray-500). The empty state is a full-width centered card (p-8 text-center bg-gray-50/50 border-dashed rounded-xl) with an Inbox icon and helper text for a balanced look.
- **ORDERS - STATUS METRIC CARDS COMPACT GRID (mobile)**: the 8 status cards on the Orders management page (shared UnifiedOrders) now sit in a 2-column grid on mobile (grid-cols-2, expanding to 4 on desktop) with compact p-2.5 cards, smaller icon chips, text-lg bold counts, and the descriptive subtext hidden on mobile (hidden sm:block). Filter-on-click, hover, and active blue highlight behavior preserved.
- **WALK-IN REVIEW SCREEN - 2-ROW ACTION BUTTONS (mobile)**: on the walk-in review step (PrintTransaction step 4), the bottom buttons are re-laid out in two rows - a top grid-cols-2 row with Back (secondary) and Cancel Order (red), and a full-width "Proceed to In Queue" blue primary CTA below (touch-friendly py-2.5/py-3 text-xs/sm) instead of a crowding single row.
- **NUMBER OF COPIES + QUANTITY UNIFIED STEPPER (both flows)**: replaced the plain numeric inputs for "Number of Copies" and (photo) "Quantity" with a single reusable NumberStepper control - a minus (-) button, a centered editable number field, and a plus (+) button in a bordered rounded container with touch-friendly padding. The input keeps a temporary string draft state so users can backspace/erase cleanly, with the value clamped back to the minimum on blur. The minus button is disabled at the minimum threshold, and clicking +/- immediately recalculates and updates the file's subtotal. For photo Quantity, the minimum is the size's minimum-batch requirement from the pricing matrix (e.g. 2R min 6); for copies it is 1.
---

## September 4, 2026 9:20 PM (PHT) - prans
- REAL GCASH REFERENCE-NUMBER OCR DETECTION (customer PaymentVerification): replaced the fake/mock auto-detect with real OCR via Tesseract.js (client-side, worker cached). The uploaded payment screenshot is preprocessed (upscaled, grayscale, contrast boost) so light-gray ""Ref No."" / ""Reference Number"" / ""Ref. No."" labels become readable, and the digits right after the label are extracted even when the number wraps across two rows; falls back to a standalone digit run only when no label is found, preferring a ~13-digit GCash-style length to avoid grabbing random numbers/phone numbers. The detected number auto-fills into the still-editable reference field (the user keeps the image preview to review/correct); a scanning spinner shows while OCR runs.
- AUTO-DETECT IS GCASH-ONLY + INFO NOTES: the OCR auto-scan only runs when the selected payment method is GCash. Informational notes added in two places only: (1) admin ''Add/Edit Payment Method'' dialog says automatic reference-number detection only works for GCash; (2) the customer print-request payment method section shows a note when a non-GCash online method (e.g. Maya) is chosen, explaining the reference is entered manually for that method.
- PROOF-OF-PAYMENT ACTION BUTTONS (PaymentVerification): the ''View'' button was restyled to match the ''Change'' button (same white/bordered/hover look), and a red X remove button was added beside Change to clear the uploaded file, preview, and any auto-detected reference.
- DARKER BUTTON OUTLINES (system-wide ui/button.tsx): the default/outline/secondary button variants changed their light blue border (border-blue-200) to a darker more visible border-blue-400 so outline buttons like ''Back'' are clearly visible.
- PRINT OPTION SELECTED LEFT-BORDER INDICATORS (PrintTransaction): the selected Color Mode option and Photo Finish option now keep their full selected style plus a soft rounded blue left-edge indicator bar; the Photo Finish (Matte/Glossy) options were re-stacked vertically (Glossy top, Matte below) and the photo panel re-arranged so Photo Size + Quantity stack on the left and Finish on the right.
- TIGHTER ORDERS & PAYMENT-VERIFICATION TABLES: reduced column horizontal padding (px-6 to px-4), narrowed the # column (w-16 to w-12), tightened the avatar-to-customer-name gap (gap-3 to gap-2), and matched the Orders period group-row padding, so the numbers, customer names, and categories sit closer together.
