import { createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
import { LoginPage } from '../pages/login/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { UsersPage } from '../pages/users/UsersPage';
import { RolesPage } from '../pages/roles/RolesPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { UnauthorizedPage } from '../pages/unauthorized/UnauthorizedPage';
import { NotFoundPage } from '../pages/not-found/NotFoundPage';
import { AppLayout } from '../components/layout/AppLayout/AppLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute/ProtectedRoute';

// Root route with layout
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// Public login route
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

// Main app layout (protected area)
const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  ),
});

// Dashboard (default protected route)
const dashboardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/',
  component: DashboardPage,
});

// Users routes (admin protected)
const usersRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: 'users',
  component: UsersPage,
});

// Roles routes (admin protected)
const rolesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: 'roles',
  component: RolesPage,
});

// Profile route
const profileRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: 'profile',
  component: ProfilePage,
});

// Unauthorized page
const unauthorizedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'unauthorized',
  component: UnauthorizedPage,
});

// 404 catch-all
const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: NotFoundPage,
});

export const routeTree = rootRoute.addChildren([
  loginRoute,
  layoutRoute.addChildren([dashboardRoute, usersRoute, rolesRoute, profileRoute]),
  unauthorizedRoute,
  notFoundRoute,
]);
