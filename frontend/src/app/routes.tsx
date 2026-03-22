import { createBrowserRouter } from "react-router";

// Public pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Verification from "./pages/Verification";
import NotFound from "./pages/NotFound";
import { RequireAuth } from "./auth/RequireAuth";

// User portal
import UserLayout from "./layouts/UserLayout";
import UserDashboard from "./pages/user/UserDashboard";
import Catalog from "./pages/user/Catalog";
import ItemDetails from "./pages/user/ItemDetails";
import MyRequests from "./pages/user/MyRequests";
import Settings from "./pages/user/Settings";

// Admin portal
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Inventory from "./pages/admin/Inventory";
import Requests from "./pages/admin/Requests";
import Checking from "./pages/admin/Checking";
import AdminSettings from "./pages/admin/AdminSettings";
import { RequireActiveAdminCollege } from "./auth/RequireActiveAdminCollege";

// Super admin portal
import SuperAdminLayout from "./layouts/SuperAdminLayout";
import GlobalDashboard from "./pages/superadmin/GlobalDashboard";
import Colleges from "./pages/superadmin/Colleges";
import UserManagement from "./pages/superadmin/UserManagement";
import SuperAdminSettings from "./pages/superadmin/SuperAdminSettings";

export const router = createBrowserRouter([
  { path: "/", Component: Landing },
  { path: "/login", Component: Login },
  { path: "/signup", Component: Signup },
  { path: "/forgot-password", Component: ForgotPassword },
  { path: "/reset-password", Component: ForgotPassword },
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

