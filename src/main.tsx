
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { syncInternetTime } from "./app/utils/pht.ts";

  // Start syncing the app clock to real internet GMT+8 as early as possible.
  syncInternetTime();

  createRoot(document.getElementById("root")!).render(<App />);
  