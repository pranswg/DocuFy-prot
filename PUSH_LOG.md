# PUSH LOG — DocuFy PSMS

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
