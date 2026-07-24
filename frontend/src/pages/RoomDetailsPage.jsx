import React, { useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { BedDouble, CalendarCheck2 } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../lib/auth.jsx";
import ImageCarousel from "../ui/ImageCarousel";

export default function RoomDetailsPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { isAuthed, user } = useAuth();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      customerName: "",
      customerContact: "",
      checkIn: "",
      checkOut: "",
    },
  });

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const checkIn = watch("checkIn");
  const checkOut = watch("checkOut");

  const { data: room, isLoading, isError } = useQuery({
    queryKey: ["public-room", id],
    queryFn: async () => (await api.get(`/public/rooms/${id}`)).data.data,
    enabled: !!id,
  });

  // Pre-fill name if logged in
  useEffect(() => {
    if (user?.name) setValue("customerName", user.name);
  }, [user, setValue]);

  const { data: availableRooms, isFetching: checkingAvail } = useQuery({
    queryKey: ["public-availability", { checkIn, checkOut }],
    queryFn: async () => (await api.get("/public/rooms/availability", { params: { checkIn, checkOut } })).data.data,
    enabled: !!checkIn && !!checkOut,
  });

  const isAvailableForDates = useMemo(() => {
    if (!checkIn || !checkOut) return null;
    const list = Array.isArray(availableRooms) ? availableRooms : [];
    return list.some((r) => String(r?._id) === String(id));
  }, [availableRooms, checkIn, checkOut, id]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const diff = new Date(checkOut) - new Date(checkIn);
    return diff > 0 ? Math.ceil(diff / 86400000) : 0;
  }, [checkIn, checkOut]);

  const bookMut = useMutation({
    mutationFn: async (values) => (await api.post("/bookings", { ...values, roomId: id })).data.data,
    onSuccess: () => {
      toast.success("Booking request submitted — awaiting approval.");
      nav("/customer");
    },
    onError: (e) => {
      toast.error(e?.response?.data?.message ?? "Booking failed");
    },
  });

  if (!isAuthed) {
    return (
      <div className="card" style={{ maxWidth: 520, margin: "40px auto", padding: 28 }}>
        <BedDouble size={34} className="icon-accent" style={{ marginBottom: 10 }} />
        <h2 style={{ margin: "0 0 10px", fontFamily: "Playfair Display, serif" }}>Room Details</h2>
        <div className="muted" style={{ marginBottom: 18 }}>Please login or register to book a room.</div>
        <div className="row" style={{ gap: 10 }}>
          <Link className="btn primary" to="/login">Login</Link>
          <Link className="btn" to="/register">Register</Link>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="card">Loading room…</div>;
  if (isError || !room) return <div className="card">Room not found.</div>;

  const heroImages = (room.images ?? []).filter(Boolean);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {heroImages.length > 0 ? (
          <div style={{ position: "relative" }}>
            <ImageCarousel images={heroImages} height={360} autoPlayMs={4200} borderRadius={0} />
          </div>
        ) : (
          <div style={{ height: 240, display: "grid", placeItems: "center" }} className="muted">No images</div>
        )}

        <div style={{ padding: 18 }}>
          <div className="row space" style={{ alignItems: "flex-start", gap: 14 }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontFamily: "Playfair Display, serif" }}>Room {room.roomNo}</h2>
              <div className="muted" style={{ marginTop: 4 }}>{room.type}</div>
              <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                {(room.features ?? []).join(" • ") || "Premium amenities"}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div className="accent-price" style={{ fontSize: 22, fontWeight: 800 }}>LKR {Number(room.pricePerNight).toFixed(0)}</div>
              <div className="muted" style={{ fontSize: 12 }}>/night</div>
            </div>
          </div>
        </div>
      </div>

      <form className="card grid" style={{ gap: 14 }} onSubmit={handleSubmit((v) => {
        if (isAvailableForDates === false) {
          toast.error("Room is not available for the selected dates");
          return;
        }
        bookMut.mutate(v);
      })}>
        <div className="row space" style={{ alignItems: "center" }}>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <CalendarCheck2 size={18} className="icon-accent" />
            <h3 className="section-title" style={{ margin: 0 }}>Reserve this room</h3>
          </div>
          <Link to="/guest/rooms" className="btn ghost">Back to rooms</Link>
        </div>

        <div className="grid two" style={{ gap: 12 }}>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Check-in</label>
            <input
              className={`input${errors.checkIn ? " input-error" : ""}`}
              type="date"
              min={todayStr}
              {...register("checkIn", { required: "Check-in date is required" })}
            />
            {errors.checkIn && <div style={{ color: "#d94f3a", fontSize: 12, marginTop: 4 }}>{errors.checkIn.message}</div>}
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
            />
            {errors.checkOut && <div style={{ color: "#d94f3a", fontSize: 12, marginTop: 4 }}>{errors.checkOut.message}</div>}
          </div>
        </div>

        <div className="grid two" style={{ gap: 12 }}>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Full name</label>
            <input
              className={`input${errors.customerName ? " input-error" : ""}`}
              placeholder="Your full name"
              {...register("customerName", { required: "Your name is required", minLength: { value: 2, message: "Name too short" } })}
            />
            {errors.customerName && <div style={{ color: "#d94f3a", fontSize: 12, marginTop: 4 }}>{errors.customerName.message}</div>}
          </div>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Contact number</label>
            <input
              className={`input${errors.customerContact ? " input-error" : ""}`}
              placeholder="0771234567"
              type="tel"
              inputMode="numeric"
              onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\s+/g, ""); }}
              {...register("customerContact", {
                required: "Contact number is required",
                pattern: { value: /^0\d{9}$/, message: "Must be 10 digits starting with 0 (e.g. 0771234567)" },
              })}
            />
            {errors.customerContact && <div style={{ color: "#d94f3a", fontSize: 12, marginTop: 4 }}>{errors.customerContact.message}</div>}
          </div>
        </div>

        {checkIn && checkOut ? (
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <span className="muted" style={{ fontSize: 13 }}>
              {checkingAvail ? "Checking availability…" : isAvailableForDates ? "Available" : "Not available"}
            </span>
            {nights > 0 ? (
              <span className="chip">{nights} night{nights > 1 ? "s" : ""}</span>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          className="btn primary"
          disabled={bookMut.isPending || isAvailableForDates === false}
          style={{ width: "100%", padding: "12px" }}
        >
          {bookMut.isPending ? "Booking…" : "Book this room"}
        </button>
      </form>
    </div>
  );
}
