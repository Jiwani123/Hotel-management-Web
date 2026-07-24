import React, { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BedDouble, CalendarCheck2, CalendarDays, Home, LayoutDashboard,
  LogIn, UserCircle, UserPlus, Utensils, ShoppingCart, Heart,
  Phone, Mail, MapPin, Star, Shield, Clock,
} from "lucide-react";
import { useAuth } from "../lib/auth.jsx";

const CART_KEY = "hms_cart_v1";
const WISHLIST_KEY = "hms_wishlist_v1";

function readCartCount() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return 0;
    return parsed.reduce((sum, it) => sum + Number(it?.qty ?? 0), 0);
  } catch {
    return 0;
  }
}

function readWishlistCount() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean).length : 0;
  } catch {
    return 0;
  }
}

const links = [
  { label: "Home",         to: "/",                   icon: Home },
  { label: "Rooms",        to: "/guest/rooms",        icon: BedDouble },
  { label: "Dining",       to: "/guest/dining",       icon: Utensils },
  { label: "Book a Stay",  to: "/guest/book",         icon: CalendarCheck2 },
  { label: "Reservations", to: "/guest/reservations", icon: CalendarDays },
];

export default function PublicLayout() {
  const { isAuthed, user } = useAuth();
  const loc = useLocation();
  const [cartRefresh, setCartRefresh] = useState(0);


  const showCustomer = isAuthed && user?.role === "CUSTOMER";

  useEffect(() => {
    if (!showCustomer) return;
    const onStorage = (e) => { if (e.key === CART_KEY || e.key === WISHLIST_KEY) setCartRefresh((x) => x + 1); };
    const onFocus = () => setCartRefresh((x) => x + 1);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [showCustomer]);

  const cartCount = useMemo(() => {
    void cartRefresh;
    void loc.pathname;
    return showCustomer ? readCartCount() : 0;
  }, [showCustomer, loc.pathname, cartRefresh]);

  const wishlistCount = useMemo(() => {
    void cartRefresh;
    void loc.pathname;
    return showCustomer ? readWishlistCount() : 0;
  }, [showCustomer, loc.pathname, cartRefresh]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f4f6f9" }}>
      {/* ── Top bar ── */}
      <header className="public-bar">
        {/* Brand */}
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: "linear-gradient(135deg, #c8912f 0%, #e5b55a 100%)",
            display: "grid", placeItems: "center",
            fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 700, color: "#fff",
            flexShrink: 0,
          }}>C</div>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 19, fontWeight: 700, color: "#0d1b2a", lineHeight: 1.1 }}>
              Coconut<span style={{ color: "#c8912f" }}> Republik</span>
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Villa &amp; Restaurant
            </div>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="public-links">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) => isActive ? "active" : ""}
              >
                <Icon size={15} />
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Auth controls */}
        <div className="row" style={{ gap: 8, flexShrink: 0 }}>
          {isAuthed ? (
            user?.role === "CUSTOMER" ? (
              <>
                <Link
                  to="/customer?tab=overview&focus=cart"
                  className="btn ghost"
                  title="Cart"
                  style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <ShoppingCart size={15} />
                  Cart
                  {cartCount > 0 && (
                    <span style={{
                      position: "absolute", top: -7, right: -7,
                      background: "#dc2626", color: "#fff", borderRadius: "999px",
                      fontSize: 10, fontWeight: 700, padding: "2px 6px", minWidth: 18, textAlign: "center",
                    }}>
                      {cartCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/customer?tab=overview&focus=wishlist"
                  className="btn ghost"
                  title="Wishlist"
                  style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Heart size={15} />
                  Wishlist
                  {wishlistCount > 0 && (
                    <span style={{
                      position: "absolute", top: -7, right: -7,
                      background: "#dc2626", color: "#fff", borderRadius: "999px",
                      fontSize: 10, fontWeight: 700, padding: "2px 6px", minWidth: 18, textAlign: "center",
                    }}>
                      {wishlistCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/customer"
                  className="btn primary"
                  style={{ gap: 7 }}
                >
                  <UserCircle size={15} />
                  My Account
                </Link>
              </>
            ) : (
              <Link to="/staff" className="btn primary">
                <LayoutDashboard size={15} />
                Staff Console
              </Link>
            )
          ) : (
            <>
              <Link to="/login" className="btn ghost" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <LogIn size={15} />
                Sign In
              </Link>
              <Link to="/register" className="btn primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <UserPlus size={15} />
                Register
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ── Page content ── */}
      <div style={{ flex: 1 }}>
        <div className="public-shell">
          <Outlet />
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="public-footer">
        <div className="public-footer-inner">
          {/* Brand col */}
          <div className="public-footer-brand">
            <div className="brand" style={{ marginBottom: 10 }}>Coconut Republik</div>
            <p>A luxury villa and restaurant experience crafted for discerning guests. Your comfort is our passion.</p>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              {[Star, Shield, Clock].map((Icon, i) => (
                <div key={i} style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: "rgba(200,145,47,0.12)", border: "1px solid rgba(200,145,47,0.2)",
                  display: "grid", placeItems: "center", color: "#c8912f",
                }}>
                  <Icon size={15} />
                </div>
              ))}
            </div>
          </div>

          {/* Explore col */}
          <div className="public-footer-col">
            <h5>Explore</h5>
            {links.map((l) => (
              <Link key={l.to} to={l.to}>{l.label}</Link>
            ))}
          </div>

          {/* Services col */}
          <div className="public-footer-col">
            <h5>Services</h5>
            <p>Villa Stays</p>
            <p>Fine Dining</p>
            <p>Table Reservations</p>
            <p>Room Service</p>
            <p>Concierge</p>
          </div>

          {/* Contact col */}
          <div className="public-footer-col">
            <h5>Contact</h5>
            <p style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MapPin size={13} style={{ flexShrink: 0 }} /> Coconut Bay, Sri Lanka
            </p>
            <p style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Phone size={13} style={{ flexShrink: 0 }} /> +94 11 234 5678
            </p>
            <p style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Mail size={13} style={{ flexShrink: 0 }} /> hello@coconutrepublik.lk
            </p>
          </div>
        </div>

        <div className="public-footer-bottom">
          <span>© 2026 Coconut Republik Villa &amp; Restaurant. All rights reserved.</span>
          <div style={{ display: "flex", gap: 20 }}>
            <span style={{ cursor: "pointer" }}>Privacy Policy</span>
            <span style={{ cursor: "pointer" }}>Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
