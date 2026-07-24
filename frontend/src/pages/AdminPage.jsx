import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../lib/api";
import { useAuth } from "../lib/auth.jsx";
import { MENU_CATEGORIES } from "../constants/menuCategories";

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="row space" style={{ marginBottom: 10 }}>
      <div>
        <h3 className="section-title">{title}</h3>
        {subtitle ? <div className="muted" style={{ fontSize: 13 }}>{subtitle}</div> : null}
      </div>
      {action}
    </div>
  );
}

function ErrorText({ error }) {
  if (!error) return null;
  return <div className="footer-note" style={{ color: "#a33a2a" }}>{error.message ?? "Required"}</div>;
}

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const qc = useQueryClient();

  const { data: revenue } = useQuery({
    queryKey: ["admin-revenue"],
    queryFn: async () => (await api.get("/reports/revenue")).data.data,
    enabled: isAdmin,
  });

  const { data: occupancy } = useQuery({
    queryKey: ["admin-occupancy"],
    queryFn: async () => (await api.get("/reports/occupancy")).data.data,
    enabled: isAdmin,
  });

  const { data: topMenu } = useQuery({
    queryKey: ["admin-top-menu"],
    queryFn: async () => (await api.get("/reports/top-menu-items")).data.data,
    enabled: isAdmin,
  });

  const { data: ratings } = useQuery({
    queryKey: ["admin-rating-trends"],
    queryFn: async () => (await api.get("/reports/rating-trends")).data.data,
    enabled: isAdmin,
  });

  const bookingForm = useForm();
  const paymentForm = useForm();
  const orderForm = useForm();
  const cleaningForm = useForm();
  const menuForm = useForm();
  const employeeForm = useForm();
  const notifyForm = useForm();
  const backupForm = useForm();

  const today = React.useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const getNowLocalDateTime = React.useCallback(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day}T${hh}:${mm}`;
  }, []);

  const cleaningMinDateTime = React.useMemo(() => getNowLocalDateTime(), [getNowLocalDateTime]);
  const cleaningMinDate = React.useMemo(() => cleaningMinDateTime.slice(0, 10), [cleaningMinDateTime]);

  const cleaningSlots = React.useMemo(
    () => Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`),
    []
  );

  const bookingCheckIn = useWatch({ control: bookingForm.control, name: "checkIn" });

  const paymentPayableType = useWatch({ control: paymentForm.control, name: "payableType" });
  const paymentRefId = useWatch({ control: paymentForm.control, name: "refId" });

  const cleaningDate = useWatch({ control: cleaningForm.control, name: "scheduledDate" });

  const { data: roomsData } = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: async () => (await api.get("/rooms", { params: { limit: 20 } })).data.data,
    enabled: isAdmin,
  });

  const { data: ordersData } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => (await api.get("/orders", { params: { limit: 20 } })).data.data,
    enabled: isAdmin,
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await api.get("/users", { params: { limit: 20 } })).data.data,
    enabled: isAdmin,
  });

  const { data: employeesData } = useQuery({
    queryKey: ["admin-employees"],
    queryFn: async () => (await api.get("/employees", { params: { limit: 20 } })).data.data,
    enabled: isAdmin,
  });

  const { data: bookingsData } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => (await api.get("/bookings", { params: { limit: 20 } })).data.data,
    enabled: isAdmin,
  });

  const { data: notificationsData } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => (await api.get("/notifications", { params: { limit: 6 } })).data.data,
    enabled: isAdmin,
  });

  const rooms = React.useMemo(() => roomsData?.items ?? [], [roomsData?.items]);
  const orders = React.useMemo(() => ordersData?.items ?? [], [ordersData?.items]);
  const users = React.useMemo(() => usersData?.items ?? [], [usersData?.items]);
  const employees = React.useMemo(() => employeesData?.items ?? [], [employeesData?.items]);
  const bookings = React.useMemo(() => bookingsData?.items ?? [], [bookingsData?.items]);
  const notifications = React.useMemo(() => notificationsData?.items ?? [], [notificationsData?.items]);

  const unpaidBookings = React.useMemo(
    () => bookings.filter((b) => !b?.paymentId && !["CANCELLED", "REJECTED"].includes(b?.status)),
    [bookings]
  );
  const unpaidOrders = React.useMemo(
    () => orders.filter((o) => !o?.paymentId && o?.status !== "PAID" && o?.status !== "CANCELLED"),
    [orders]
  );

  const housekeepingEmployees = React.useMemo(
    () => employees.filter((e) => e?.role === "HOUSEKEEPING" && e?.isActive !== false),
    [employees]
  );

  const computeNights = (checkIn, checkOut) => {
    const a = new Date(checkIn).getTime();
    const b = new Date(checkOut).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
    return Math.ceil((b - a) / 86400000);
  };

  React.useEffect(() => {
    if (!paymentPayableType) return;
    paymentForm.setValue("refId", "");
    paymentForm.setValue("amount", "");
  }, [paymentPayableType, paymentForm]);

  React.useEffect(() => {
    if (!paymentPayableType) return;
    if (!paymentRefId) return;

    if (paymentPayableType === "ROOM") {
      const b = unpaidBookings.find((x) => x._id === paymentRefId);
      if (!b) return;
      const nights = computeNights(b.checkIn, b.checkOut);
      const rate = Number(b?.roomId?.pricePerNight ?? 0);
      const amount = nights > 0 && Number.isFinite(rate) ? nights * rate : 0;
      if (amount > 0) paymentForm.setValue("amount", String(amount));
    }

    if (paymentPayableType === "RESTAURANT") {
      const o = unpaidOrders.find((x) => x._id === paymentRefId);
      if (!o) return;
      const amount = Number(o?.total ?? 0);
      if (Number.isFinite(amount) && amount > 0) paymentForm.setValue("amount", String(amount));
    }
  }, [paymentPayableType, paymentRefId, unpaidBookings, unpaidOrders, paymentForm]);

  const createBookingMut = useMutation({
    mutationFn: async (values) => (await api.post("/bookings", values)).data.data,
    onSuccess: () => {
      toast.success("Booking created");
      bookingForm.reset();
      qc.invalidateQueries({ queryKey: ["admin-occupancy"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Booking failed"),
  });

  const createPaymentMut = useMutation({
    mutationFn: async (values) => (await api.post("/payments", values)).data.data,
    onSuccess: () => {
      toast.success("Payment recorded");
      paymentForm.reset();
      qc.invalidateQueries({ queryKey: ["admin-revenue"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Payment failed"),
  });

  const updateOrderStatusMut = useMutation({
    mutationFn: async (values) => (await api.patch(`/orders/${values.orderId}/status`, { status: values.status })).data.data,
    onSuccess: () => {
      toast.success("Order updated");
      orderForm.reset();
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Update failed"),
  });

  const createCleaningMut = useMutation({
    mutationFn: async (values) => {
      const payload = { ...values };
      if (!payload.assignedTo) delete payload.assignedTo;

      const date = String(payload.scheduledDate ?? "").trim();
      const slot = String(payload.scheduledSlot ?? "").trim();
      if (date && slot) payload.scheduledAt = `${date}T${slot}`;
      delete payload.scheduledDate;
      delete payload.scheduledSlot;

      return (await api.post("/cleaning", payload)).data.data;
    },
    onSuccess: () => {
      toast.success("Cleaning task created");
      cleaningForm.reset();
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Create failed"),
  });

  const createMenuMut = useMutation({
    mutationFn: async (values) => (await api.post("/menu", values)).data.data,
    onSuccess: () => {
      toast.success("Menu item created");
      menuForm.reset();
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Create failed"),
  });

  const createEmployeeMut = useMutation({
    mutationFn: async (values) => (await api.post("/employees", values)).data.data,
    onSuccess: () => {
      toast.success("Employee created");
      employeeForm.reset();
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Create failed"),
  });

  const createNotificationMut = useMutation({
    mutationFn: async (values) => (await api.post("/notifications", values)).data.data,
    onSuccess: () => {
      toast.success("Notification sent");
      notifyForm.reset();
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Send failed"),
  });

  const exportBackupMut = useMutation({
    mutationFn: async () => (await api.get("/backup/export")).data.data,
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hms-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Export failed"),
  });

  const restoreBackupMut = useMutation({
    mutationFn: async (values) => {
      const parsed = JSON.parse(values.payload || "{}");
      return (await api.post("/backup/restore", parsed)).data.data;
    },
    onSuccess: () => {
      toast.success("Backup restored");
      backupForm.reset();
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Restore failed"),
  });

  if (!isAdmin) {
    return (
      <div className="card">
        <h3 className="section-title">Admin Console</h3>
        <div className="muted">You do not have access to this area.</div>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="card">
        <div className="row space">
          <div>
            <h2 className="page-hero-title">Admin Console</h2>
            <div className="muted page-hero-sub">Full operational control and governance.</div>
          </div>
          <div className="row">
            <Link to="/" className="btn">Switch to Public View</Link>
            <Link to="/users" className="btn">Manage Users</Link>
            <Link to="/reports" className="btn">View Reports</Link>
          </div>
        </div>
      </div>

      <div className="grid two">
        <div className="card">
          <SectionHeader title="KPI Snapshot" subtitle="Occupancy and revenue health" />
          <div className="stack">
            <div className="row space"><span>Total bookings</span><strong>{occupancy?.totalBookings ?? "-"}</strong></div>
            <div className="row space"><span>Active stays</span><strong>{occupancy?.active ?? "-"}</strong></div>
            <div className="row space"><span>Checked-out</span><strong>{occupancy?.checkedOut ?? "-"}</strong></div>
          </div>
        </div>

        <div className="card">
          <SectionHeader title="Revenue Lines" subtitle="Room, restaurant" />
          <table className="table">
            <thead>
              <tr><th>Type</th><th>Count</th><th>Total</th></tr>
            </thead>
            <tbody>
              {(revenue ?? []).map((r) => (
                <tr key={r._id}>
                  <td>{r._id}</td>
                  <td>{r.count}</td>
                  <td>{r.total}</td>
                </tr>
              ))}
              {(!revenue || revenue.length === 0) ? (
                <tr><td colSpan="3" className="muted">No data yet</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid two">
        <div className="card">
          <SectionHeader title="Top Menu Items" subtitle="Most popular dishes" />
          <table className="table">
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Revenue</th></tr>
            </thead>
            <tbody>
              {(topMenu ?? []).map((r) => (
                <tr key={r._id}>
                  <td>{r._id}</td>
                  <td>{r.qty}</td>
                  <td>{r.revenue}</td>
                </tr>
              ))}
              {(!topMenu || topMenu.length === 0) ? (
                <tr><td colSpan="3" className="muted">No data yet</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="card">
          <SectionHeader title="Feedback Ratings" subtitle="Guest sentiment" />
          <div className="row" style={{ flexWrap: "wrap" }}>
            {(ratings ?? []).map((r) => (
              <span className="chip" key={r._id}>Rating {r._id}: {r.count}</span>
            ))}
            {(!ratings || ratings.length === 0) ? (
              <span className="muted">No ratings yet</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="card">
        <SectionHeader title="Quick Actions" subtitle="Fast operational updates" />
        <div className="grid three">
          <form className="card stack" onSubmit={bookingForm.handleSubmit((v) => createBookingMut.mutate(v))}>
            <div style={{ fontWeight: 700 }}>Create Booking</div>
            <input className="input" placeholder="Customer name" {...bookingForm.register("customerName", { required: "Required" })} />
            <ErrorText error={bookingForm.formState.errors.customerName} />
            <input className="input" placeholder="Customer contact" {...bookingForm.register("customerContact", { required: "Required" })} />
            <ErrorText error={bookingForm.formState.errors.customerContact} />
            <input className="input" list="room-options" placeholder="Room ID" {...bookingForm.register("roomId", { required: "Required" })} />
            <datalist id="room-options">
              {rooms.map((room) => (
                <option key={room._id} value={room._id}>{room.roomNo} - {room.type}</option>
              ))}
            </datalist>
            <ErrorText error={bookingForm.formState.errors.roomId} />
            <input
              className="input"
              type="date"
              min={today}
              {...bookingForm.register("checkIn", {
                required: "Required",
                validate: (v) => (v && v >= today ? true : "Check-in must be today or later"),
              })}
            />
            <ErrorText error={bookingForm.formState.errors.checkIn} />
            <input
              className="input"
              type="date"
              min={bookingCheckIn || today}
              {...bookingForm.register("checkOut", {
                required: "Required",
                validate: (v) => {
                  if (!bookingCheckIn || !v) return true;
                  return v > bookingCheckIn || "Check-out must be after check-in";
                },
              })}
            />
            <ErrorText error={bookingForm.formState.errors.checkOut} />
            <button className="btn primary" disabled={createBookingMut.isPending}>
              {createBookingMut.isPending ? "Saving..." : "Create"}
            </button>
          </form>

          <form className="card stack" onSubmit={paymentForm.handleSubmit((v) => createPaymentMut.mutate({ ...v, method: "CASH" }))}>
            <div style={{ fontWeight: 700 }}>Record Payment</div>
            <select className="select" {...paymentForm.register("payableType", { required: "Required" })}>
              <option value="">Payable type</option>
              <option value="ROOM">ROOM</option>
              <option value="RESTAURANT">RESTAURANT</option>
            </select>
            <ErrorText error={paymentForm.formState.errors.payableType} />
            <input className="input" list="payment-ref-options" placeholder="Reference ID" {...paymentForm.register("refId", { required: "Required" })} />
            <datalist id="payment-ref-options">
              {paymentPayableType === "ROOM" ? unpaidBookings.map((b) => (
                <option key={b._id} value={b._id}>Booking - {b.customerName}</option>
              )) : null}
              {paymentPayableType === "RESTAURANT" ? unpaidOrders.map((o) => (
                <option key={o._id} value={o._id}>Order - {o.orderType}</option>
              )) : null}
            </datalist>
            <ErrorText error={paymentForm.formState.errors.refId} />
            <input className="input" placeholder="Amount" {...paymentForm.register("amount", { required: "Required" })} />
            <ErrorText error={paymentForm.formState.errors.amount} />
            <div className="muted" style={{ fontSize: 13 }}>Method: CASH</div>
            <button className="btn primary" disabled={createPaymentMut.isPending}>
              {createPaymentMut.isPending ? "Saving..." : "Record"}
            </button>
          </form>

          <form className="card stack" onSubmit={orderForm.handleSubmit((v) => updateOrderStatusMut.mutate(v))}>
            <div style={{ fontWeight: 700 }}>Update Order Status</div>
            <input className="input" list="order-options" placeholder="Order ID" {...orderForm.register("orderId", { required: "Required" })} />
            <datalist id="order-options">
              {orders.map((o) => (
                <option key={o._id} value={o._id}>{o.orderType} - {o.status}</option>
              ))}
            </datalist>
            <ErrorText error={orderForm.formState.errors.orderId} />
            <select className="select" {...orderForm.register("status", { required: "Required" })}>
              <option value="">Status</option>
              <option value="PLACED">PLACED</option>
              <option value="PREPARING">PREPARING</option>
              <option value="SERVED">SERVED</option>
              <option value="PAID">PAID</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
            <ErrorText error={orderForm.formState.errors.status} />
            <button className="btn primary" disabled={updateOrderStatusMut.isPending}>
              {updateOrderStatusMut.isPending ? "Saving..." : "Update"}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <SectionHeader title="Operations Setup" subtitle="Create core assets" />
        <div className="grid three">
          <form className="card stack" onSubmit={cleaningForm.handleSubmit((v) => createCleaningMut.mutate(v))}>
            <div style={{ fontWeight: 700 }}>Cleaning Task</div>
            <input className="input" list="room-options" placeholder="Room ID" {...cleaningForm.register("roomId", { required: "Required" })} />
            <ErrorText error={cleaningForm.formState.errors.roomId} />
            <input className="input" list="employee-options" placeholder="Assigned employee ID" {...cleaningForm.register("assignedTo")} />
            <datalist id="employee-options">
              {housekeepingEmployees.map((emp) => (
                <option key={emp._id} value={emp._id}>{emp.empNo} - {emp.name}</option>
              ))}
            </datalist>
            <input
              className="input"
              type="date"
              min={cleaningMinDate}
              {...cleaningForm.register("scheduledDate", {
                required: "Required",
                validate: (v) => (v && v >= cleaningMinDate ? true : "Date must be today or later"),
              })}
            />
            <ErrorText error={cleaningForm.formState.errors.scheduledDate} />
            <select
              className="select"
              {...cleaningForm.register("scheduledSlot", {
                required: "Required",
                validate: (slot) => {
                  const d = String(cleaningDate ?? "").trim();
                  const s = String(slot ?? "").trim();
                  if (!d || !s) return true;
                  const combined = `${d}T${s}`;
                  return combined >= cleaningMinDateTime || "Scheduled time must be in the future";
                },
              })}
            >
              <option value="">Time slot</option>
              {cleaningSlots.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ErrorText error={cleaningForm.formState.errors.scheduledSlot} />
            <select className="select" {...cleaningForm.register("status")}> 
              <option value="">Status</option>
              <option value="PENDING">PENDING</option>
              <option value="DONE">DONE</option>
            </select>
            <input className="input" placeholder="Notes" {...cleaningForm.register("notes")} />
            <button className="btn primary" disabled={createCleaningMut.isPending}>
              {createCleaningMut.isPending ? "Saving..." : "Create"}
            </button>
          </form>

          <form className="card stack" onSubmit={menuForm.handleSubmit((v) => createMenuMut.mutate(v))}>
            <div style={{ fontWeight: 700 }}>Menu Item</div>
            <input className="input" placeholder="Name" {...menuForm.register("name", { required: "Required" })} />
            <ErrorText error={menuForm.formState.errors.name} />
            <select className="select" {...menuForm.register("category", { required: "Required" })}>
              <option value="">Category</option>
              {MENU_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ErrorText error={menuForm.formState.errors.category} />
            <input className="input" placeholder="Price" {...menuForm.register("price", { required: "Required" })} />
            <ErrorText error={menuForm.formState.errors.price} />
            <button className="btn primary" disabled={createMenuMut.isPending}>
              {createMenuMut.isPending ? "Saving..." : "Create"}
            </button>
          </form>

          <form className="card stack" onSubmit={employeeForm.handleSubmit((v) => createEmployeeMut.mutate(v))}>
            <div style={{ fontWeight: 700 }}>Employee</div>
            <input className="input" placeholder="Employee no" {...employeeForm.register("empNo", { required: "Required" })} />
            <ErrorText error={employeeForm.formState.errors.empNo} />
            <input className="input" placeholder="Name" {...employeeForm.register("name", { required: "Required" })} />
            <ErrorText error={employeeForm.formState.errors.name} />
            <select className="select" {...employeeForm.register("role", { required: "Required" })}>
              <option value="">Role</option>
              <option value="ADMIN">ADMIN</option>
              <option value="RECEPTION">RECEPTION</option>
              <option value="RESTAURANT_STAFF">RESTAURANT_STAFF</option>
              <option value="HOUSEKEEPING">HOUSEKEEPING</option>
            </select>
            <ErrorText error={employeeForm.formState.errors.role} />
            <input className="input" placeholder="Phone" {...employeeForm.register("phone")} />
            <button className="btn primary" disabled={createEmployeeMut.isPending}>
              {createEmployeeMut.isPending ? "Saving..." : "Create"}
            </button>
          </form>
        </div>
      </div>

      <div className="grid two">
        <div className="card">
          <SectionHeader title="Notifications" subtitle="Send alerts to staff" />
          <form className="grid" onSubmit={notifyForm.handleSubmit((v) => createNotificationMut.mutate(v))}>
            <input className="input" list="user-options" placeholder="User ID" {...notifyForm.register("userId", { required: "Required" })} />
            <datalist id="user-options">
              {users.map((u) => (
                <option key={u._id} value={u._id}>{u.name} - {u.email}</option>
              ))}
            </datalist>
            <ErrorText error={notifyForm.formState.errors.userId} />
            <input className="input" placeholder="Title" {...notifyForm.register("title", { required: "Required" })} />
            <ErrorText error={notifyForm.formState.errors.title} />
            <textarea className="textarea" placeholder="Message" {...notifyForm.register("message", { required: "Required" })} />
            <ErrorText error={notifyForm.formState.errors.message} />
            <select className="select" {...notifyForm.register("type")}>
              <option value="">Type</option>
              <option value="INFO">INFO</option>
              <option value="ALERT">ALERT</option>
              <option value="TASK">TASK</option>
              <option value="BOOKING">BOOKING</option>
              <option value="PAYMENT">PAYMENT</option>
              <option value="SYSTEM">SYSTEM</option>
            </select>
            <button className="btn primary" disabled={createNotificationMut.isPending}>
              {createNotificationMut.isPending ? "Sending..." : "Send"}
            </button>
          </form>
        </div>

        <div className="card">
          <SectionHeader
            title="Backup & Restore"
            subtitle="Export or restore all collections"
            action={
              <button className="btn" onClick={() => exportBackupMut.mutate()} disabled={exportBackupMut.isPending}>
                {exportBackupMut.isPending ? "Exporting..." : "Export JSON"}
              </button>
            }
          />
          <form className="grid" onSubmit={backupForm.handleSubmit((v) => restoreBackupMut.mutate(v))}>
            <textarea className="textarea" placeholder="Paste backup JSON payload" {...backupForm.register("payload")} />
            <button className="btn primary" disabled={restoreBackupMut.isPending}>
              {restoreBackupMut.isPending ? "Restoring..." : "Restore"}
            </button>
            <div className="footer-note">Restore overwrites existing records with matching IDs.</div>
          </form>
        </div>
      </div>

      <div className="card">
        <SectionHeader
          title="Activity Feed"
          subtitle="Latest system notifications"
          action={<Link to="/notifications" className="btn">Open Inbox</Link>}
        />
        <div className="grid">
          {notifications.map((n) => (
            <div key={n._id} className="card">
              <div className="row space">
                <div>
                  <div style={{ fontWeight: 700 }}>{n.title}</div>
                  <div className="muted">{n.message}</div>
                </div>
                <span className="chip">{n.type}</span>
              </div>
            </div>
          ))}
          {notifications.length === 0 ? <div className="muted">No activity yet</div> : null}
        </div>
      </div>
    </div>
  );
}
