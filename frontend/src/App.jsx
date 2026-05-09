import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import CreateInvitationPage from "./pages/CreateInvitationPage";
import InvitationGatePage from "./pages/InvitationGatePage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create"
            element={
              <ProtectedRoute>
                <CreateInvitationPage />
              </ProtectedRoute>
            }
          />
          <Route path="/i/:code" element={<InvitationGatePage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
