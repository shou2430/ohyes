import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { HeartCrack } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import PasswordGate from "../components/recipient/PasswordGate";
import InvitationReveal from "../components/recipient/InvitationReveal";
import MessageCard from "../components/recipient/MessageCard";
import PostcardKeepsake from "../components/recipient/PostcardKeepsake";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function InvitationGatePage() {
  const { code } = useParams();
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [screen, setScreen] = useState("loading");
  const [invitation, setInvitation] = useState(null);
  const [title, setTitle] = useState("");
  const [verifiedPassword, setVerifiedPassword] = useState("");
  const [cachedPhotoUrl, setCachedPhotoUrl] = useState(null);

  // Cache the photo as a data URL before respond API deletes it
  useEffect(() => {
    if (!invitation?.photo_url) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.fetchPriority = "high";
    img.decoding = "async";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d").drawImage(img, 0, 0);
        setCachedPhotoUrl(canvas.toDataURL("image/jpeg", 0.9));
      } catch {
        // CORS or tainted canvas — fall back to original URL
        setCachedPhotoUrl(`${API_URL}${invitation.photo_url}`);
      }
    };
    img.onerror = () => {
      setCachedPhotoUrl(`${API_URL}${invitation.photo_url}`);
    };
    img.src = `${API_URL}${invitation.photo_url}`;
  }, [invitation]);

  useEffect(() => {
    async function checkInvitation() {
      try {
        const res = await fetch(`${API_URL}/api/invitations/by-code/${code}`);
        if (res.ok) {
          const data = await res.json();
          setTitle(data.title);
          setScreen("password");
        } else {
          setScreen("expired");
        }
      } catch {
        setScreen("expired");
      }
    }
    checkInvitation();
  }, [code]);

  const slideTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.4, ease: [0.32, 0.72, 0, 1] };

  const slideInitial = prefersReducedMotion
    ? { opacity: 0 }
    : { x: "-100%", opacity: 0 };

  const slideAnimate = prefersReducedMotion
    ? { opacity: 1 }
    : { x: 0, opacity: 1 };

  const slideExit = prefersReducedMotion
    ? { opacity: 0 }
    : { x: "100%", opacity: 0 };

  const handleVerified = (data, password) => {
    setInvitation(data);
    setVerifiedPassword(password);
    setScreen("reveal");
  };

  const handleYesClick = () => {
    setScreen("message");
  };

  const handleSent = () => {
    setScreen("postcard");
  };

  if (screen === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <LoadingSpinner />
      </div>
    );
  }

  if (screen === "expired") {
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
            className="mt-4 inline-flex min-h-[44px] items-center text-sm text-accent hover:underline"
          >
            {t("invitation.goHome")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream overflow-hidden">
      <AnimatePresence mode="wait">
        {screen === "password" && (
          <motion.div
            key="password"
            initial={slideInitial}
            animate={slideAnimate}
            exit={slideExit}
            transition={slideTransition}
          >
            <PasswordGate
              title={title}
              shortCode={code}
              onVerified={handleVerified}
            />
          </motion.div>
        )}

        {screen === "reveal" && (
          <motion.div
            key="reveal"
            initial={slideInitial}
            animate={slideAnimate}
            exit={slideExit}
            transition={slideTransition}
          >
            <InvitationReveal
              invitation={invitation}
              onYesClick={handleYesClick}
            />
          </motion.div>
        )}

        {screen === "message" && (
          <motion.div
            key="message"
            initial={slideInitial}
            animate={slideAnimate}
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { scaleY: 0, opacity: 0 }
            }
            style={
              !prefersReducedMotion
                ? { transformOrigin: "bottom center", perspective: "800px" }
                : undefined
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.6, ease: [0.32, 0.72, 0, 1] }
            }
          >
            <div className="flex min-h-screen items-center justify-center px-4">
              <MessageCard shortCode={code} password={verifiedPassword} onSent={handleSent} />
            </div>
          </motion.div>
        )}

        {screen === "postcard" && (
          <motion.div
            key="postcard"
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { y: "100%", opacity: 0 }
            }
            animate={{ y: 0, opacity: 1 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    type: "spring",
                    stiffness: 200,
                    damping: 20,
                    delay: 0.3,
                  }
            }
          >
            <div className="flex min-h-screen items-center justify-center px-4 py-8">
              <PostcardKeepsake invitation={invitation} cachedPhotoUrl={cachedPhotoUrl} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
