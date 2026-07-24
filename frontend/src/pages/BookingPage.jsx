import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { BedDouble, CalendarCheck2, CheckCircle2 } from "lucide-react";
import api, { assetUrl } from "../lib/api";
import { useAuth } from "../lib/auth.jsx";
import ImageCarousel from "../ui/ImageCarousel";

export default function BookingPage() {
  const { isAuthed, user } = useAuth();
  const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm();
  const [dates, setDates] = useState({ checkIn: "", checkOut: "" });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [confirmed, setConfirmed] = useState(null);

  // Stable today string so Date() is not called on every render
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Hero carousel images (all rooms)
  const { data: allRoomsData } = useQuery({
    queryKey: ["booking-hero-rooms"],
    queryFn: async () => (await api.get("/public/rooms", { params: { limit: 10 } })).data.data,
    staleTime: 5 * 60 * 1000,
  });
  const heroImages = useMemo(
    () => (allRoomsData?.items ?? []).flatMap((r) => r.images ?? []).filter(Boolean).slice(0, 12),
    [allRoomsData]
  );

  // Pre-fill name if logged in
  useEffect(() => {
    if (user?.name) setValue("customerName", user.name);
  }, [user, setValue]);

  const checkIn  = useWatch({ control, name: "checkIn" });
  const checkOut = useWatch({ control, name: "checkOut" });

  // Compute nights for pricing preview
  const nights = (() => {
    if (!checkIn || !checkOut) return 0;
    const diff = new Date(checkOut) - new Date(checkIn);
    return diff > 0 ? Math.ceil(diff / 86400000) : 0;
  })();

  const { data: availability, isFetching } = useQuery({
    queryKey: ["public-availability", dates],
    queryFn: async () => (await api.get("/public/rooms/availability", { params: dates })).data.data,
    enabled: !!dates.checkIn && !!dates.checkOut,
  });

  const rooms = availability ?? [];

  const createMut = useMutation({
    mutationFn: async (values) => {
      if (!selectedRoom) {
        toast.error("Please select a room first");
        throw new Error("No room selected");
      }
      return (await api.post("/bookings", values)).data.data;
    },
    onSuccess: (data) => {
      toast.success("Booking request submitted — awaiting approval.");
      setConfirmed(data);
      reset();
      setSelectedRoom(null);
      setDates({ checkIn: "", checkOut: "" });
    },
    onError: (e) => {
      const msg = e?.response?.data?.message;
      if (msg) toast.error(msg);
    },
  });

  if (!isAuthed) {
    return (
      <div className="card" style={{ maxWidth: 460, margin: "40px auto", padding: 32 }}>
        <BedDouble size={36} className="icon-accent" style={{ marginBottom: 12 }} />
        <h2 style={{ margin: "0 0 10px", fontFamily: "Playfair Display, serif" }}>Book a Stay</h2>
        <div className="muted" style={{ marginBottom: 20 }}>Please login or register to complete your booking.</div>
        <div className="row">
          <Link className="btn primary" to="/login">Login</Link>
          <Link className="btn" to="/register">Register</Link>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="card" style={{ maxWidth: 480, margin: "40px auto", padding: 32, textAlign: "center" }}>
        <CheckCircle2 size={44} color="#22c55e" style={{ marginBottom: 14 }} />
        <h2 style={{ fontFamily: "Playfair Display, serif", marginBottom: 8 }}>Booking Request Received</h2>
        <div className="muted" style={{ marginBottom: 20 }}>Your booking is pending approval. You can edit or delete it from your account until it’s approved or rejected.</div>
        <div className="card" style={{ textAlign: "left", marginBottom: 20 }}>
          {[["Room", confirmed.roomId?.roomNo ?? "—"],["Check-in", new Date(confirmed.checkIn).toLocaleDateString()],["Check-out", new Date(confirmed.checkOut).toLocaleDateString()]].map(([l,v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
              <span className="muted">{l}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
        <div className="row" style={{ justifyContent: "center", gap: 10 }}>
          <Link to="/customer" className="btn primary">My Account</Link>
          <button className="btn" onClick={() => setConfirmed(null)}>Book Another</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Carousel hero ── */}
      <div className="page-hero-carousel" style={{ height: 320 }}>
        <ImageCarousel images={heroImages} height={320} autoPlayMs={4800} />
        <div style={{
          position: "absolute", inset: 0, zIndex: 3,
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
          padding: "32px 44px",
          background: "linear-gradient(to top, rgba(13,27,42,0.92) 0%, rgba(13,27,42,0.08) 60%, transparent 100%)",
          pointerEvents: "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CalendarCheck2 size={26} color="#e5b55a" />
            <div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(24px,3.5vw,40px)", margin: 0, color: "#fff", fontWeight: 700 }}>Book a Stay</h2>
              <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 15, marginTop: 4 }}>Choose your dates and select an available room.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid two" style={{ gap: 16, alignItems: "start" }}>
        {/* Form */}
        <form
          className="card grid"
          onSubmit={handleSubmit((v) => createMut.mutate({ ...v, roomId: selectedRoom?._id }))}
          style={{ gap: 16 }}
        >
          <div className="grid two" style={{ gap: 14 }}>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Check-in</label>
              <input
                className={`input${errors.checkIn ? " input-error" : ""}`}
                type="date"
                min={todayStr}
                {...register("checkIn", { required: "Check-in date is required" })}
                onChange={(e) => setDates((d) => ({ ...d, checkIn: e.target.value }))}
              />
              {errors.checkIn && <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>{errors.checkIn.message}</p>}
            </div>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Check-out</label>
              <input
                className={`input${errors.checkOut ? " input-error" : ""}`}
                type="date"
                min={checkIn || todayStr}
                {...register("checkOut", {
                  required: "Check-out date is required",
                  validate: (v) => !checkIn || v > checkIn ? true : "Check-out must be after check-in",
                })}
                onChange={(e) => setDates((d) => ({ ...d, checkOut: e.target.value }))}
              />
              {errors.checkOut && <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>{errors.checkOut.message}</p>}
            </div>
          </div>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Full name</label>
            <input
              className={`input${errors.customerName ? " input-error" : ""}`}
              placeholder="Your full name"
              {...register("customerName", { required: "Your name is required", minLength: { value: 2, message: "Name too short" } })}
            />
            {errors.customerName && <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>{errors.customerName.message}</p>}
          </div>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Contact number</label>
            <input
              className={`input${errors.customerContact ? " input-error" : ""}`}
              placeholder="0771234567"
              type="tel"
              {...register("customerContact", {
                required: "Contact number is required",
                pattern: { value: /^0\d{9}$/, message: "Must be 10 digits starting with 0 (e.g. 0771234567)" },
              })}
            />
            {errors.customerContact && <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>{errors.customerContact.message}</p>}
          </div>

          {/* Pricing preview */}
          {selectedRoom && nights > 0 && (
            <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              {[["Room",`${selectedRoom.roomNo} — ${selectedRoom.type}`],["Nights",nights],["Rate",`LKR ${selectedRoom.pricePerNight}/night`],["Estimated Total",`LKR ${(selectedRoom.pricePerNight * nights).toFixed(2)}`]].map(([l,v],i,arr) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: i < arr.length-1 ? "1px solid var(--border)" : "none", fontSize: 14, background: i === arr.length-1 ? "linear-gradient(135deg,#fffdf8,#f6ede0)" : undefined, fontWeight: i === arr.length-1 ? 700 : undefined }}>
                  <span className="muted" style={{ fontWeight: i === arr.length-1 ? 700 : undefined }}>{l}</span>
                  <span style={{ color: i === arr.length-1 ? "var(--accent)" : undefined }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          <button
            className="btn primary"
            disabled={createMut.isPending || !selectedRoom}
            style={{ width: "100%", padding: "12px" }}
          >
            {createMut.isPending
              ? "Confirming…"
              : !selectedRoom
              ? "Select a room to continue"
              : `Confirm Booking${nights > 0 ? ` · ${nights} night${nights > 1 ? "s" : ""}` : ""}`}
          </button>
        </form>

        {/* Available rooms */}
        <div className="grid" style={{ gap: 12 }}>
          {!dates.checkIn || !dates.checkOut ? (
            <div className="card muted" style={{ fontSize: 14, textAlign: "center", padding: 24 }}>
              Enter your check-in and check-out dates to see available rooms.
            </div>
          ) : isFetching ? (
            <div className="card muted" style={{ fontSize: 14, padding: 24 }}>Checking availability…</div>
          ) : rooms.length === 0 ? (
            <div className="card muted" style={{ fontSize: 14, padding: 24 }}>No rooms available for the selected dates.</div>
          ) : (
            rooms.map((room) => (
              <div
                key={room._id}
                className="card"
                onClick={() => setSelectedRoom(room)}
                style={{
                  cursor: "pointer",
                  border: selectedRoom?._id === room._id ? "2px solid var(--accent-2)" : "1px solid var(--border)",
                  background: selectedRoom?._id === room._id ? "linear-gradient(135deg,#fffdf8,#f6ede0)" : undefined,
                  transition: "border 150ms, background 150ms",
                  overflow: "hidden",
                  padding: 0,
                }}
              >
                {room.images?.[0] && (
                  <div style={{ height: 140, overflow: "hidden" }}>
                    <img src={assetUrl(room.images[0])} alt={`Room ${room.roomNo}`}
                         style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                )}
                <div className="row space" style={{ padding: "14px 16px", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Room {room.roomNo}</div>
                    <div className="muted" style={{ fontSize: 13 }}>{room.type} · {(room.features ?? []).join(" • ")}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div className="accent-price" style={{ fontWeight: 700, fontSize: 18 }}>LKR {room.pricePerNight}</div>
                    <div className="muted" style={{ fontSize: 12 }}>/night</div>
                  </div>
                </div>
                {selectedRoom?._id === room._id && (
                  <div className="accent-price" style={{ margin: "0 16px 14px", fontSize: 13, fontWeight: 700 }}>✓ Selected</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
