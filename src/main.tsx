
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { syncInternetTime } from "./app/utils/pht.ts";
  import { purgeLocalAvatarKeys } from "./app/utils/supabaseAvatar";

  // Avatars are Supabase-only (see supabaseAvatar.ts); clear any leftover
  // localStorage avatar keys older builds wrote so no stale picture shows.
  purgeLocalAvatarKeys();

  // Start syncing the app clock to real internet GMT+8 as early as possible.
  syncInternetTime();

  createRoot(document.getElementById("root")!).render(<App />);
  