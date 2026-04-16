import { createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
import { LoginPage } from '../pages/login/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { UsersPage } from '../pages/users/UsersPage';
import { RolesPage } from '../pages/roles/RolesPage';
import { RoleDetailPage } from '../pages/roles/RoleDetailPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { UnauthorizedPage } from '../pages/unauthorized/UnauthorizedPage';
import { NotFoundPage } from '../pages/not-found/NotFoundPage';
import { AppLayout } from '../components/layout/AppLayout/AppLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute/ProtectedRoute';

// Root route
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// Public login route
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

// Protected layout route (no path, wraps all protected routes)
const layoutRoute = createRoute({
  id: 'layout',
  getParentRoute: () => rootRoute,
  component: () => (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  ),
});

// Dashboard - default child of layout (serves as index)
const dashboardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/',
  component: DashboardPage,
});

// Users page
const usersRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/users',
  component: UsersPage,
});

// Roles page
const rolesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/roles',
  component: RolesPage,
});

// Role detail page
const roleDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/roles/$roleId',
  component: RoleDetailPage,
});

// Profile page
const profileRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/profile',
  component: ProfilePage,
});

// Unauthorized page
const unauthorizedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unauthorized',
  component: UnauthorizedPage,
});

// 404 catch-all
const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: NotFoundPage,
});

// Build route tree: attach children to layoutRoute, then add to root
const layoutWithChildren = layoutRoute.addChildren([
  dashboardRoute,
  usersRoute,
  rolesRoute,
  roleDetailRoute,
  profileRoute,
]);

export const routeTree = rootRoute.addChildren([
  loginRoute,
  layoutWithChildren,
  unauthorizedRoute,
  notFoundRoute,
]);
