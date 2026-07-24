import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BedDouble, AlertCircle, Loader2 } from "lucide-react";
import api, { assetUrl } from "../lib/api";
import ImageCarousel from "../ui/ImageCarousel";

export default function RoomsPublicPage() {
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [q, setQ] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-rooms"],
    queryFn: async () => (await api.get("/public/rooms", { params: { limit: 100 } })).data.data,
  });

  const rooms = data?.items ?? [];
  const types = ["ALL", ...Array.from(new Set(rooms.map((r) => r.type).filter(Boolean)))];
  const statuses = ["ALL", ...Array.from(new Set(rooms.map((r) => r.status).filter(Boolean)))];
  const qNorm = String(q ?? "").trim().toLowerCase();

  // Collect all room images for the hero carousel
  const heroImages = useMemo(
    () => rooms.flatMap((r) => r.images ?? []).filter(Boolean).slice(0, 14),
    [rooms]
  );

  const filtered = rooms.filter((r) => {
    const typeOk   = filterType === "ALL"   || r.type   === filterType;
    const statusOk = filterStatus === "ALL" || r.status === filterStatus;
    const qOk = !qNorm || (
      String(r?.roomNo ?? "").toLowerCase().includes(qNorm) ||
      String(r?.type ?? "").toLowerCase().includes(qNorm) ||
      String(r?.status ?? "").toLowerCase().includes(qNorm) ||
      String((r?.features ?? []).join(" ") ?? "").toLowerCase().includes(qNorm)
    );
    return typeOk && statusOk && qOk;
  });

  const statusBadge = (s) => {
    const map = {
      AVAILABLE:   { bg: "#d1fadf", color: "#14532d" },
      OCCUPIED:    { bg: "#fee2e2", color: "#7f1d1d" },
      CLEANING:    { bg: "#fef3c7", color: "#713f12" },
      MAINTENANCE: { bg: "#e0e7ff", color: "#312e81" },
    };
    const style = map[s] ?? { bg: "#f3f4f6", color: "#374151" };
    return (
      <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: style.bg, color: style.color }}>{s}</span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Carousel hero ── */}
      <div className="page-hero-carousel" style={{ height: 380 }}>
        <ImageCarousel images={heroImages} height={380} autoPlayMs={4000} />
        {/* Gradient overlay — non-interactive so carousel remains swipeable */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, pointerEvents: "none" }}>
            <BedDouble size={26} color="#e5b55a" />
            <div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(24px,3.5vw,40px)", margin: 0, color: "#fff", fontWeight: 700 }}>Rooms &amp; Villas</h2>
              <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 15, marginTop: 4 }}>Premium suites and villas — private terraces, ocean views, and quiet luxury.</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, pointerEvents: "auto" }}>
            <Link to="/guest/book" className="btn primary" style={{ padding: "11px 24px" }}>Book a Stay</Link>
            <Link to="/guest/rooms" className="btn" style={{ padding: "11px 20px", background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.28)", backdropFilter: "blur(6px)" }}>Browse All</Link>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 32, justifyContent: "center" }}>
          <Loader2 size={22} className="icon-accent" style={{ animation: "spin 0.8s linear infinite" }} />
          <span className="muted">Loading rooms…</span>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="card" style={{ textAlign: "center", padding: "32px 24px", border: "1px solid #f5c2b8" }}>
          <AlertCircle size={32} color="#d94f3a" style={{ marginBottom: 10 }} />
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Could not load rooms</div>
          <div className="muted" style={{ marginBottom: 16, fontSize: 14 }}>Please check your connection and try again.</div>
          <button className="btn primary" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* Filters — dropdowns */}
      {!isLoading && !isError && (
        <div className="card" style={{ padding: "14px 18px" }}>
          <div className="row" style={{ flexWrap: "wrap", gap: 14, alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>Filter Rooms</span>
            <input
              className="input"
              style={{ width: 240 }}
              placeholder="Search rooms..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Type</label>
              <select
                className="select"
                style={{ minWidth: 140 }}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                {types.map((t) => <option key={t} value={t}>{t === "ALL" ? "All Types" : t}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Status</label>
              <select
                className="select"
                style={{ minWidth: 150 }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                {statuses.map((s) => <option key={s} value={s}>{s === "ALL" ? "All Statuses" : s}</option>)}
              </select>
            </div>
            {(qNorm || filterType !== "ALL" || filterStatus !== "ALL") && (
              <button
                type="button" className="btn ghost"
                style={{ fontSize: 12 }}
                onClick={() => { setQ(""); setFilterType("ALL"); setFilterStatus("ALL"); }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Room grid */}
      {!isLoading && !isError && (
        <div className="grid three">
          {filtered.map((room) => (
            <div key={room._id} className="card pub-room-card">
              {room?.images?.[0] ? (
                <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)", marginBottom: 12 }}>
                  <div style={{ aspectRatio: "16 / 10", background: "rgba(0,0,0,0.04)" }}>
                    <img
                      src={assetUrl(room.images[0])}
                      alt={`Room ${room.roomNo}`}
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </div>
                </div>
              ) : null}

              {Array.isArray(room?.images) && room.images.length > 1 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                  {room.images.slice(1, 5).map((u) => (
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
                {statusBadge(room.status)}
                <span className="chip">{room.type}</span>
              </div>
              <h3 className="section-title" style={{ marginBottom: 2 }}>Room {room.roomNo}</h3>
              <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
                {(room.features ?? []).join(" \u2022 ") || "Premium amenities"}
              </div>
              <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 14 }}>
                <span className="accent-price">LKR {Number(room.pricePerNight).toFixed(0)}</span><span style={{ fontWeight: 400, fontSize: 13, color: "var(--muted)" }}>/night</span>
              </div>
              <Link
                to={`/guest/rooms/${room._id}`}
                className={room.status === "AVAILABLE" ? "btn primary" : "btn"}
                style={{ textAlign: "center", display: "block" }}
              >
                View details
              </Link>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="card" style={{ gridColumn: "1/-1", textAlign: "center", padding: 32 }}>
              <div className="muted">No rooms match the selected filters.</div>
              <button className="btn" style={{ marginTop: 12 }} onClick={() => { setFilterType("ALL"); setFilterStatus("ALL"); }}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
