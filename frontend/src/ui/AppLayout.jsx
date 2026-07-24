import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  ConciergeBell,
  SprayCan,
  Users,
  ShieldCheck,
  BedDouble,
  CalendarCheck2,
  CreditCard,
  MessageSquare,
  Utensils,
  ClipboardList,
  CalendarDays,
  Store,
  Sparkles,
  IdCard,
  UserRound,
  Bell,
  UserCircle,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../lib/auth.jsx";

const sections = [
  {
    title: "Overview",
    icon: LayoutDashboard,
    items: [
      { label: "Staff Dashboard", to: "/staff", icon: LayoutDashboard },
      { label: "Admin Console", to: "/admin", roles: ["ADMIN"], icon: ShieldCheck },
      { label: "Reports", to: "/reports", roles: ["ADMIN"], icon: BarChart3 },
    ],
  },
  {
    title: "Front Office",
    icon: Building2,
    items: [
      { label: "Rooms", to: "/rooms", roles: ["ADMIN", "RECEPTION"], icon: BedDouble },
      { label: "Bookings", to: "/bookings", roles: ["ADMIN", "RECEPTION"], icon: CalendarCheck2 },
      { label: "Payments", to: "/payments", roles: ["ADMIN", "RECEPTION", "RESTAURANT_STAFF"], icon: CreditCard },
      { label: "Feedback", to: "/feedback", roles: ["ADMIN", "RECEPTION"], icon: MessageSquare },
    ],
  },
  {
    title: "Restaurant",
    icon: ConciergeBell,
    items: [
      { label: "Menu", to: "/menu", roles: ["ADMIN", "RESTAURANT_STAFF"], icon: Utensils },
      { label: "Orders", to: "/orders", roles: ["ADMIN", "RESTAURANT_STAFF"], icon: ClipboardList },
      { label: "Table Reservations", to: "/table-reservations", roles: ["ADMIN", "RESTAURANT_STAFF"], icon: CalendarDays },
      { label: "Restaurant", to: "/restaurant", roles: ["ADMIN", "RESTAURANT_STAFF"], icon: Store },
    ],
  },
  {
    title: "Housekeeping",
    icon: SprayCan,
    items: [
      { label: "Cleaning", to: "/cleaning", roles: ["ADMIN", "HOUSEKEEPING"], icon: Sparkles },
    ],
  },
  {
    title: "People",
    icon: Users,
    items: [
      { label: "Employees", to: "/employees", roles: ["ADMIN"], icon: IdCard },
      { label: "Users", to: "/users", roles: ["ADMIN"], icon: UserRound },
    ],
  },
  {
    title: "System",
    icon: ShieldCheck,
    items: [
      { label: "Notifications", to: "/notifications", icon: Bell },
      { label: "Profile", to: "/profile", icon: UserCircle },
    ],
  },
];

export default function AppLayout() {
  const { user, logout, isAuthed } = useAuth();
  const loc = useLocation();
  const visibleSections = useMemo(() => (
    sections
      .map((section) => ({
        ...section,
        items: section.items.filter((link) => !link.roles || link.roles.includes(user?.role)),
      }))
      .filter((section) => section.items.length > 0)
  ), [user?.role]);

  const [openSection, setOpenSection] = useState(visibleSections[0]?.title ?? "Overview");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "b") {
        return;
      }
      const tag = event.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || event.target?.isContentEditable) {
        return;
      }
      event.preventDefault();
      setIsSidebarCollapsed((prev) => !prev);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (loc.pathname.startsWith("/guest") || ["/login", "/register", "/welcome", "/customer"].includes(loc.pathname)) {
    return (
      <div className="main">
        <Outlet />
      </div>
    );
  }

  return (
    <div className={isSidebarCollapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
      <aside className="sidebar">
        {/* Brand */}
        <div className="brand-row">
          <div className="brand-mark">
            <div className="brand-logo-box">C</div>
            <div>
              <div className="brand">Coconut Republik</div>
              <div className="brand-sub">HMS Operations</div>
            </div>
          </div>
          <button
            className="sidebar-pin"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            type="button"
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>

        {/* Navigation */}
        <div className={isSidebarCollapsed ? "nav nav-collapsed" : "nav"}>
          {visibleSections.map((section) => {
            const isOpen = openSection === section.title;
            const Icon = section.icon;
            return (
              <div key={section.title} className="nav-group">
                <button
                  className="nav-toggle"
                  onClick={() => setOpenSection(section.title)}
                  type="button"
                  data-tooltip={section.title}
                  title={section.title}
                  aria-label={`${section.title} section`}
                >
                  <span className="nav-toggle-left">
                    <Icon size={15} />
                    <span className="nav-title">{section.title}</span>
                  </span>
                  {!isSidebarCollapsed ? (isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : null}
                </button>
                {isOpen ? (
                  <div className="nav-items">
                    {section.items.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) => isActive ? "active" : ""}
                        data-tooltip={link.label}
                        title={link.label}
                        aria-label={link.label}
                      >
                        <span className="nav-link-icon">
                          {link.icon ? <link.icon size={15} /> : null}
                        </span>
                        <span className="nav-link-label">{link.label}</span>
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </aside>

      <main className="main">
        {/* Topbar */}
        <div className="topbar">
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, margin: 0, color: "#0d1b2a" }}>
              Operations Console
            </h1>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              Luxury hospitality operations &amp; revenue control
            </div>
          </div>

          {isAuthed ? (
            <div className="row" style={{ gap: 10 }}>
              <NavLink to="/" className="btn ghost" style={{ fontSize: 13 }}>
                ← Public Site
              </NavLink>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "7px 14px", background: "#f8fafc",
                borderRadius: 10, border: "1px solid #e2e8f0",
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: "linear-gradient(135deg, #c8912f 0%, #e5b55a 100%)",
                  display: "grid", placeItems: "center",
                  fontSize: 13, fontWeight: 700, color: "#fff",
                }}>
                  {user?.name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0d1b2a", lineHeight: 1.2 }}>{user?.name}</div>
                  <div style={{ fontSize: 10.5, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {user?.role ?? "STAFF"}
                  </div>
                </div>
              </div>
              <button className="btn ghost" onClick={logout} style={{ fontSize: 13, color: "#dc2626" }}>
                Sign Out
              </button>
            </div>
          ) : null}
        </div>

        <div style={{ padding: "24px 28px 48px" }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
