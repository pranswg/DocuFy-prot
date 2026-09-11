// Automatic screen-size scaling for the Docufy UI.
//
// The compact admin/staff/customer layouts are tuned for a 1366px-wide viewport
// (the classic 1366x768 laptop at 100% Windows zoom). Browsers that run on a
// differently-scaled display (e.g. Windows display scaling of 125%) report a
// different CSS-pixel viewport for the same physical screen, so the tuned
// layout renders cramped on some machines and too roomy on others.
//
// We compensate by setting a CSS `zoom` factor on the <html> element equal to
// `realViewportWidth / 1366` (clamped). Because the zoom lives on the root
// element it behaves exactly like the browser's own page zoom:
//   - every Tailwind breakpoint re-evaluates against the "virtual" 1366px
//     layout viewport, so the lg/xl/2xl layouts kick in at the same proportions
//     the design was tuned for, on every machine;
//   - viewport units (100vw / 100vh / min-h-screen sidebars) resolve against
//     that same virtual viewport, so full-height and full-width elements still
//     fill the screen after scaling;
//   - fixed-position portals (dialogs, popovers, the mobile nav sheet) render
//     inside the zoomed root and stay perfectly in sync with the page.
//
// The net effect: a 1366-design layout always looks like a 1366px design,
// scaled down to fit a narrower screen and scaled up to fill a wider one.
//
// The scale is clamped (MIN_SCALE..MAX_SCALE) so the UI never becomes
// unreadably small or absurdly large, and it is NOT applied below the desktop
// breakpoint — phones, portrait tablets, and narrow laptops keep their fully
// responsive mobile treatment untouched.

const DESIGN_WIDTH = 1366;
const MIN_SCALE = 0.6;
const MAX_SCALE = 1.25;
const DESKTOP_MIN_WIDTH = 1024;

let rafId = 0;

// The viewport width must come from the screen (CSS-pixel screen width), NOT
// the window. `innerWidth`/`visualViewport.width` change when the user zooms
// the browser (Ctrl +/- / trackpad pinch), so measuring them for our CSS zoom
// would make us compensate against the user's own zoom - the page visibly
// zooms in and out and every compensation step re-rasterizes the text at a
// different fractional scale, turning it blurry. `screen.width`/`availWidth`
// are the screen's CSS-pixel size at 100% browser zoom: they reflect the OS
// display scaling (125% Windows -> 1536 on a 1920 screen) but NEVER change
// with the browser's page zoom, so our CSS zoom stays fixed and the user's own
// browser zoom simply works on top, crisply. innerWidth/visualViewport remain
// as fallbacks only for environments without the Screen API.
function readRealViewportWidth(): number {
  if (typeof window === "undefined") return DESIGN_WIDTH;
  const s = window.screen;
  if (s) {
    if (s.availWidth > 0) return s.availWidth;
    if (s.width > 0) return s.width;
  }
  const vv = window.visualViewport;
  if (vv && vv.width > 0) return vv.width;
  return window.innerWidth;
}

// A CSS `zoom` on <html> does NOT rescale `100vh`/`100vw` viewport units in
// Chromium — those report the *un-zoomed* viewport size while percentage
// heights ARE scaled (they resolve against the zoomed containing block). So a
// min-h-screen / h-screen shell ends up visually shorter than the window and
// the page's white body background shows at the bottom. We publish
// `--docufy-vh` / `--docufy-vw` custom properties equal to the true
// "one viewport height/width" in layout space (innerHeight/zoom) and remap the
// screen-height utilities to them in CSS.
const VH_PROP = "--docufy-vh";
const VW_PROP = "--docufy-vw";

function syncViewportHeightVariable(scale: number): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (scale === 1) {
    root.style.removeProperty(VH_PROP); // fall back to plain 100vh
    root.style.removeProperty(VW_PROP);
    return;
  }
  const vv = window.visualViewport;
  const realHeight = vv && vv.height > 0 ? vv.height : window.innerHeight;
  root.style.setProperty(VH_PROP, `${realHeight / scale}px`);
  root.style.setProperty(VW_PROP, `${readRealViewportWidth() / scale}px`);
}

function clampToRange(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function applyScreenScale(): void {
  if (typeof document === "undefined") return;
  const realWidth = readRealViewportWidth();
  let scale = 1;
  if (realWidth >= DESKTOP_MIN_WIDTH) {
    scale = clampToRange(realWidth / DESIGN_WIDTH, MIN_SCALE, MAX_SCALE);
  }
  const zoomed = String(scale);
  if (document.documentElement.style.zoom !== zoomed) {
    document.documentElement.style.zoom = zoomed;
    // Force a synchronous relayout so the new zoom is fully applied before the
    // browser paints. Without this, Chromium can leave a stale unpainted strip
    // at the bottom of the page (a white box) when the zoom is set early in the
    // page life and nothing else triggers a reflow (e.g. a manual zoom in/out).
    void document.documentElement.clientWidth;
    void document.documentElement.clientHeight;
  }
  syncViewportHeightVariable(scale);
}

export function initScreenScale(): void {
  if (typeof window === "undefined") return;
  applyScreenScale();
  // Chromium can paint the page once with the initial (unzoomed or empty)
  // layout before our zoom takes full effect, leaving an unpainted white box
  // at the bottom until a relayout happens. Re-apply the (idempotent) zoom one
  // frame after the first paint and again once fonts/images finish loading, so
  // the correct sizes are in place without any user interaction.
  requestAnimationFrame(() => requestAnimationFrame(applyScreenScale));
  if (document.readyState === "loading") {
    window.addEventListener(
      "load",
      () => requestAnimationFrame(applyScreenScale),
      { once: true },
    );
  } else {
    requestAnimationFrame(applyScreenScale);
  }
  const handler = () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(applyScreenScale);
  };
  window.addEventListener("resize", handler);
  window.visualViewport?.addEventListener("resize", handler);
}