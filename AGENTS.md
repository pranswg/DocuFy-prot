# AGENTS.md

## Project State Summary
React 18 + Vite + TS frontend prototype ("DocuFy PSMS"). No backend; mock/localStorage data. Roles: customer, staff, admin.

### Works
- Auth context, role-based routing, ProtectedRoute, shared Layout (sidebar+header, notifications, SIEM alerts for admin).
- Customer: dashboard, new print request, orders, order tracking, payment, job board + apply. Job board reads from jobsStore.
- Staff/Admin dashboards with KPI cards.
- Jobs: localStorage-persisted via jobsStore (seeded w/ 3 defaults). Admin can add/archive/restore; shows for customers. Fixed status casing (active) + id assignment.
- Portfolio PDF/image preview: NO inline viewer at all. Both admin (JobBoardManagement.tsx) and customer (JobBoard.tsx) open portfolio files in the browser's NATIVE PDF viewer in a NEW TAB via a module-level `openBlobInNewTab(blob)` helper: `URL.createObjectURL(blob)` -> `window.open(url, "_blank", "noopener,noreferrer")` -> delayed `URL.revokeObjectURL(url)` (60s, after tab load) to avoid leaks/blank viewer; anchor-click fallback if popup blocked; external links via `<a target=_blank>` / `window.open`. Shared `src/app/components/shared/PortfolioPreview.tsx` (was the pdf.js viewer) DELETED. Customer file-view button labeled "View". Admin's redundant "View Portfolio" modal dialog (showResumeDialog) fully REMOVED — the View Portfolio / Open Link buttons only open the new tab, no modal.
- Logo .png imports: added src/vite-env.d.ts (/// vite/client) to clear TS "cannot find module" squiggles.
- KPI cards unified to admin style on desktop only (md:) for customer; mobile keeps blue compact style.
- Customer dashboard order: KPI grid on top, quick actions+recent orders below, info cards last. (Reverted a swap back to this.)
- SYSTEM-WIDE BLUE-WHITE THEME (semantic colors preserved): flattened all non-blue accents to the blue/white/gray system palette — purple → blue, orange → blue, pink/cyan → blue, and all NON-verified/check greens → blue. KEPT green ONLY for: check glyph icons (Check/CheckCircle/CheckCircle2 `text-green-*`) and positive/verified semantic states (password 'Strong' + requirements-met, attendance 'Active'/'Present'/'Complete', 'Verified' badge, inventory 'In Stock', task 'completed', down-payment Verified). KEPT red (errors/Rejected/delete), amber/yellow (warnings/Pending). Brand blues: `#1D73EC` (customer primary) and `#2F6FD6` (admin primary) both retained (near-identical system blue). Applied mechanically across all admin/customer/staff components (~30 files).
- SYSTEM-WIDE POINTER CURSOR (desktop hover): Tailwind v4 defaults buttons to `cursor: default`, so added a global base rule in `src/styles/tailwind.css`: all native `button` and `role="button"` (non-disabled) show `cursor: pointer`. Shared `Card` component (`src/app/components/ui/card.tsx`) auto-adds `cursor-pointer` whenever a `<Card>` has an `onClick`. `data-cursor-default` attribute = opt-out keeps default cursor. Backdrop scrims (invisible click-to-close overlays in Layout, file-attachments) intentionally stay default cursor.

### Pending / Notes
- Supabase integration NOT in place: jobs = localStorage (per-browser); portfolio File objects are in-memory only (no cross-session sharing; admin preview needs File present in session). Real multi-device sharing requires backend.
- apps not persisted across sessions; portfolio preview relies on same-session File object.
- Previous session tasks (see IMPLEMENTATION_*.md/COMPLETED_FEATURES.md): page-title-in-header propagation to all pages, JobApplyForm position field readonly, Reports button alignment, JBM full-window views (partly done via viewState).

## Active Files
- src/app/components/customer/JobBoard.tsx
- src/app/components/admin/JobBoardManagement.tsx
- src/app/utils/jobsStore.ts
- src/app/utils/applicationsStore.ts
- src/app/components/Layout.tsx
- src/app/components/customer/CustomerDashboard.tsx
- AGENTS.md

## Architecture / Next Steps
- Update this file on every code change/feature/strategy shift.
- Next: if integrating backend, move jobs/apps/portfolio from localStorage/in-memory to Supabase tables + storage URLs; swap preview to accept URL when no File present.
- Run npm run build to verify.
