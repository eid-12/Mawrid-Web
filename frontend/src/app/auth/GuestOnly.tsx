import { Navigate, Outlet } from "react-router";
import { getAccessToken, reloadAccessTokenFromStorage } from "../api/client";
import { dashboardPathForRole, useAuth } from "./AuthContext";

/** Public auth/marketing pages: bounce an existing session away from login/signup. */
export function GuestOnly() {
  const { user, loading } = useAuth();
  const token = reloadAccessTokenFromStorage() ?? getAccessToken();

  if (user && token) {
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }

  if (loading && token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading your session...</p>
      </div>
    );
  }

  return <Outlet />;
}
