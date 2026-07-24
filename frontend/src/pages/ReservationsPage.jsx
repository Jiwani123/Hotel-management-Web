import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { CalendarDays, CheckCircle2, Users } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../lib/auth.jsx";
import ImageCarousel from "../ui/ImageCarousel";

function toDateTimeLocalInputValue(value) {
  const d = value instanceof Date ? new Date(value) : new Date(value);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// Computed once at module load — min datetime for reservations (+1 hour from now, LOCAL time)
const MIN_EPOCH = Date.now() + 60 * 60 * 1000;
const MIN_DATETIME = toDateTimeLocalInputValue(MIN_EPOCH);

function useHeroImages() {
  const { data: menuData } = useQuery({
    queryKey: ["reservations-hero-menu"],
    queryFn: async () => (await api.get("/public/menu", { params: { limit: 10 } })).data.data,
    staleTime: 5 * 60 * 1000,
  });
  return useMemo(
    () => (menuData?.items ?? []).flatMap((i) => i.images ?? []).filter(Boolean).slice(0, 12),
    [menuData]
  );
}

function StatusBadge({ status }) {
  const map = {
    BOOKED:    { bg: "#fef9c3", color: "#713f12" },
    APPROVED:  { bg: "#d1fadf", color: "#14532d" },
    REJECTED:  { bg: "#fee2e2", color: "#7f1d1d" },
    CONFIRMED: { bg: "#d1fadf", color: "#14532d" },
    PENDING:   { bg: "#fef9c3", color: "#713f12" },
    CANCELLED: { bg: "#fee2e2", color: "#7f1d1d" },
    SEATED:    { bg: "#dbeafe", color: "#1e3a5f" },
    ARRIVED:   { bg: "#dbeafe", color: "#1e3a5f" },
  };
  const s = map[status] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: s.bg, color: s.color }}>{status}</span>
  );
}

