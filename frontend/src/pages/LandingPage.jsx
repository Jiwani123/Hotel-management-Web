import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BedDouble, Utensils, Car, Star, ShieldCheck, CalendarCheck2 } from "lucide-react";
import api, { assetUrl } from "../lib/api";
import ImageCarousel from "../ui/ImageCarousel";
import toast from "react-hot-toast";
import { useAuth } from "../lib/auth.jsx";

const FEATURES = [
  { icon: BedDouble,      title: "Ocean Suites & Villas",    desc: "Private balconies, panoramic ocean vistas, and bespoke turndown rituals." },
  { icon: Utensils,       title: "Signature Dining",          desc: "Seasonal menus inspired by coastal harvests, crafted daily." },
  { icon: Car,            title: "Private Transfers",         desc: "Door-to-door chauffeur service, yacht charters, and island excursions." },
  { icon: Star,           title: "Curated Experiences",       desc: "Sunset soirées, spa escapes, and in-villa private dining events." },
  { icon: ShieldCheck,    title: "Secure Self-Service",        desc: "Manage stays, orders, and feedback from your personal dashboard." },
  { icon: CalendarCheck2, title: "Priority Reservations",     desc: "Guaranteed table slots and early check-in for registered guests." },
];

export default function LandingPage() {
  const qc = useQueryClient();
  const { isAuthed, user } = useAuth();
  const [fbRating, setFbRating] = useState(0);
  const [fbComment, setFbComment] = useState("");

  const { data: roomsData } = useQuery({
    queryKey: ["hero-rooms"],
    queryFn: async () => (await api.get("/public/rooms", { params: { limit: 8 } })).data.data,
    staleTime: 5 * 60 * 1000,
  });
  const { data: menuData } = useQuery({
    queryKey: ["hero-menu"],
    queryFn: async () => (await api.get("/public/menu", { params: { limit: 8 } })).data.data,
    staleTime: 5 * 60 * 1000,
  });

  const { data: feedbackData } = useQuery({
    queryKey: ["public-feedback"],
    queryFn: async () => (await api.get("/public/feedback", { params: { limit: 6 } })).data.data,
    staleTime: 60 * 1000,
  });

  const createFeedbackMut = useMutation({
    mutationFn: async () => (await api.post("/feedback", {
      customerName: user?.name,
      rating: fbRating,
      comment: fbComment,
    })).data.data,
    onSuccess: () => {
      toast.success("Thank you for your feedback!");
      setFbRating(0);
      setFbComment("");
      qc.invalidateQueries({ queryKey: ["public-feedback"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Feedback submission failed"),
  });

  const heroImages = useMemo(() => {
    const roomImgs = (roomsData?.items ?? []).flatMap((r) => r.images ?? []).filter(Boolean);
    const menuImgs = (menuData?.items  ?? []).flatMap((i) => i.images ?? []).filter(Boolean);
    return [...roomImgs, ...menuImgs].slice(0, 14);
  }, [roomsData, menuData]);

  const feedbackItems = feedbackData?.items ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Full-width carousel hero ── */}
      <div className="page-hero-carousel" style={{ height: 480 }}>
        <ImageCarousel images={heroImages} height={480} autoPlayMs={4500} />

        {/* Gradient backdrop (non-interactive) */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
          background: "linear-gradient(to top, rgba(13,27,42,0.97) 0%, rgba(13,27,42,0.55) 40%, rgba(13,27,42,0.15) 70%, transparent 100%)",
        }} />

        {/* Single overlay: text + stats + CTA in one natural flow column */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 4,
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
          padding: "0 52px 44px",
        }}>
          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center",
            background: "rgba(200,145,47,0.18)", border: "1px solid rgba(200,145,47,0.4)",
            borderRadius: 999, padding: "4px 14px", marginBottom: 14, alignSelf: "flex-start",
            color: "#e5b55a", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em",
            pointerEvents: "none",
          }}>
            Coconut Republik Villa &amp; Restaurant
          </div>
          {/* Heading */}
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(26px, 3.8vw, 50px)",
            margin: "0 0 12px", lineHeight: 1.15,
            color: "#fff", fontWeight: 700, pointerEvents: "none",
          }}>
            Where island serenity meets<br />curated luxury
          </h1>
          {/* Paragraph */}
          <p style={{ color: "rgba(255,255,255,0.78)", maxWidth: 540, fontSize: 15, lineHeight: 1.7, margin: "0 0 20px", pointerEvents: "none" }}>
            Discover private suites, artisan dining, and signature experiences crafted for those
            who seek quiet excellence. Every detail — yours to shape.
          </p>
          {/* Stats */}
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 20, pointerEvents: "none" }}>
            {[["12+","Suites & Villas"],["4.9★","Guest Rating"],["5000+","Stays Hosted"],["24/7","Concierge"]].map(([val, label]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: "#e5b55a" }}>{val}</div>
                <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>{label}</div>
              </div>
            ))}
          </div>
          {/* CTA buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Link to="/guest/book" className="btn primary" style={{ padding: "12px 26px", fontSize: 15 }}>Book a Stay</Link>
            <Link to="/guest/rooms" className="btn" style={{ padding: "12px 26px", fontSize: 15, background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.28)", backdropFilter: "blur(6px)" }}>Explore Rooms</Link>
            <Link to="/guest/reservations" className="btn" style={{ padding: "12px 26px", fontSize: 15, background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.28)", backdropFilter: "blur(6px)" }}>Reserve a Table</Link>
          </div>
        </div>
      </div>

      {/* Feature grid */}
      <div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", textAlign: "center", marginBottom: 20, fontSize: 32 }}>A complete island retreat</h2>
        <div className="grid three">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Icon size={24} className="icon-accent" />
                <h3 className="section-title" style={{ marginBottom: 4 }}>{f.title}</h3>
                <div className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Featured Rooms ── */}
      {(roomsData?.items ?? []).length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(24px,2.8vw,34px)", margin: "0 0 6px", color: "var(--ink)" }}>Featured Suites &amp; Villas</h2>
              <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>Handpicked accommodations for an exceptional stay</p>
            </div>
            <Link to="/guest/rooms" className="btn" style={{ flexShrink: 0 }}>View All Rooms →</Link>
          </div>
          <div className="grid three">
            {(roomsData.items ?? []).slice(0, 3).map((room) => (
              <div key={room._id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "var(--shadow)", transition: "transform 220ms ease, box-shadow 220ms ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "var(--shadow)"; }}
              >
                {room?.images?.[0] ? (
                  <div style={{ aspectRatio: "16 / 10", overflow: "hidden", position: "relative" }}>
                    <img
                      src={assetUrl(room.images[0])}
                      alt={`Room ${room.roomNo}`}
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 400ms ease" }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                    />
                    {room.status === "AVAILABLE" && (
                      <span style={{ position: "absolute", top: 12, right: 12, background: "#d1fadf", color: "#14532d", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999 }}>Available</span>
                    )}
                  </div>
                ) : (
                  <div style={{ aspectRatio: "16 / 10", background: "linear-gradient(135deg, #e2e8f0 0%, #f0f4f8 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <BedDouble size={42} color="var(--muted)" />
                  </div>
                )}
                <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span className="chip">{room.type}</span>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>
                      LKR {Number(room.pricePerNight).toFixed(0)}<span style={{ fontSize: 12, fontWeight: 400, color: "var(--muted)" }}>/night</span>
                    </span>
                  </div>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 19, fontWeight: 700, margin: "0 0 6px", color: "var(--ink)" }}>Room {room.roomNo}</h3>
                  <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.65, margin: "0 0 16px", flex: 1 }}>
                    {(room.features ?? []).slice(0, 3).join(" · ") || "Premium amenities included"}
                  </p>
                  <Link
                    to={`/guest/rooms/${room._id}`}
                    className={room.status === "AVAILABLE" ? "btn primary" : "btn"}
                    style={{ textAlign: "center", display: "block" }}
                  >
                    {room.status === "AVAILABLE" ? "Book Now" : "View Details"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Featured Dining ── */}
      {(menuData?.items ?? []).length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(24px,2.8vw,34px)", margin: "0 0 6px", color: "var(--ink)" }}>Signature Dishes</h2>
              <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>Seasonal flavors crafted daily by our culinary team</p>
            </div>
            <Link to="/guest/dining" className="btn" style={{ flexShrink: 0 }}>View Full Menu →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {(menuData.items ?? []).filter((i) => i.isAvailable !== false).slice(0, 4).map((item) => (
              <div key={item._id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "var(--shadow)", transition: "transform 220ms ease, box-shadow 220ms ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "var(--shadow)"; }}
              >
                {item?.images?.[0] ? (
                  <div style={{ aspectRatio: "4 / 3", overflow: "hidden" }}>
                    <img
                      src={assetUrl(item.images[0])}
                      alt={item.name}
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 400ms ease" }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.07)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                    />
                  </div>
                ) : (
                  <div style={{ aspectRatio: "4 / 3", background: "linear-gradient(135deg, #f0f4f8 0%, #e8f2ec 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Utensils size={36} color="var(--muted)" />
                  </div>
                )}
                <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span className="chip" style={{ fontSize: 11, padding: "3px 10px" }}>{item.category}</span>
                    {item.isVeg === true ? <span title="Vegetarian" style={{ fontSize: 14 }}>🟢</span> : item.isVeg === false ? <span title="Non-veg" style={{ fontSize: 14 }}>🔴</span> : null}
                  </div>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, margin: "0 0 4px", color: "var(--ink)" }}>{item.name}</h3>
                  {item.description && (
                    <p style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.55, margin: "0 0 10px", flex: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {item.description}
                    </p>
                  )}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: item.description ? 4 : 8 }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>LKR {Number(item.price).toFixed(2)}</span>
                    <Link to={`/guest/dining/${item._id}`} className="btn sm">View →</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA strip */}
      <div className="hero-card" style={{ padding: "32px 40px" }}>
        <div className="row space" style={{ flexWrap: "wrap", gap: 16 }}>
          <div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, margin: 0 }}>Ready to plan your escape?</h3>
            <div className="muted" style={{ marginTop: 6 }}>Reserve a room or a private dining table in minutes.</div>
          </div>
          <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
            <Link to="/guest/book" className="btn primary">Book Now</Link>
            <Link to="/guest/dining" className="btn">View Dining Menu</Link>
            <Link to="/guest/reservations" className="btn">Reserve Dining</Link>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid three" style={{ gap: 12 }}>
        {[
          { title: "Browse Rooms",  sub: "All suites, villas and rates",  to: "/guest/rooms",  cta: "View Rooms" },
          { title: "Dining Menu",   sub: "Today's seasonal offerings",    to: "/guest/dining", cta: "See Menu" },
          { title: "My Account",    sub: "Bookings, orders & payments",   to: "/customer",     cta: "Open Dashboard" },
        ].map((c) => (
          <div key={c.title} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 className="section-title" style={{ marginBottom: 0 }}>{c.title}</h3>
            <div className="muted" style={{ flex: 1, fontSize: 14 }}>{c.sub}</div>
            <Link to={c.to} className="btn" style={{ textAlign: "center" }}>{c.cta}</Link>
          </div>
        ))}
      </div>

      {/* ── Testimonials ── */}
      <div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(24px,2.8vw,34px)", margin: "0 0 6px", color: "var(--ink)" }}>Guest Experiences</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>What our guests are saying</p>
          </div>
          {isAuthed && (
            <Link to="/customer?tab=feedback" className="btn ghost sm">Share your experience</Link>
          )}
        </div>

        {feedbackItems.length > 0 ? (
          <div className="grid three" style={{ gap: 16 }}>
            {feedbackItems.slice(0, 6).map((f) => {
              const val = Math.max(0, Math.min(5, Number(f.rating) || 0));
              return (
                <div key={f._id} style={{
                  background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16,
                  padding: "22px 22px 20px", boxShadow: "var(--shadow)",
                  display: "flex", flexDirection: "column", gap: 12,
                  position: "relative", overflow: "hidden",
                }}>
                  {/* Decorative quote mark */}
                  <div style={{ position: "absolute", top: 14, right: 16, fontFamily: "'Cormorant Garamond', serif", fontSize: 64, lineHeight: 1, color: "var(--border-2)", fontWeight: 700, pointerEvents: "none", userSelect: "none" }}>"</div>
                  {/* Stars */}
                  <div style={{ display: "flex", gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} style={{ fontSize: 14, color: n <= val ? "#e5b55a" : "#e2e8f0" }}>★</span>
                    ))}
                  </div>
                  {/* Comment */}
                  {f.comment ? (
                    <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--ink)", margin: 0, flex: 1, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {f.comment}
                    </p>
                  ) : (
                    <p style={{ fontSize: 14, color: "var(--muted)", margin: 0, fontStyle: "italic" }}>No comment left.</p>
                  )}
                  {/* Guest meta */}
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {(f.customerName || "G").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{f.customerName || "Guest"}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(f.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✦</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Be the first to share</div>
            <div className="muted" style={{ fontSize: 14, marginBottom: 16 }}>No guest reviews yet. Stay with us and let us know how we did.</div>
            {isAuthed && (
              <Link to="/customer?tab=feedback" className="btn primary">Submit Feedback</Link>
            )}
          </div>
        )}

        {/* Feedback form — logged-in guests */}
        {isAuthed && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-head">
              <h3 className="section-title">Share your experience</h3>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <div className="muted" style={{ fontSize: 13, marginBottom: 8, fontWeight: 500 }}>Your rating</div>
                <div className="row" style={{ gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setFbRating(n)}
                      style={{
                        width: 38, height: 38, borderRadius: 8, border: "1.5px solid",
                        borderColor: fbRating >= n ? "var(--accent)" : "var(--border)",
                        background: fbRating >= n ? "var(--gold-dim)" : "#fff",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, transition: "all 150ms",
                      }}
                    >
                      <span style={{ color: fbRating >= n ? "#e5b55a" : "#d1d5db" }}>★</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6, fontWeight: 500 }}>Comment (optional)</div>
                <textarea
                  className="textarea"
                  rows={3}
                  value={fbComment}
                  onChange={(e) => setFbComment(e.target.value)}
                  placeholder="Tell us what you loved (or what we can improve)…"
                />
              </div>
              <button
                className="btn primary"
                disabled={createFeedbackMut.isPending || fbRating === 0}
                onClick={() => {
                  if (fbRating === 0) { toast.error("Please select a star rating"); return; }
                  createFeedbackMut.mutate();
                }}
                type="button"
                style={{ alignSelf: "flex-start" }}
              >
                {createFeedbackMut.isPending ? "Submitting…" : "Submit Feedback"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
