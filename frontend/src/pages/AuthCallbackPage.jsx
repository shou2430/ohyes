import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      localStorage.setItem("ohyes_token", token);
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <p className="text-lg text-gray-600">Signing in...</p>
    </div>
  );
}
