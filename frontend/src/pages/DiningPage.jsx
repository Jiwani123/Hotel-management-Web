import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Utensils, CalendarCheck2, AlertCircle, Loader2 } from "lucide-react";
import api, { assetUrl } from "../lib/api";
import toast from "react-hot-toast";
import ImageCarousel from "../ui/ImageCarousel";
import { MENU_CATEGORIES } from "../constants/menuCategories";

const CART_KEY = "hms_cart_v1";
const WISHLIST_KEY = "hms_wishlist_v1";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

export default function DiningPage() {
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [nameQ, setNameQ] = useState("");
  const [cart, setCart] = useState(() => readJson(CART_KEY, []));
  const [wishlist, setWishlist] = useState(() => new Set(readJson(WISHLIST_KEY, [])));

  useEffect(() => {
    writeJson(CART_KEY, cart);
  }, [cart]);

  useEffect(() => {
    writeJson(WISHLIST_KEY, Array.from(wishlist));
  }, [wishlist]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-menu"],
    queryFn: async () => (await api.get("/public/menu", { params: { limit: 100 } })).data.data,
  });

  const items = data?.items ?? [];
  const knownCategories = useMemo(() => new Set(MENU_CATEGORIES.filter((c) => c !== "Other")), []);
  const categories = ["ALL", ...MENU_CATEGORIES];
  const nameQuery = String(nameQ ?? "").trim().toLowerCase();
  const filtered = useMemo(() => {
    let list = items;

    if (activeCategory !== "ALL") {
      if (activeCategory === "Other") {
        list = list.filter((i) => !knownCategories.has(String(i?.category ?? "").trim()));
      } else {
        list = list.filter((i) => String(i?.category ?? "").trim() === activeCategory);
      }
    }

    if (nameQuery) {
      list = list.filter((i) => String(i?.name ?? "").toLowerCase().includes(nameQuery));
    }

    return list;
  }, [activeCategory, items, knownCategories, nameQuery]);

  // Collect menu item images for hero carousel
  const heroImages = useMemo(
    () => items.flatMap((i) => i.images ?? []).filter(Boolean).slice(0, 14),
    [items]
  );

  const cartCount = useMemo(
    () => (Array.isArray(cart) ? cart.reduce((sum, it) => sum + Number(it?.qty ?? 0), 0) : 0),
    [cart]
  );

  const addToCart = (menuItemId) => {
    if (!menuItemId) return;
    setCart((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const existing = list.find((x) => x.menuItemId === menuItemId);
      if (existing) return list.map((x) => (x.menuItemId === menuItemId ? { ...x, qty: Number(x.qty || 0) + 1 } : x));
      return [...list, { menuItemId, qty: 1 }];
    });
    toast.success("Added to cart");
  };

  const toggleWishlist = (menuItemId) => {
    if (!menuItemId) return;
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(menuItemId)) next.delete(menuItemId);
      else next.add(menuItemId);
      return next;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Carousel hero ── */}
      <div className="page-hero-carousel" style={{ height: 380 }}>
        <ImageCarousel images={heroImages} height={380} autoPlayMs={4200} />
        {/* Gradient — non-interactive so carousel stays swipeable */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
          background: "linear-gradient(to top, rgba(13,27,42,0.94) 0%, rgba(13,27,42,0.35) 50%, transparent 100%)",
        }} />
        {/* Text + CTA in one natural-flow column */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 4,
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
          padding: "36px 44px",
          pointerEvents: "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, pointerEvents: "none" }}>
            <Utensils size={26} color="#e5b55a" />
            <div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(24px,3.5vw,40px)", margin: 0, color: "#fff", fontWeight: 700 }}>Signature Dining</h2>
              <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 15, marginTop: 4 }}>Seasonal menus inspired by coastal harvests, crafted daily by our culinary team.</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, pointerEvents: "auto" }}>
            <Link to="/guest/reservations" className="btn primary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 20px" }}>
              <CalendarCheck2 size={14} />Reserve a Table
            </Link>
            <Link to="/customer" className="btn" style={{ padding: "11px 18px", background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.28)", backdropFilter: "blur(6px)" }}>
              Cart ({cartCount})
            </Link>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 32, justifyContent: "center" }}>
          <Loader2 size={22} className="icon-accent" style={{ animation: "spin 0.8s linear infinite" }} />
          <span className="muted">Loading menu\u2026</span>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="card" style={{ textAlign: "center", padding: "32px 24px", border: "1px solid #f5c2b8" }}>
          <AlertCircle size={32} color="#d94f3a" style={{ marginBottom: 10 }} />
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Could not load the menu</div>
          <div className="muted" style={{ marginBottom: 16, fontSize: 14 }}>Please check your connection and try again.</div>
          <button className="btn primary" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* Category filter — dropdown */}
      {!isLoading && !isError && categories.length > 1 && (
        <div className="card" style={{ padding: "14px 18px" }}>
          <div className="row" style={{ gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>Browse by Category</span>
            <select
              className="select"
              style={{ minWidth: 180 }}
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat === "ALL" ? "All Categories" : cat}</option>
              ))}
            </select>
            <input
              className="input"
              style={{ width: 240 }}
              placeholder="Search by name..."
              value={nameQ}
              onChange={(e) => setNameQ(e.target.value)}
            />
            {(activeCategory !== "ALL" || nameQuery) ? (
              <button
                type="button"
                className="btn ghost"
                style={{ fontSize: 12 }}
                onClick={() => {
                  setActiveCategory("ALL");
                  setNameQ("");
                }}
              >
                Clear
              </button>
            ) : null}
            {activeCategory !== "ALL" && (
              <span className="muted" style={{ fontSize: 13 }}>
                {filtered.length} item{filtered.length !== 1 ? "s" : ""}
              </span>
            )}
            {activeCategory === "ALL" && nameQuery && (
              <span className="muted" style={{ fontSize: 13 }}>
                {filtered.length} item{filtered.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Menu grid */}
      {!isLoading && !isError && (
        <div className="grid three">
          {filtered.map((item) => (
            <div key={item._id} className="card pub-menu-card">
              {item?.images?.[0] ? (
                <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)", marginBottom: 12 }}>
                  <div style={{ aspectRatio: "16 / 10", background: "rgba(0,0,0,0.04)" }}>
                    <img
                      src={assetUrl(item.images[0])}
                      alt={item.name}
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </div>
                </div>
              ) : null}

              {Array.isArray(item?.images) && item.images.length > 1 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                  {item.images.slice(1, 5).map((u) => (
                    <div key={u} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
                      <div style={{ aspectRatio: "4 / 3", background: "rgba(0,0,0,0.04)" }}>
                        <img
                          src={assetUrl(u)}
                          alt=""
                          loading="lazy"
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="row space" style={{ marginBottom: 10 }}>
                <div className="row" style={{ gap: 10, alignItems: "center" }}>
                  <span className="chip">{item.category}</span>
                  {item.isVeg === true ? (
                    <span title="Veg" style={{ fontSize: 16, lineHeight: 1 }}>🟢</span>
                  ) : item.isVeg === false ? (
                    <span title="Non-veg" style={{ fontSize: 16, lineHeight: 1 }}>🔴</span>
                  ) : null}
                </div>
                <span style={{
                  fontSize: 12, padding: "3px 10px", borderRadius: 999,
                  background: item.isAvailable ? "#d1fadf" : "#f3f4f6",
                  color: item.isAvailable ? "#14532d" : "#6b7280",
                  fontWeight: 700,
                }}>
                  {item.isAvailable ? "Available" : "Seasonal"}
                </span>
              </div>
              <h3 className="section-title" style={{ marginBottom: 4 }}>{item.name}</h3>
              {item.description && (
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>{item.description}</div>
              )}
              <div className="accent-price" style={{ fontWeight: 700, fontSize: 20, marginTop: "auto" }}>
                LKR {Number(item.price).toFixed(2)}
              </div>

              <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <Link
                  to={`/guest/dining/${item._id}`}
                  className="btn"
                >
                  View
                </Link>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => addToCart(item._id)}
                  disabled={!item.isAvailable}
                >
                  Add to cart
                </button>
                <button
                  type="button"
                  className={wishlist.has(item._id) ? "btn" : "btn ghost"}
                  onClick={() => toggleWishlist(item._id)}
                >
                  {wishlist.has(item._id) ? "Wishlisted" : "Wishlist"}
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="muted" style={{ gridColumn: "1/-1", padding: 20 }}>No items in this category.</div>
          )}
        </div>
      )}

      {/* Footer CTA */}
      {!isLoading && (
        <div className="card" style={{ textAlign: "center", padding: "32px 24px" }}>
          <h3 className="section-title" style={{ marginBottom: 8 }}>Dining at your villa?</h3>
          <div className="muted" style={{ marginBottom: 16 }}>Guests with active bookings can place room-service orders from the customer dashboard.</div>
          <div className="row" style={{ justifyContent: "center", gap: 12 }}>
            <Link to="/customer" className="btn primary">Order Room Service</Link>
            <Link to="/guest/reservations" className="btn">Reserve Dining</Link>
          </div>
        </div>
      )}
    </div>
  );
}
