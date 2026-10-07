import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { Spinner } from "./ui/spinner";

// Landing page for the Supabase Google OAuth redirect (the URL configured as
// redirectTo in AuthContext.signInWithGoogle). Supabase restores the session
// and AuthProvider's session-restore effect loads the profile BEFORE the first
// render settles, so this page only has to wait for `authLoading` to finish
// and then route by role. It also surfaces Supabase's own ?error= params
// (e.g. access_denied) instead of letting the user stare at a blank screen.
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, authLoading } = useAuth();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      toast.error(
        searchParams.get("error_description") || "Sign-in was not completed.",
      );
      navigate("/login", { replace: true });
      return;
    }

    if (authLoading) return;

    if (user) {
      navigate(`/${user.role}/dashboard`, { replace: true });
    } else {
      toast.error("Sign-in was not completed. Please try again.");
      navigate("/login", { replace: true });
    }
  }, [user, authLoading, navigate, searchParams]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#f6f7f9]">
      <Spinner size="md" label="Signing you in…" stack />
    </div>
  );
}