import { useTranslation } from "react-i18next";
import { LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router";
import LoadingSpinner from "../components/LoadingSpinner";

export default function LandingPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <LoadingSpinner />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-8">
      <div className="flex max-w-[400px] flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-4xl font-semibold text-text-primary">
            {t("app.name")}
          </h1>
          <p className="mt-2 text-base text-text-secondary">
            {t("app.tagline")}
          </p>
        </div>
        {/* Note: UI spec defines a loading state for this button, but since it's an <a> tag
            triggering a full-page redirect (server-side OAuth flow), there's no async gap to show
            a spinner. The browser's native navigation indicator serves this purpose. */}
        <a
          href={`${import.meta.env.VITE_API_URL}/api/auth/login`}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent text-sm font-medium text-white transition-transform hover:scale-[1.02] sm:w-auto sm:min-w-[200px] sm:px-6"
        >
          <LogIn size={18} />
          {t("landing.signIn")}
        </a>
      </div>
    </div>
  );
}
