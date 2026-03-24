import React from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { Role, useAuth } from "./AuthContext";

export function RequireAuth({ allowedRoles }: { allowedRoles?: Role[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

