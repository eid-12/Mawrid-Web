import { createBrowserRouter } from "react-router";
import { lazy } from "react";

// Public pages
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Verification = lazy(() => import("./pages/Verification"));
const NotFound = lazy(() => import("./pages/NotFound"));
import { RequireAuth } from "./auth/RequireAuth";
import { GuestOnly } from "./auth/GuestOnly";

// User portal
const UserLayout = lazy(() => import("./layouts/UserLayout"));
const UserDashboard = lazy(() => import("./pages/user/UserDashboard"));
const Catalog = lazy(() => import("./pages/user/Catalog"));
const ItemDetails = lazy(() => import("./pages/user/ItemDetails"));
const MyRequests = lazy(() => import("./pages/user/MyRequests"));
const Settings = lazy(() => import("./pages/user/Settings"));

// Admin portal
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const Inventory = lazy(() => import("./pages/admin/Inventory"));
const Requests = lazy(() => import("./pages/admin/Requests"));
const Checking = lazy(() => import("./pages/admin/Checking"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
import { RequireActiveAdminCollege } from "./auth/RequireActiveAdminCollege";

// Super admin portal
const SuperAdminLayout = lazy(() => import("./layouts/SuperAdminLayout"));
const GlobalDashboard = lazy(() => import("./pages/superadmin/GlobalDashboard"));
const Colleges = lazy(() => import("./pages/superadmin/Colleges"));
const UserManagement = lazy(() => import("./pages/superadmin/UserManagement"));
const SuperAdminSettings = lazy(() => import("./pages/superadmin/SuperAdminSettings"));

export const router = createBrowserRouter([
  {
    // Landing + auth screens: logged-in users are redirected to their dashboard.
    element: <GuestOnly />,
    children: [
      { path: "/", Component: Landing },
      { path: "/login", Component: Login },
      { path: "/signup", Component: Signup },
      { path: "/forgot-password", Component: ForgotPassword },
    ],
  },
  // Email-link pages: keep outside GuestOnly so a logged-in tab can still open them.
  { path: "/reset-password", Component: ResetPassword },
  { path: "/verification", Component: Verification },
  { path: "/verify-email", Component: Verification },
  {
    element: <RequireAuth allowedRoles={["USER"]} />,
    children: [
      {
        path: "/user",
        Component: UserLayout,
        children: [
          { path: "dashboard", Component: UserDashboard },
          { path: "settings", Component: Settings },
          { path: "catalog", Component: Catalog },
          { path: "catalog/:id", Component: ItemDetails },
          { path: "requests", Component: MyRequests },
        ],
      },
    ],
  },
  {
    element: <RequireAuth allowedRoles={["ADMIN"]} />,
    children: [
      {
        path: "/admin",
        Component: AdminLayout,
        children: [
          {
            element: <RequireActiveAdminCollege />,
            children: [
              { path: "dashboard", Component: AdminDashboard },
              { path: "inventory", Component: Inventory },
              { path: "requests", Component: Requests },
              { path: "checking", Component: Checking },
              { path: "settings", Component: AdminSettings },
            ],
          },
        ],
      },
    ],
  },
  {
    element: <RequireAuth allowedRoles={["SUPER_ADMIN"]} />,
    children: [
      {
        path: "/superadmin",
        Component: SuperAdminLayout,
        children: [
          { path: "dashboard", Component: GlobalDashboard },
          { path: "colleges", Component: Colleges },
          { path: "users", Component: UserManagement },
          { path: "settings", Component: SuperAdminSettings },
        ],
      },
      // Alias for older /super-admin bookmarks.
      {
        path: "/super-admin",
        Component: SuperAdminLayout,
        children: [
          { path: "dashboard", Component: GlobalDashboard },
          { path: "colleges", Component: Colleges },
          { path: "users", Component: UserManagement },
          { path: "settings", Component: SuperAdminSettings },
        ],
      },
    ],
  },
  { path: "*", Component: NotFound },
]);

