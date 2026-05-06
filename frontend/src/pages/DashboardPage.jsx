import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Set page title per UI spec
  document.title = "Dashboard - OhYes";

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const initials = user?.display_name
    ? user.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="min-h-screen bg-cream">
      {/* TopBar */}
      <header className="flex h-16 items-center justify-between border-b border-border bg-white px-4 sm:px-8">
        <span className="text-sm font-medium text-text-primary">
          {t("app.name")}
        </span>
        <div className="flex items-center gap-2">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={`${user.display_name}'s profile photo`}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white"
              aria-label={user?.display_name}
            >
              {initials}
            </div>
          )}
          <span className="text-sm text-text-primary">
            {user?.display_name}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-destructive"
          >
            <LogOut size={16} />
            {t("dashboard.logOut")}
          </button>
        </div>
      </header>

      {/* Empty State */}
      <main className="flex flex-1 items-center justify-center px-4 pt-32">
        <div className="max-w-[320px] text-center">
          <h2 className="text-2xl font-semibold text-text-primary">
            {t("dashboard.emptyHeading")}
          </h2>
          <p className="mt-2 text-base text-text-secondary">
            {t("dashboard.emptyBody")}
          </p>
          <button
            disabled
            className="mt-4 h-11 w-full cursor-not-allowed rounded-lg bg-accent text-sm font-medium text-white opacity-50 sm:w-auto sm:min-w-[200px] sm:px-6"
          >
            {t("dashboard.createButton")}
          </button>
        </div>
      </main>
    </div>
  );
}
