import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import InvitationCard from "../components/InvitationCard";
import LoadingSpinner from "../components/LoadingSpinner";
import Toast from "../components/Toast";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Set page title per UI spec
  useEffect(() => {
    document.title = "Dashboard - OhYes";
  }, []);

  // Fetch invitations on mount
  useEffect(() => {
    async function fetchInvitations() {
      try {
        const token = localStorage.getItem("ohyes_token");
        const res = await fetch(`${API_URL}/api/invitations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setInvitations(await res.json());
        }
      } catch {
        setToast(t("errors.network"));
      } finally {
        setLoading(false);
      }
    }
    fetchInvitations();
  }, [t]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleDelete = async (invitationId) => {
    try {
      const token = localStorage.getItem("ohyes_token");
      const res = await fetch(`${API_URL}/api/invitations/${invitationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      } else {
        setToast(t("errors.network"));
      }
    } catch {
      setToast(t("errors.network"));
    }
  };

  const handleCopyError = () => {
    setToast(t("errors.network"));
  };

  const initials = user?.display_name
    ? user.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const canCreate = invitations.length < 2;

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

      {/* Main content */}
      <main>
        {loading ? (
          <div className="flex items-center justify-center pt-32">
            <LoadingSpinner />
          </div>
        ) : invitations.length === 0 ? (
          /* Empty state */
          <div className="flex flex-1 items-center justify-center px-4 pt-32">
            <div className="max-w-[320px] text-center">
              <h2 className="text-2xl font-semibold text-text-primary">
                {t("dashboard.emptyHeading")}
              </h2>
              <p className="mt-2 text-base text-text-secondary">
                {t("dashboard.emptyBody")}
              </p>
              <Link
                to="/create"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-accent text-sm font-medium text-white transition-transform hover:scale-[1.02] sm:min-w-[200px] sm:px-6"
              >
                {t("dashboard.createButton")}
              </Link>
            </div>
          </div>
        ) : (
          /* Invitation cards */
          <div className="px-4 py-6 sm:px-8">
            <div className="mx-auto max-w-2xl">
              <div className="flex flex-col gap-4">
                {invitations.map((invitation) => (
                  <InvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    onDelete={handleDelete}
                    onCopyError={handleCopyError}
                  />
                ))}
              </div>

              {/* Create button area */}
              <div className="mt-6 text-center">
                {canCreate ? (
                  <Link
                    to="/create"
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-accent text-sm font-medium text-white transition-transform hover:scale-[1.02] sm:min-w-[200px] sm:px-6"
                  >
                    {t("dashboard.createButton")}
                  </Link>
                ) : (
                  <>
                    <button
                      disabled
                      className="h-11 cursor-not-allowed rounded-lg bg-accent text-sm font-medium text-white opacity-50 sm:min-w-[200px] sm:px-6"
                    >
                      {t("dashboard.createButton")}
                    </button>
                    <p className="mt-2 text-sm text-text-secondary">
                      {t("dashboard.limitReached")}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <Toast message={toast} type="error" onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
