/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth.jsx";
import AppLayout from "./ui/AppLayout";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import CrudPage from "./pages/CrudPage";
import UsersPage from "./pages/UsersPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";
import ReportsPage from "./pages/ReportsPage";
import AdminPage from "./pages/AdminPage";
import PublicLayout from "./ui/PublicLayout";
import LandingPage from "./pages/LandingPage";
import RoomsPublicPage from "./pages/RoomsPublicPage";
import RoomDetailsPage from "./pages/RoomDetailsPage";
import DiningPage from "./pages/DiningPage";
import MenuItemDetailsPage from "./pages/MenuItemDetailsPage";
import BookingPage from "./pages/BookingPage";
import ReservationsPage from "./pages/ReservationsPage";
import CustomerDashboardPage from "./pages/CustomerDashboardPage";
import ReceiptPage from "./pages/ReceiptPage";
import InvoicePage from "./pages/InvoicePage";
import RestaurantPosPage from "./pages/RestaurantPosPage";


function Protected({ children }) {
  const { isAuthed, ready } = useAuth();
  if (!ready) return <div className="card">Loading session...</div>;
  if (!isAuthed) return <Navigate to="/login" replace />;
  return children;
}

function ProtectedCustomer({ children }) {
  const { isAuthed, ready, user } = useAuth();
  if (!ready) return <div className="card">Loading session...</div>;
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (user?.role !== "CUSTOMER") return <Navigate to="/staff" replace />;
  return children;
}

function WithProviders({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}

const router = createBrowserRouter([
  {
    element: <WithProviders><PublicLayout /></WithProviders>,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/welcome", element: <Navigate to="/" replace /> },
      { path: "/guest/rooms", element: <RoomsPublicPage /> },
      { path: "/guest/rooms/:id", element: <RoomDetailsPage /> },
      { path: "/guest/dining", element: <DiningPage /> },
      { path: "/guest/dining/:id", element: <MenuItemDetailsPage /> },
      { path: "/guest/book", element: <BookingPage /> },
      { path: "/guest/reservations", element: <ReservationsPage /> },
      { path: "/customer", element: <ProtectedCustomer><CustomerDashboardPage /></ProtectedCustomer> },
      { path: "/customer/receipt/:id", element: <ProtectedCustomer><ReceiptPage /></ProtectedCustomer> },
    ],
  },
  /* ── Standalone auth (no layout shell) ───────────────────────────── */
  {
    element: <WithProviders><AuthPage /></WithProviders>,
    children: [],
    path: "/login",
  },
  {
    element: <WithProviders><AuthPage /></WithProviders>,
    children: [],
    path: "/register",
  },
  {
    element: <WithProviders><AppLayout /></WithProviders>,
    children: [
      { path: "/staff", element: <Protected><DashboardPage /></Protected> },
      { path: "/admin", element: <Protected><AdminPage /></Protected> },
      { path: "/reports", element: <Protected><ReportsPage /></Protected> },
      { path: "/employees", element: <Protected><CrudPage resource="employees" /></Protected> },
      { path: "/rooms", element: <Protected><CrudPage resource="rooms" /></Protected> },
      { path: "/bookings", element: <Protected><CrudPage resource="bookings" /></Protected> },
      { path: "/payments", element: <Protected><CrudPage resource="payments" /></Protected> },
      { path: "/invoice/:id", element: <Protected><InvoicePage /></Protected> },
      { path: "/feedback", element: <Protected><CrudPage resource="feedback" /></Protected> },
      { path: "/cleaning", element: <Protected><CrudPage resource="cleaning" /></Protected> },
      { path: "/restaurant", element: <Protected><RestaurantPosPage /></Protected> },
      { path: "/menu", element: <Protected><CrudPage resource="menu" /></Protected> },
      { path: "/orders", element: <Protected><CrudPage resource="orders" /></Protected> },
      { path: "/table-reservations", element: <Protected><CrudPage resource="table-reservations" /></Protected> },
      { path: "/users", element: <Protected><UsersPage /></Protected> },
      { path: "/notifications", element: <Protected><NotificationsPage /></Protected> },
      { path: "/profile", element: <Protected><ProfilePage /></Protected> },
      { path: "*", element: <Navigate to="/staff" replace /> },
    ],
  },
]);

export default router;
