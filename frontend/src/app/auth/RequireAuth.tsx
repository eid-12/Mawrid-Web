import { Navigate, Outlet, useLocation } from "react-router";
import { getAccessToken, reloadAccessTokenFromStorage } from "../api/client";
import { Role, useAuth } from "./AuthContext";

/** Blocks unauthenticated users and wrong roles. Re-reads localStorage so Back/Forward cannot keep a dead session. */
export function RequireAuth({ allowedRoles }: { allowedRoles?: Role[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const token = reloadAccessTokenFromStorage() ?? getAccessToken();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading your session...</p>
      </div>
    );
  }
  if (!user || !token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

