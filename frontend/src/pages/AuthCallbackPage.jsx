import { useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useAuth } from "../context/auth-context";

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  // StrictMode runs effects twice in dev; only exchange the token once.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = searchParams.get("token");
    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    login(token)
      .then((me) => navigate(me ? "/dashboard" : "/", { replace: true }))
      .catch(() => navigate("/", { replace: true }));
  }, [searchParams, navigate, login]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <p className="text-lg text-gray-600">Signing in...</p>
    </div>
  );
}
