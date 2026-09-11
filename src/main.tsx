
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { syncInternetTime } from "./app/utils/pht.ts";
  import { initScreenScale } from "./app/utils/screenScale";

  // Start syncing the app clock to real internet GMT+8 as early as possible.
  syncInternetTime();

  // Auto-fit the tuned 1366px layout to the actual screen/zoom proportionally
  // (applies a clamped CSS zoom on <html>; skipped below the desktop width).
  initScreenScale();

  createRoot(document.getElementById("root")!).render(<App />);
  