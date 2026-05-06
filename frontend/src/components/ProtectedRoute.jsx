import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
