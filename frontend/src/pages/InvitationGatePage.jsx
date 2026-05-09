import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { HeartCrack } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function InvitationGatePage() {
  const { code } = useParams();
  const { t } = useTranslation();
  const [status, setStatus] = useState("loading"); // "loading" | "valid" | "expired"

  useEffect(() => {
    async function checkInvitation() {
      try {
        const res = await fetch(`${API_URL}/api/invitations/by-code/${code}`);
        if (res.ok) {
          setStatus("valid");
        } else {
          setStatus("expired");
        }
      } catch {
        setStatus("expired");
      }
    }
    checkInvitation();
  }, [code]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <LoadingSpinner />
      </div>
    );
  }

  if (status === "valid") {
    // Phase 3 will replace this with the password gate
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-4">
        <div className="max-w-[320px] text-center">
          <h1 className="text-2xl font-semibold text-text-primary">
            {t("app.name")}
          </h1>
          <p className="mt-2 text-base text-text-secondary">
            Password gate coming in Phase 3
          </p>
        </div>
      </div>
    );
  }

  // Expired / not found state
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="max-w-[320px] text-center">
        <HeartCrack size={48} className="mx-auto text-text-secondary" />
        <h1 className="mt-4 text-2xl font-semibold text-text-primary">
          {t("invitation.expiredHeading")}
        </h1>
        <p className="mt-2 text-base text-text-secondary">
          {t("invitation.expiredBody")}
        </p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm text-accent hover:underline"
        >
          {t("invitation.goHome")}
        </Link>
      </div>
    </div>
  );
}