export default function ReservationsPage() {
  const { isAuthed, user } = useAuth();
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();
  const [confirmed, setConfirmed] = useState(null);
  const [editingResv, setEditingResv] = useState(null);
  const heroImages = useHeroImages();

  useEffect(() => {
    if (user?.name) setValue("customerName", user.name);
    if (user?.phone) setValue("phone", user.phone);
  }, [user, setValue]);

  const { data: existingData, refetch } = useQuery({
    queryKey: ["my-reservations"],
    queryFn: async () => (await api.get("/table-reservations")).data.data,
    enabled: isAuthed,
  });
  const existing = existingData?.items ?? [];

  const updateResvMut = useMutation({
    mutationFn: async ({ id, dateTime, partySize }) =>
      (await api.patch(`/table-reservations/${id}`, { dateTime, partySize: Number(partySize) })).data.data,
    onSuccess: () => { toast.success("Reservation updated"); setEditingResv(null); refetch(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Update failed"),
  });

  const cancelResvMut = useMutation({
    mutationFn: async (id) => (await api.delete(`/table-reservations/${id}`)).data,
    onSuccess: () => { toast.success("Reservation cancelled"); refetch(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Cancel failed"),
  });

  const createMut = useMutation({
    mutationFn: async (values) => (await api.post("/table-reservations", {
      customerName: values.customerName,
      phone: values.phone,
      dateTime: values.dateTime,
      partySize: Number(values.partySize),
    })).data.data,
    onSuccess: (data) => {
      toast.success("Reservation request submitted — awaiting approval.");
      setConfirmed(data);
      reset();
      refetch();
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Reservation failed — please check all fields"),
  });

  if (!isAuthed) {
    return (
      <div className="card" style={{ maxWidth: 460, margin: "40px auto", padding: 32 }}>
        <CalendarDays size={36} className="icon-accent" style={{ marginBottom: 12 }} />
        <h2 style={{ margin: "0 0 10px", fontFamily: "Playfair Display, serif" }}>Reserve a Table</h2>
        <div className="muted" style={{ marginBottom: 20 }}>Please login or register to reserve your dining table.</div>
        <div className="row">
          <Link className="btn primary" to="/login">Login</Link>
          <Link className="btn" to="/register">Register</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Edit modal ── */}
      {editingResv && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(10,20,35,0.65)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 16px",
        }}>
          <div className="card" style={{ width: "100%", maxWidth: 440, padding: 28 }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", marginBottom: 20, fontSize: 22 }}>Edit Reservation</h3>
            <div className="grid" style={{ gap: 14 }}>
              <div>
                <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Date &amp; Time</label>
                <input
                  className="input"
                  type="datetime-local"
                  min={MIN_DATETIME}
                  value={editingResv.editDateTime}
                  onChange={(e) => setEditingResv({ ...editingResv, editDateTime: e.target.value })}
                />
              </div>
              <div>
                <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Party Size</label>
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <Users size={16} className="icon-accent" style={{ flexShrink: 0 }} />
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="20"
                    value={editingResv.editPartySize}
                    onChange={(e) => setEditingResv({ ...editingResv, editPartySize: e.target.value })}
                    style={{ maxWidth: 100 }}
                  />
                </div>
              </div>
            </div>
            <div className="row" style={{ marginTop: 22, gap: 10 }}>
              <button
                className="btn primary"
                disabled={updateResvMut.isPending}
                onClick={() => {
                  const dt = new Date(editingResv.editDateTime).getTime();
                  if (!Number.isFinite(dt) || dt < MIN_EPOCH) {
                    toast.error("Please choose a future date/time");
                    return;
                  }
                  updateResvMut.mutate({
                    id: editingResv._id,
                    dateTime: editingResv.editDateTime,
                    partySize: editingResv.editPartySize,
                  });
                }}
              >
                {updateResvMut.isPending ? "Saving…" : "Save Changes"}
              </button>
              <button className="btn" onClick={() => setEditingResv(null)}>Discard</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Carousel hero ── */}
      <div className="page-hero-carousel" style={{ height: 320 }}>
        <ImageCarousel images={heroImages} height={320} autoPlayMs={4300} />
        <div style={{
          position: "absolute", inset: 0, zIndex: 3,
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
          padding: "32px 44px",
          background: "linear-gradient(to top, rgba(13,27,42,0.92) 0%, rgba(13,27,42,0.08) 60%, transparent 100%)",
          pointerEvents: "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CalendarDays size={26} color="#e5b55a" />
            <div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(24px,3.5vw,40px)", margin: 0, color: "#fff", fontWeight: 700 }}>Table Reservation</h2>
              <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 15, marginTop: 4 }}>Reserve a private dining experience tailored to your occasion.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid two" style={{ gap: 16, alignItems: "start" }}>
        {/* Form */}
        <div className="card">
          {confirmed ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <CheckCircle2 size={44} color="#22c55e" style={{ marginBottom: 12 }} />
              <h3 style={{ fontFamily: "Playfair Display, serif", marginBottom: 8 }}>Reservation Request Received</h3>
              <div className="muted" style={{ marginBottom: 20, fontSize: 14 }}>
                {new Date(confirmed.dateTime).toLocaleString()} · Party of {confirmed.partySize}
              </div>
              <div className="row" style={{ justifyContent: "center", gap: 10 }}>
                <button className="btn primary" onClick={() => setConfirmed(null)}>New Reservation</button>
                <Link to="/customer" className="btn">My Account</Link>
              </div>
            </div>
          ) : (
            <form className="grid" onSubmit={handleSubmit((v) => createMut.mutate(v))} style={{ gap: 16 }}>
              <h3 className="section-title" style={{ marginBottom: 0 }}>New Reservation</h3>
              <div className="grid two" style={{ gap: 14 }}>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Full name</label>
                  <input
                    className={`input${errors.customerName ? " input-error" : ""}`}
                    placeholder="Your full name"
                    {...register("customerName", { required: "Name is required", minLength: { value: 2, message: "Name too short" } })}
                  />
                  {errors.customerName && <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>{errors.customerName.message}</p>}
                </div>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Phone number</label>
                  <input
                    className={`input${errors.phone ? " input-error" : ""}`}
                    type="tel"
                    placeholder="0771234567"
                    {...register("phone", {
                      required: "Phone number is required",
                      pattern: { value: /^0\d{9}$/, message: "Must be 10 digits starting with 0 (e.g. 0771234567)" },
                    })}
                  />
                  {errors.phone && <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>{errors.phone.message}</p>}
                </div>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Date & time</label>
                  <input
                    className={`input${errors.dateTime ? " input-error" : ""}`}
                    type="datetime-local"
                    min={MIN_DATETIME}
                    {...register("dateTime", {
                      required: "Please pick a date and time",
                      validate: (v) => {
                        const dt = new Date(v).getTime();
                        if (!Number.isFinite(dt)) return "Invalid date/time";
                        return dt >= MIN_EPOCH || "Date/time must be in the future";
                      },
                    })}
                  />
                  {errors.dateTime && <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>{errors.dateTime.message}</p>}
                </div>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Party size</label>
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <Users size={16} className="icon-accent" style={{ flexShrink: 0 }} />
                    <input
                      className={`input${errors.partySize ? " input-error" : ""}`}
                      type="number"
                      min="1"
                      max="20"
                      placeholder="2"
                      {...register("partySize", { required: "Party size is required", min: { value: 1, message: "Min 1 guest" }, max: { value: 20, message: "Max 20 guests" } })}
                      style={{ maxWidth: 100 }}
                    />
                  </div>
                  {errors.partySize && <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>{errors.partySize.message}</p>}
                </div>
              </div>
              <div>
                <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Special requests (optional)</label>
                <textarea className="textarea" rows={3} {...register("notes")} placeholder="e.g. anniversary dinner, dietary requirements…" />
              </div>
              <button className="btn primary" disabled={createMut.isPending} style={{ width: "100%", padding: 12 }}>
                {createMut.isPending ? "Confirming…" : "Confirm Reservation"}
              </button>
            </form>
          )}
        </div>

        {/* Existing reservations */}
        <div className="card">
          <h3 className="section-title">My Reservations</h3>
          {existing.length === 0 ? (
            <div className="muted" style={{ fontSize: 14 }}>No reservations yet.</div>
          ) : (
            <div className="stack">
              {existing.map((r) => (
                <div key={r._id} style={{
                  border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px",
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{new Date(r.dateTime).toLocaleString()}</div>
                    <div className="muted" style={{ fontSize: 13 }}>Party of {r.partySize}</div>
                  </div>
                  <div className="row" style={{ gap: 8, alignItems: "center", flexShrink: 0 }}>
                    <StatusBadge status={r.status} />
                    {r.status === "BOOKED" && (
                      <>
                        <button
                          className="btn"
                          style={{ padding: "4px 12px", fontSize: 12 }}
                          onClick={() => setEditingResv({
                            ...r,
                            editDateTime: r.dateTime.slice(0, 16),
                            editPartySize: r.partySize,
                          })}
                        >
                          Edit
                        </button>
                        <button
                          className="btn"
                          style={{ padding: "4px 12px", fontSize: 12, color: "#d94f3a", borderColor: "#d94f3a" }}
                          disabled={cancelResvMut.isPending}
                          onClick={() => {
                            if (window.confirm("Cancel this reservation?")) cancelResvMut.mutate(r._id);
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
