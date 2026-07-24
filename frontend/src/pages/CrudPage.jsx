import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Ban, Check, Eye, LogIn, LogOut, Pencil, Trash2, Undo2, X } from "lucide-react";
import api, { assetUrl, uploadImages } from "../lib/api";
import { MENU_CATEGORIES } from "../constants/menuCategories";

function filenameFromContentDisposition(value) {
  try {
    const v = String(value ?? "");
    const m = v.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const raw = decodeURIComponent(m?.[1] ?? m?.[2] ?? "");
    return raw || "";
  } catch {
    return "";
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

const configs = {
  restaurant: {
    title: "Restaurant",
    description: "Overview for dining operations. Use Menu, Orders, and Table Reservations tabs.",
    readOnly: true,
  },
  employees: {
    title: "Employees",
    description: "Manage staff records and roles.",
    createFields: [
      ["empNo", "Employee No"],
      ["name", "Name"],
      ["role", "Role", "select", ["ADMIN", "RECEPTION", "RESTAURANT_STAFF", "HOUSEKEEPING"]],
      ["phone", "Phone"],
      ["address", "Address"],
      ["salary", "Salary"],
    ],
    columns: ["empNo", "name", "role", "phone", "isActive"],
  },
  rooms: {
    title: "Rooms",
    description: "Room inventory and nightly rates.",
    createFields: [
      ["roomNo", "Room No"],
      ["type", "Type"],
      ["pricePerNight", "Price/Night"],
      ["status", "Status", "select", ["AVAILABLE", "OCCUPIED", "MAINTENANCE"]],
      ["features", "Features (comma separated)"],
      ["images", "Images", "images", { maxFiles: 10 }],
    ],
    columns: ["roomNo", "type", "pricePerNight", "status"],
  },
  bookings: {
    title: "Bookings",
    description: "Guest bookings and stay lifecycle.",
    createFields: [
      ["customerName", "Customer Name"],
      ["customerContact", "Contact"],
      ["roomId", "Room", "ref", { resource: "rooms", placeholder: "Select a room" }],
      ["checkIn", "Check In", "date"],
      ["checkOut", "Check Out", "date"],
    ],
    columns: ["customerName", "customerContact", "status", "checkIn", "checkOut"],
    actions: ["approve", "reject", "cancel", "check-in", "check-out"],
  },
  payments: {
    title: "Payments",
    description: "Record payments and issue receipts.",
    createFields: [
      ["payableType", "Payable Type", "select", ["ROOM", "RESTAURANT"]],
      ["refId", "Reference", "refBy", { dependsOn: "payableType" }],
      ["amount", "Amount"],
    ],
    columns: ["payableType", "amount", "method", "receiptNo", "paidAt"],
  },
  feedback: {
    title: "Feedback",
    description: "Guest ratings and comments. Admins can view and delete only.",
    noCreate: true,
    createFields: [],
    columns: ["customerName", "rating", "comment", "createdAt"],
  },
  cleaning: {
    title: "Cleaning Tasks",
    description: "Housekeeping schedule and completion.",
    createFields: [
      ["roomId", "Room", "ref", { resource: "rooms", placeholder: "Select a room" }],
      ["assignedTo", "Assigned Employee (optional)", "ref", { resource: "employees", optional: true, placeholder: "Select an employee (optional)" }],
      ["scheduledDate", "Date", "date"],
      ["scheduledSlot", "Time Slot", "select", Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`)],
      ["status", "Status", "select", ["PENDING", "DONE"]],
      ["notes", "Notes"],
    ],
    columns: ["roomId", "assignedTo", "status", "scheduledAt"],
  },
  menu: {
    title: "Menu Items",
    description: "Dining menu catalog.",
    createFields: [
      ["name", "Name"],
      ["category", "Category", "select", MENU_CATEGORIES],
      ["price", "Price"],
      ["isVeg", "Veg", "checkbox"],
      ["images", "Images", "images", { maxFiles: 10 }],
    ],
    columns: ["name", "category", "price", "isVeg"],
  },
  orders: {
    title: "Orders",
    description: "Restaurant and room-service orders.",
    createFields: [
      ["orderType", "Order Type", "select", ["DINE_IN", "ROOM_SERVICE"]],
      ["items", "Items"],
      ["tableNo", "Table No (DINE_IN)"],
      ["roomId", "Room (ROOM_SERVICE)", "ref", { resource: "rooms", optional: true, placeholder: "Select a room (for room service)" }],
    ],
    columns: ["orderType", "status", "tableNo", "roomId", "total"],
    actions: ["status"],
    allowEdit: false,
  },
  "table-reservations": {
    title: "Table Reservations",
    description: "Dining reservations and arrivals.",
    createFields: [
      ["customerName", "Customer Name"],
      ["phone", "Phone"],
      ["dateTime", "Date & Time", "datetime-local"],
      ["partySize", "Party Size"],
    ],
    columns: ["customerName", "phone", "dateTime", "partySize", "status"],
    actions: ["approve", "reject"],
  },
};

function parseMaybeJson(value) {
  if (typeof value !== "string") return value;
  const t = value.trim();
  if (!t) return value;
  if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
    try { return JSON.parse(t); } catch { return value; }
  }
  if (t === "true") return true;
  if (t === "false") return false;
  const n = Number(t);
  if (!Number.isNaN(n) && t.match(/^-?\d+(\.\d+)?$/)) return n;
  return value;
}

export default function CrudPage({ resource }) {
  const cfg = configs[resource];
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [orderMenuItemId, setOrderMenuItemId] = useState("");
  const [orderQty, setOrderQty] = useState(1);
  const [imagesExisting, setImagesExisting] = useState([]);
  const [imagesNew, setImagesNew] = useState([]); // { file, previewUrl }
  const [imagesTouched, setImagesTouched] = useState(false);
  const canEdit = cfg?.allowEdit !== false;
  const isReadOnly = cfg?.readOnly;

  const isOrders = resource === "orders";
  const isPayments = resource === "payments";
  const isBookings = resource === "bookings";
  const isCleaning = resource === "cleaning";

  const canExportCsv = true;

  const exportCsv = async () => {
    if (!canExportCsv) return;
    try {
      const res = await api.get(`/reports/export/${resource}`, { responseType: "blob" });
      const cd = res.headers?.["content-disposition"];
      const filename = filenameFromContentDisposition(cd) || `${resource}.csv`;
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      downloadBlob(blob, filename);
      toast.success("Export started");
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Export failed");
    }
  };

  const downloadInvoicePdf = async (paymentId, invoiceNo) => {
    if (!paymentId) return;
    try {
      const res = await api.get(`/reports/invoices/payment/${paymentId}/pdf`, { responseType: "blob" });
      const cd = res.headers?.["content-disposition"];
      const filename = filenameFromContentDisposition(cd) || `invoice_${invoiceNo ?? paymentId}.pdf`;
      const blob = new Blob([res.data], { type: "application/pdf" });
      downloadBlob(blob, filename);
      toast.success("Invoice downloaded");
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Invoice download failed");
    }
  };
  const supportsImages = useMemo(
    () => (cfg?.createFields ?? []).some((f) => f?.[2] === "images" && f?.[0] === "images"),
    [cfg]
  );

  useEffect(() => {
    // reset image state when switching resources
    setImagesExisting([]);
    setImagesNew((prev) => {
      prev.forEach((p) => {
        try {
          if (p?.previewUrl) URL.revokeObjectURL(p.previewUrl);
        } catch {
          // ignore
        }
      });
      return [];
    });
    setImagesTouched(false);
  }, [resource]);

  const { data, isLoading, isFetching, dataUpdatedAt } = useQuery({
    queryKey: [resource, q],
    enabled: !isReadOnly,
    // Professional feel: keep Payments list fresh without manual refresh.
    // Only enabled for payments to avoid unnecessary load on other resources.
    refetchInterval: isPayments ? 5000 : false,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await api.get(`/${resource}`, { params: q ? { q } : {} });
      return res.data.data;
    },
  });

  const paymentsLastUpdatedLabel = useMemo(() => {
    if (!isPayments || !dataUpdatedAt) return "";
    try {
      return new Date(dataUpdatedAt).toLocaleTimeString();
    } catch {
      return "";
    }
  }, [isPayments, dataUpdatedAt]);

  const {
    data: menuData,
    isLoading: isMenuLoading,
    isError: isMenuError,
    error: menuError,
  } = useQuery({
    queryKey: ["menu-items-for-orders", "available"],
    enabled: isOrders && !isReadOnly,
    queryFn: async () => {
      const res = await api.get("/menu", { params: { limit: 100, isAvailable: true } });
      return res.data.data;
    },
  });

  const needsRooms = useMemo(
    () => (cfg?.createFields ?? []).some((f) => f?.[2] === "ref" && f?.[3]?.resource === "rooms"),
    [cfg]
  );
  const needsEmployees = useMemo(
    () => (cfg?.createFields ?? []).some((f) => f?.[2] === "ref" && f?.[3]?.resource === "employees"),
    [cfg]
  );
  const needsBookings = useMemo(
    () => (cfg?.createFields ?? []).some((f) => f?.[2] === "ref" && f?.[3]?.resource === "bookings") || isPayments,
    [cfg, isPayments]
  );
  const needsOrders = useMemo(() => isPayments, [isPayments]);

  const roomsQ = useQuery({
    queryKey: ["ref", "rooms"],
    enabled: needsRooms && !isReadOnly,
    queryFn: async () => (await api.get("/rooms", { params: { limit: 100 } })).data.data,
  });
  const employeesQ = useQuery({
    queryKey: ["ref", "employees"],
    enabled: needsEmployees && !isReadOnly,
    queryFn: async () => (await api.get("/employees", { params: { limit: 100, isActive: true } })).data.data,
  });
  const bookingsQ = useQuery({
    queryKey: ["ref", "bookings"],
    enabled: needsBookings && !isReadOnly,
    queryFn: async () => (await api.get("/bookings", { params: { limit: 100 } })).data.data,
  });
  const ordersQ = useQuery({
    queryKey: ["ref", "orders"],
    enabled: needsOrders && !isReadOnly,
    queryFn: async () => (await api.get("/orders", { params: { limit: 100 } })).data.data,
  });

  const menuItems = useMemo(() => menuData?.items ?? [], [menuData]);
  const menuItemById = useMemo(() => {
    const m = new Map();
    menuItems.forEach((i) => m.set(i._id, i));
    return m;
  }, [menuItems]);

  const rows = data?.items ?? [];
  const colCount = (cfg?.columns?.length ?? 0) + 2;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm();

  const payableType = watch("payableType");
  const orderType = watch("orderType");
  const bookingCheckIn = watch("checkIn");
  const paymentRefId = watch("refId");
  const paymentAmount = watch("amount");
  const cleaningDate = watch("scheduledDate");

  const computeNights = (checkIn, checkOut) => {
    const a = new Date(checkIn).getTime();
    const b = new Date(checkOut).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
    return Math.ceil((b - a) / 86400000);
  };

  const getNowLocalDateTime = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day}T${hh}:${mm}`;
  };

  const cleaningMinDate = useMemo(() => getNowLocalDateTime().slice(0, 10), []);
  const cleaningMinDateTime = useMemo(() => getNowLocalDateTime(), []);

  function closeEditModal() {
    reset();
    setEditing(null);
    setEditOpen(false);
    setConfirmDeleteId(null);
    if (supportsImages) {
      setImagesExisting([]);
      setImagesNew((prev) => {
        prev.forEach((p) => {
          try {
            if (p?.previewUrl) URL.revokeObjectURL(p.previewUrl);
          } catch {
            // ignore
          }
        });
        return [];
      });
      setImagesTouched(false);
    }
  }

  const rooms = useMemo(() => roomsQ.data?.items ?? [], [roomsQ.data]);
  const employees = useMemo(() => employeesQ.data?.items ?? [], [employeesQ.data]);
  const bookings = useMemo(() => bookingsQ.data?.items ?? [], [bookingsQ.data]);
  const orders = useMemo(() => ordersQ.data?.items ?? [], [ordersQ.data]);

  useEffect(() => {
    if (resource !== "payments") return;
    if (!payableType || !paymentRefId) return;
    if (paymentAmount != null && String(paymentAmount).trim() !== "") return;

    if (payableType === "ROOM") {
      const b = bookings.find((x) => x._id === paymentRefId);
      if (!b || b?.paymentId || ["CANCELLED", "REJECTED"].includes(b?.status)) return;
      const nights = computeNights(b.checkIn, b.checkOut);
      const rate = Number(b?.roomId?.pricePerNight ?? 0);
      const amount = nights > 0 && Number.isFinite(rate) ? nights * rate : 0;
      if (amount > 0) setValue("amount", String(amount));
    }

    if (payableType === "RESTAURANT") {
      const o = orders.find((x) => x._id === paymentRefId);
      if (!o || o?.paymentId || o?.status === "PAID" || o?.status === "CANCELLED") return;
      const amount = Number(o?.total ?? 0);
      if (Number.isFinite(amount) && amount > 0) setValue("amount", String(amount));
    }
  }, [resource, payableType, paymentRefId, paymentAmount, bookings, orders, setValue]);

  function fieldRules(fieldName, label, type, options) {
    const baseLabel = String(label ?? fieldName).replace(/\s*\(.*?\)\s*/g, "").trim() || fieldName;

    const requiredIf = (condition, msg) => (condition ? { required: msg } : {});

    if (resource === "employees") {
      if (fieldName === "empNo") return { required: "Employee No is required" };
      if (fieldName === "name") return { required: "Name is required", minLength: { value: 2, message: "Name must be at least 2 characters" } };
      if (fieldName === "role") return { required: "Role is required" };
      if (fieldName === "salary") return { valueAsNumber: true, min: { value: 0, message: "Salary cannot be negative" } };
      return {};
    }

    if (resource === "rooms") {
      if (fieldName === "roomNo") return { required: "Room No is required" };
      if (fieldName === "type") return { required: "Type is required" };
      if (fieldName === "pricePerNight") return { required: "Price per night is required", valueAsNumber: true, min: { value: 0, message: "Price cannot be negative" } };
      return {};
    }

    if (resource === "bookings") {
      if (fieldName === "customerName") return { required: "Customer name is required", minLength: { value: 2, message: "Name must be at least 2 characters" } };
      if (fieldName === "customerContact") return { required: "Contact is required" };
      if (fieldName === "roomId") return { required: "Room is required" };
      if (fieldName === "checkIn") {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        return {
          required: "Check-in date is required",
          validate: (v) => (v && v >= todayStr ? true : "Check-in must be today or later"),
        };
      }
      if (fieldName === "checkOut") {
        return {
          required: "Check-out date is required",
          validate: (v) => {
            const ci = bookingCheckIn;
            if (!ci || !v) return true;
            const t1 = new Date(ci).getTime();
            const t2 = new Date(v).getTime();
            if (!Number.isFinite(t1) || !Number.isFinite(t2)) return "Please enter valid dates";
            return t2 > t1 || "Check-out must be after check-in";
          },
        };
      }
      return {};
    }

    if (resource === "payments") {
      if (fieldName === "payableType") return { required: "Payable type is required" };
      if (fieldName === "refId") return requiredIf(!!payableType, "Reference is required");
      if (fieldName === "amount") return { required: "Amount is required", valueAsNumber: true, min: { value: 0.01, message: "Amount must be greater than 0" } };
      if (fieldName === "method") return { required: "Method is required" };
      return {};
    }

    if (resource === "cleaning") {
      if (fieldName === "roomId") return { required: "Room is required" };
      if (fieldName === "scheduledDate") {
        return {
          required: "Date is required",
          validate: (v) => (v && v >= cleaningMinDate ? true : "Date must be today or later"),
        };
      }
      if (fieldName === "scheduledSlot") {
        return {
          required: "Time slot is required",
          validate: (slot) => {
            const d = String(cleaningDate ?? "").trim();
            const s = String(slot ?? "").trim();
            if (!d || !s) return true;
            const combined = `${d}T${s}`;
            return combined >= cleaningMinDateTime || "Scheduled time must be in the future";
          },
        };
      }
      return {};
    }

    if (resource === "menu") {
      if (fieldName === "name") return { required: "Name is required" };
      if (fieldName === "category") return { required: "Category is required" };
      if (fieldName === "price") return { required: "Price is required", valueAsNumber: true, min: { value: 0, message: "Price cannot be negative" } };
      return {};
    }

    if (resource === "orders") {
      if (fieldName === "orderType") return { required: "Order type is required" };
      if (fieldName === "tableNo") {
        return requiredIf(orderType === "DINE_IN", "Table No is required for dine-in orders");
      }
      if (fieldName === "roomId") {
        return requiredIf(orderType === "ROOM_SERVICE", "Room is required for room service orders");
      }
      if (fieldName === "items") {
        return {
          validate: () => (orderItems.length > 0 ? true : "Add at least one item"),
        };
      }
      return {};
    }

    if (resource === "table-reservations") {
      if (fieldName === "customerName") return { required: "Customer name is required", minLength: { value: 2, message: "Name must be at least 2 characters" } };
      if (fieldName === "phone") return { required: "Phone is required" };
      if (fieldName === "dateTime") {
        return {
          required: "Date/time is required",
          validate: (v) => {
            if (!v) return true;
            const t = new Date(v).getTime();
            if (!Number.isFinite(t)) return "Please enter a valid date/time";
            return t >= Date.now() || "Reservation must be in the future";
          },
        };
      }
      if (fieldName === "partySize") return { required: "Party size is required", valueAsNumber: true, min: { value: 1, message: "Min 1 guest" }, max: { value: 50, message: "Max 50 guests" } };
      return {};
    }

    // Default: no client-side constraint
    if (type === "date" || type === "datetime-local") return {};
    if (type === "images" || type === "checkbox") return {};
    if (String(baseLabel).toLowerCase().includes("optional")) return {};
    return {};
  }

  function renderRefSelect(fieldName, refCfg, rules, hasError) {
    const placeholder = refCfg?.placeholder ?? "Select";
    const optional = !!refCfg?.optional;
    const refResource = refCfg?.resource;

    let queryState = null;
    let options = [];

    if (refResource === "rooms") {
      queryState = roomsQ;
      options = rooms.map((r) => ({ value: r._id, label: `Room ${r.roomNo} · ${r.type} · ${r.status}` }));
    } else if (refResource === "employees") {
      queryState = employeesQ;
      const pool = isCleaning && fieldName === "assignedTo"
        ? employees.filter((e) => e?.role === "HOUSEKEEPING")
        : employees;
      options = pool.map((e) => ({ value: e._id, label: `${e.empNo} · ${e.name} · ${e.role}` }));
    } else if (refResource === "bookings") {
      queryState = bookingsQ;
      options = bookings.map((b) => ({
        value: b._id,
        label: `${b.customerName} · ${b.status} · ${String(b.checkIn ?? "").slice(0, 10)}`.trim(),
      }));
    }

    const isLoading = !!queryState?.isLoading;
    const isError = !!queryState?.isError;

    return (
      <div style={{ display: "grid", gap: 8 }}>
        {isLoading ? <div className="muted" style={{ fontSize: 12 }}>Loading…</div> : null}
        {isError ? (
          <div className="muted" style={{ fontSize: 12, color: "#d94f3a" }}>
            Could not load {refResource}{queryState?.error?.response?.status === 403 ? " (no permission)" : ""}.
          </div>
        ) : null}
        <select className={`select${hasError ? " input-error" : ""}`} {...register(fieldName, rules)} disabled={isLoading || isError}>
          <option value="">{optional ? placeholder : placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  function renderPaymentRefSelect(rules, hasError) {
    const type = payableType;

    let queryState = null;
    let options = [];

    if (type === "ROOM") {
      queryState = bookingsQ;
      options = bookings
        .filter((b) => !b?.paymentId && !["CANCELLED", "REJECTED"].includes(b?.status))
        .map((b) => ({ value: b._id, label: `${b.customerName} · ${b.status}` }));
    } else if (type === "RESTAURANT") {
      queryState = ordersQ;
      options = orders
        .filter((o) => !o?.paymentId && o?.status !== "PAID" && o?.status !== "CANCELLED")
        .map((o) => ({ value: o._id, label: `${o.orderType} · ${o.status} · ${o.total ?? ""}`.trim() }));
    }

    const isLoading = !!queryState?.isLoading;
    const isError = !!queryState?.isError;
    const disabled = !type || isLoading || isError;

    return (
      <div style={{ display: "grid", gap: 8 }}>
        {!type ? <div className="muted" style={{ fontSize: 12 }}>Select Payable Type first.</div> : null}
        {isLoading ? <div className="muted" style={{ fontSize: 12 }}>Loading…</div> : null}
        {isError ? (
          <div className="muted" style={{ fontSize: 12, color: "#d94f3a" }}>
            Could not load references{queryState?.error?.response?.status === 403 ? " (no permission)" : ""}.
          </div>
        ) : null}
        <select className={`select${hasError ? " input-error" : ""}`} {...register("refId", rules)} disabled={disabled}>
          <option value="">Select</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  async function uploadPendingImages() {
    if (!supportsImages) return [];
    if (imagesNew.length === 0) return [];

    const files = imagesNew.map((x) => x.file).filter(Boolean);
    if (files.length === 0) return [];

    try {
      const uploaded = await uploadImages(files);
      return uploaded.map((u) => u.url).filter(Boolean);
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Image upload failed");
      throw e;
    }
  }

  function renderImagesField(fieldName, options) {
    const maxFiles = Number(options?.maxFiles ?? 10);
    const totalCount = imagesExisting.length + imagesNew.length;
    const remaining = Math.max(0, maxFiles - totalCount);

    return (
      <div style={{ display: "grid", gap: 10 }}>
        <div className="muted" style={{ fontSize: 12 }}>
          Upload up to {maxFiles} images. {remaining > 0 ? `${remaining} remaining.` : "Limit reached."}
        </div>

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <input
            className="input"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              if (picked.length === 0) return;

              const allow = picked.slice(0, remaining);
              if (allow.length < picked.length) toast.error(`Only ${remaining} more images allowed`);

              const next = allow.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
              setImagesNew((prev) => [...prev, ...next]);
              setImagesTouched(true);
              e.target.value = "";
            }}
            disabled={remaining === 0}
            style={{ maxWidth: 340 }}
          />

          {(imagesExisting.length > 0 || imagesNew.length > 0) ? (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setImagesExisting([]);
                setImagesNew((prev) => {
                  prev.forEach((p) => {
                    try {
                      if (p?.previewUrl) URL.revokeObjectURL(p.previewUrl);
                    } catch {
                      // ignore
                    }
                  });
                  return [];
                });
                setImagesTouched(true);
              }}
            >
              Clear
            </button>
          ) : null}
        </div>

        {/* keep RHF field present */}
        <input type="hidden" {...register(fieldName)} value="__managed__" readOnly />

        {(imagesExisting.length > 0 || imagesNew.length > 0) ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: 10,
            }}
          >
            {imagesExisting.map((url) => (
              <div key={url} style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ aspectRatio: "4 / 3", background: "rgba(0,0,0,0.04)" }}>
                  <img
                    src={assetUrl(url)}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
                <div style={{ padding: 8 }}>
                  <button
                    type="button"
                    className="btn danger"
                    style={{ width: "100%", padding: "6px 10px", fontSize: 12 }}
                    onClick={() => {
                      setImagesExisting((prev) => prev.filter((p) => p !== url));
                      setImagesTouched(true);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {imagesNew.map((p) => (
              <div
                key={p.previewUrl}
                style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}
              >
                <div style={{ aspectRatio: "4 / 3", background: "rgba(0,0,0,0.04)" }}>
                  <img
                    src={p.previewUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
                <div style={{ padding: 8 }}>
                  <button
                    type="button"
                    className="btn danger"
                    style={{ width: "100%", padding: "6px 10px", fontSize: 12 }}
                    onClick={() => {
                      setImagesNew((prev) => {
                        const next = prev.filter((x) => x.previewUrl !== p.previewUrl);
                        try { URL.revokeObjectURL(p.previewUrl); } catch { /* ignore */ }
                        return next;
                      });
                      setImagesTouched(true);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 12 }}>
            No images selected.
          </div>
        )}
      </div>
    );
  }

  // Returns the declared field type from cfg, e.g. "datetime-local", "date", "ref", etc.
  const getFieldType = (fieldName) => {
    const def = (cfg?.createFields ?? []).find((f) => f?.[0] === fieldName);
    return def?.[2] ?? null;
  };

  // Fields that must always remain strings — never coerce to number
  const isAlwaysStringField = (k) => {
    if (
      /Id$/.test(k) ||
      k === "assignedTo" ||
      k === "roomNo" ||
      k === "empNo" ||
      k === "tableNo" ||
      k === "phone" ||
      k === "customerContact"
    ) return true;
    const ft = getFieldType(k);
    return ft === "datetime-local" || ft === "date";
  };

  const normalizePhoneLike = (value) => String(value).replace(/\s+/g, "");

  const createMut = useMutation({
    mutationFn: async (values) => {
      const payload = {};
      for (const [k, v] of Object.entries(values)) {
        if (v === "") continue;

        if (k === "images") continue;

        // Keep string-typed and code fields as strings; parse everything else
        if (typeof v === "string" && isAlwaysStringField(k) && v.trim() !== "") {
          const trimmed = v.trim();
          payload[k] = /phone|contact/i.test(k) ? normalizePhoneLike(trimmed) : trimmed;
        } else {
          payload[k] = parseMaybeJson(v);
        }
      }

      if (resource === "cleaning") {
        const date = String(values.scheduledDate ?? "").trim();
        const slot = String(values.scheduledSlot ?? "").trim();
        if (!date) {
          toast.error("Select a date");
          throw new Error("Missing cleaning scheduledDate");
        }
        if (!slot) {
          toast.error("Select a time slot");
          throw new Error("Missing cleaning scheduledSlot");
        }
        const scheduledAt = `${date}T${slot}`;
        if (scheduledAt < cleaningMinDateTime) {
          toast.error("Scheduled time must be in the future");
          throw new Error("Cleaning scheduledAt in past");
        }
        payload.scheduledAt = scheduledAt;
        delete payload.scheduledDate;
        delete payload.scheduledSlot;
      }

      if (supportsImages) {
        const uploadedUrls = await uploadPendingImages();
        const merged = [...imagesExisting, ...uploadedUrls].filter(Boolean);
        if (merged.length > 0) payload.images = merged;
      }

      if (resource === "orders") {
        if (orderItems.length === 0) {
          toast.error("Please add at least one menu item");
          throw new Error("Empty order items");
        }
        payload.items = orderItems;
      }

      if (resource === "payments") {
        payload.method = "CASH";
      }

      if (resource === "rooms" && typeof payload.features === "string") {
        payload.features = payload.features.split(",").map((s) => s.trim()).filter(Boolean);
      }
      const res = await api.post(`/${resource}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success("Created");
      reset();
      if (resource === "orders") {
        setOrderItems([]);
        setOrderMenuItemId("");
        setOrderQty(1);
      }
      if (supportsImages) {
        setImagesExisting([]);
        setImagesNew((prev) => {
          prev.forEach((p) => {
            try {
              if (p?.previewUrl) URL.revokeObjectURL(p.previewUrl);
            } catch {
              // ignore
            }
          });
          return [];
        });
        setImagesTouched(false);
      }
      qc.invalidateQueries({ queryKey: [resource] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Create failed"),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, values }) => {
      const payload = {};
      for (const [k, v] of Object.entries(values)) {
        if (v === "") continue;
        if (k === "images") continue;
        if (typeof v === "string" && isAlwaysStringField(k) && v.trim() !== "") {
          const trimmed = v.trim();
          payload[k] = /phone|contact/i.test(k) ? normalizePhoneLike(trimmed) : trimmed;
        } else {
          payload[k] = parseMaybeJson(v);
        }
      }

      if (resource === "cleaning") {
        const date = String(values.scheduledDate ?? "").trim();
        const slot = String(values.scheduledSlot ?? "").trim();
        if (date && slot) {
          const scheduledAt = `${date}T${slot}`;
          if (scheduledAt < cleaningMinDateTime) {
            toast.error("Scheduled time must be in the future");
            throw new Error("Cleaning scheduledAt in past");
          }
          payload.scheduledAt = scheduledAt;
        }
        delete payload.scheduledDate;
        delete payload.scheduledSlot;
      }

      if (supportsImages) {
        const uploadedUrls = await uploadPendingImages();
        const merged = [...imagesExisting, ...uploadedUrls].filter(Boolean);
        if (imagesTouched) payload.images = merged;
      }
      if (resource === "rooms" && typeof payload.features === "string") {
        payload.features = payload.features.split(",").map((s) => s.trim()).filter(Boolean);
      }
      const res = await api.patch(`/${resource}/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success("Updated");
      reset();
      setEditing(null);
      if (supportsImages) {
        setImagesNew((prev) => {
          prev.forEach((p) => {
            try {
              if (p?.previewUrl) URL.revokeObjectURL(p.previewUrl);
            } catch {
              // ignore
            }
          });
          return [];
        });
        setImagesTouched(false);
      }
      qc.invalidateQueries({ queryKey: [resource] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Update failed"),
  });

  const delMut = useMutation({
    mutationFn: async (id) => (await api.delete(`/${resource}/${id}`)).data,
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: [resource] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Delete failed"),
  });

  const actionMut = useMutation({
    mutationFn: async ({ id, action, payload }) => {
      if ((resource === "bookings" || resource === "table-reservations") && action !== "status") {
        return (await api.post(`/${resource}/${id}/${action}`)).data;
      }
      if (resource === "orders" && action === "status") {
        return (await api.patch(`/${resource}/${id}/status`, payload)).data;
      }
      return null;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: [resource] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Action failed"),
  });

  if (!cfg) return <div className="card">Unknown resource.</div>;
  if (isReadOnly) {
    return (
      <div className="card">
        <h3 className="section-title">{cfg.title}</h3>
        <p className="muted">{cfg.description}</p>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="card">
        <div className="row space">
          <div>
            <h2 style={{ margin: 0 }}>{cfg.title}</h2>
            <div className="muted" style={{ fontSize: 13 }}>{cfg.description}</div>
          </div>
          <div className="row" style={{ gap: 12 }}>
            {isPayments ? (
              <div className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                {isFetching || isLoading
                  ? "Updating…"
                  : paymentsLastUpdatedLabel
                    ? `Last updated: ${paymentsLastUpdatedLabel}`
                    : "Last updated: —"}
              </div>
            ) : null}

            {canExportCsv ? (
              <button type="button" className="btn" onClick={exportCsv}>
                Export CSV
              </button>
            ) : null}
            <input className="input" style={{ width: 240 }} placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </div>

      {!editOpen && !cfg.noCreate ? (
        <div className="card">
          <h3 className="section-title">Create</h3>
          <form className="grid two" onSubmit={handleSubmit((v) => createMut.mutate(v))}>
            {cfg.createFields.map(([name, label, type, options]) => {
              const rules = fieldRules(name, label, type, options);
              const message = errors?.[name]?.message;
              const hasError = !!errors?.[name];

              return (
                <div key={name}>
                  <label className="muted" style={{ fontSize: 13 }}>{label}</label>
                  {isOrders && name === "items" ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {isMenuLoading ? (
                      <div className="muted" style={{ fontSize: 12 }}>Loading menu items…</div>
                    ) : null}
                    {isMenuError ? (
                      <div className="muted" style={{ fontSize: 12, color: "#d94f3a" }}>
                        Could not load menu items{menuError?.response?.status === 403 ? " (no permission)" : ""}.
                      </div>
                    ) : null}
                    <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                      <select
                        className="select"
                        value={orderMenuItemId}
                        onChange={(e) => setOrderMenuItemId(e.target.value)}
                        style={{ minWidth: 240 }}
                        disabled={isMenuLoading || isMenuError}
                      >
                        <option value="">Select a menu item</option>
                        {menuItems.map((mi) => (
                          <option key={mi._id} value={mi._id}>
                            {mi.name} · {mi.category} · LKR {Number(mi.price).toFixed(2)}
                          </option>
                        ))}
                      </select>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        value={orderQty}
                        onChange={(e) => setOrderQty(Number(e.target.value || 1))}
                        style={{ width: 110 }}
                      />
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          if (!orderMenuItemId) {
                            toast.error("Select a menu item");
                            return;
                          }
                          const qty = Number(orderQty);
                          if (!Number.isFinite(qty) || qty < 1) {
                            toast.error("Quantity must be at least 1");
                            return;
                          }

                          setOrderItems((prev) => {
                            const existing = prev.find((it) => it.menuItemId === orderMenuItemId);
                            if (existing) {
                              return prev.map((it) =>
                                it.menuItemId === orderMenuItemId ? { ...it, qty: it.qty + qty } : it
                              );
                            }
                            return [...prev, { menuItemId: orderMenuItemId, qty }];
                          });
                          setOrderMenuItemId("");
                          setOrderQty(1);
                        }}
                        disabled={isMenuLoading || isMenuError || menuItems.length === 0}
                      >
                        Add
                      </button>
                    </div>

                    {/* keep RHF field present, but payload comes from orderItems */}
                    <input type="hidden" {...register("items", rules)} value="__managed__" readOnly />

                    {message ? (
                      <div style={{ color: "#d94f3a", fontSize: 12, marginTop: 2 }}>
                        {message}
                      </div>
                    ) : null}

                    {orderItems.length > 0 ? (
                      <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 10 }}>
                        {orderItems.map((it) => {
                          const mi = menuItemById.get(it.menuItemId);
                          const labelText = mi ? `${mi.name} · LKR ${Number(mi.price).toFixed(2)}` : it.menuItemId;
                          return (
                            <div key={it.menuItemId} className="row space" style={{ padding: "6px 4px" }}>
                              <div className="muted" style={{ fontSize: 13 }}>
                                {labelText}
                              </div>
                              <div className="row" style={{ gap: 10 }}>
                                <span style={{ fontWeight: 700 }}>x{it.qty}</span>
                                <button
                                  type="button"
                                  className="btn danger"
                                  style={{ padding: "4px 10px", fontSize: 12 }}
                                  onClick={() => setOrderItems((prev) => prev.filter((p) => p.menuItemId !== it.menuItemId))}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="muted" style={{ fontSize: 12 }}>
                        Add at least one item to create an order.
                      </div>
                    )}
                  </div>
                ) : type === "select" ? (
                  <select className={`select${hasError ? " input-error" : ""}`} {...register(name, rules)}>
                    <option value="">Select</option>
                    {options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : type === "checkbox" ? (
                  <label className="row" style={{ gap: 10, alignItems: "center", marginTop: 6 }}>
                    <input type="checkbox" {...register(name, rules)} />
                    <span className="muted" style={{ fontSize: 13 }}>Mark as veg</span>
                  </label>
                ) : isPayments && name === "refId" && type === "refBy" ? (
                  renderPaymentRefSelect(rules, hasError)
                ) : type === "ref" ? (
                  renderRefSelect(name, options, rules, hasError)
                ) : type === "images" ? (
                  renderImagesField(name, options)
                ) : type === "date" ? (
                  <input
                    className={`input${hasError ? " input-error" : ""}`}
                    type="date"
                    min={isCleaning && name === "scheduledDate" ? cleaningMinDate : undefined}
                    {...register(name, rules)}
                  />
                ) : type === "datetime-local" ? (
                  <input
                    className={`input${hasError ? " input-error" : ""}`}
                    type="datetime-local"
                    min={isCleaning && name === "scheduledAt" ? getNowLocalDateTime() : undefined}
                    step={isCleaning && name === "scheduledAt" ? 60 : undefined}
                    {...register(name, rules)}
                  />
                ) : name === "comment" || name === "notes" ? (
                  <textarea className={`textarea${hasError ? " input-error" : ""}`} {...register(name, rules)} />
                ) : (
                  <input className={`input${hasError ? " input-error" : ""}`} {...register(name, rules)} />
                )}

                  {!isOrders || name !== "items" ? (
                    message ? <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>{message}</p> : null
                  ) : null}
              </div>
              );
            })}
            <div className="row" style={{ gridColumn: "1 / -1" }}>
              <button className="btn primary" disabled={createMut.isPending || updateMut.isPending}>
                {createMut.isPending || updateMut.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {editOpen && editing && canEdit ? (
        <div
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEditModal();
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(27,26,24,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 860, maxHeight: "88vh", overflow: "auto" }}>
            <div className="row space" style={{ marginBottom: 12 }}>
              <h3 className="section-title" style={{ margin: 0 }}>Edit</h3>
              <button type="button" className="btn ghost" onClick={closeEditModal}>Close</button>
            </div>
            <form className="grid two" onSubmit={handleSubmit((v) => updateMut.mutate({ id: editing, values: v }))}>
              {cfg.createFields.map(([name, label, type, options]) => {
                const rules = fieldRules(name, label, type, options);
                const message = errors?.[name]?.message;
                const hasError = !!errors?.[name];

                return (
                  <div key={name}>
                    <label className="muted" style={{ fontSize: 13 }}>{label}</label>
                    {isOrders && name === "items" ? (
                    <div className="muted" style={{ fontSize: 12 }}>Editing order items is not supported here.</div>
                  ) : type === "select" ? (
                    <select className={`select${hasError ? " input-error" : ""}`} {...register(name, rules)}>
                      <option value="">Select</option>
                      {options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : type === "checkbox" ? (
                    <label className="row" style={{ gap: 10, alignItems: "center", marginTop: 6 }}>
                      <input type="checkbox" {...register(name, rules)} />
                      <span className="muted" style={{ fontSize: 13 }}>Mark as veg</span>
                    </label>
                  ) : isPayments && name === "refId" && type === "refBy" ? (
                    renderPaymentRefSelect(rules, hasError)
                  ) : type === "ref" ? (
                    renderRefSelect(name, options, rules, hasError)
                  ) : type === "images" ? (
                    renderImagesField(name, options)
                  ) : type === "date" ? (
                    <input
                      className={`input${hasError ? " input-error" : ""}`}
                      type="date"
                      min={isCleaning && name === "scheduledDate" ? cleaningMinDate : undefined}
                      {...register(name, rules)}
                    />
                  ) : type === "datetime-local" ? (
                    <input
                      className={`input${hasError ? " input-error" : ""}`}
                      type="datetime-local"
                      min={isCleaning && name === "scheduledAt" ? getNowLocalDateTime() : undefined}
                      step={isCleaning && name === "scheduledAt" ? 60 : undefined}
                      {...register(name, rules)}
                    />
                  ) : name === "comment" || name === "notes" ? (
                    <textarea className={`textarea${hasError ? " input-error" : ""}`} {...register(name, rules)} />
                  ) : (
                    <input className={`input${hasError ? " input-error" : ""}`} {...register(name, rules)} />
                  )}

                    {message ? <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>{message}</p> : null}
                </div>
                );
              })}
              <div className="row" style={{ gridColumn: "1 / -1" }}>
                <button className="btn primary" disabled={createMut.isPending || updateMut.isPending}>
                  {createMut.isPending || updateMut.isPending ? "Saving..." : "Update"}
                </button>
                <button type="button" className="btn ghost" onClick={closeEditModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* ── View-details modal ── */}
      {viewRecord ? (
        <div
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setViewRecord(null); }}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(13,27,42,0.60)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 110, padding: 16,
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 600, maxHeight: "88vh", overflow: "auto" }}>
            <div className="row space" style={{ marginBottom: 16 }}>
              <h3 className="section-title" style={{ margin: 0 }}>Record Details</h3>
              <div className="row" style={{ gap: 10 }}>
                {isPayments && viewRecord?._id ? (
                  <>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => downloadInvoicePdf(viewRecord._id, viewRecord.receiptNo)}
                    >
                      Download PDF
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => navigate(`/invoice/${viewRecord._id}`)}
                    >
                      View invoice
                    </button>
                  </>
                ) : null}
                <button type="button" className="btn ghost" onClick={() => setViewRecord(null)}>Close</button>
              </div>
            </div>
            <div style={{ display: "grid", gap: 0 }}>
              {Object.entries(viewRecord)
                .filter(([k]) => k !== "__v")
                .map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontWeight: 600, color: "var(--muted)", fontSize: 12, minWidth: 140, textTransform: "capitalize", lineHeight: 1.6 }}>
                      {k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").toLowerCase()}
                    </span>
                    {k === "images" && Array.isArray(v) && v.length > 0 ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                        {v.map((url, i) => (
                          <img key={i} src={assetUrl(url)} alt="" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: 13, flex: 1, wordBreak: "break-word", color: "var(--ink)" }}>
                        {(() => {
                          if (v == null) return "-";
                          if (typeof v === "boolean") return v ? "Yes" : "No";
                          if (typeof v === "object" && !Array.isArray(v)) {
                            if (v.roomNo) return `Room ${v.roomNo} · ${v.type ?? ""}`;
                            if (v.name) return `${v.name}${v.role ? " · " + v.role : ""}`;
                            return JSON.stringify(v);
                          }
                          if (Array.isArray(v)) return v.join(", ") || "-";
                          const dateKeys = ["paidAt","createdAt","updatedAt","checkIn","checkOut","scheduledAt","dateTime"];
                          if (dateKeys.includes(k) && typeof v === "string" && !isNaN(Date.parse(v))) {
                            return new Date(v).toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
                          }
                          return String(v);
                        })()}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="card">
        <h3 className="section-title">Records</h3>
        {isLoading ? <div className="muted">Loading...</div> : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                {(cfg.columns ?? []).map((c) => (
                  <th key={c}>{c}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td style={{ fontSize: 12, verticalAlign: "middle" }}>
                    {r.images?.[0] ? (
                      <img src={assetUrl(r.images[0])} alt="" style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 6, display: "block", marginBottom: 4 }} />
                    ) : null}
                    {r._id.slice(-6)}
                  </td>
                  {(cfg.columns ?? []).map((c) => (
                    <td key={c} className="muted" style={{ fontSize: 13 }}>
                      {(() => {
                        const val = r?.[c];
                        if (val == null) return "-";
                        if (typeof val === "object" && !Array.isArray(val)) {
                          if (val.roomNo) return `Room ${val.roomNo}`;
                          if (val.name) return val.name;
                          return val._id ? String(val._id).slice(-6) : "-";
                        }
                        const dateCols = ["paidAt","createdAt","updatedAt","checkIn","checkOut","scheduledAt","dateTime"];
                        if (dateCols.includes(c)) {
                          try { return new Date(val).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
                          catch { return String(val).slice(0, 40); }
                        }
                        return String(val).slice(0, 40);
                      })()}
                    </td>
                  ))}
                  <td style={{ minWidth: 220 }}>
                    <div className="row" style={{ flexWrap: "wrap" }}>
                      {/* View button */}
                      <button
                        className="btn icon"
                        type="button"
                        title="View details"
                        aria-label="View details"
                        onClick={() => setViewRecord(r)}
                      >
                        <Eye size={16} />
                        <span className="sr-only">View</span>
                      </button>
                      {canEdit ? (
                        <button
                          className="btn icon"
                          onClick={() => {
                            setEditing(r._id);
                            setEditOpen(true);
                            setConfirmDeleteId(null);
                            for (const [key] of cfg.createFields) {
                              if (key === "images") continue;
                              const value = r[key];
                              const fieldDef = (cfg.createFields ?? []).find((f) => f?.[0] === key);
                              const fieldType = fieldDef?.[2];
                              if (resource === "cleaning" && (key === "scheduledDate" || key === "scheduledSlot")) {
                                const base = r?.scheduledAt ? new Date(r.scheduledAt).toISOString().slice(0, 16) : "";
                                if (key === "scheduledDate") setValue(key, base ? base.slice(0, 10) : "");
                                if (key === "scheduledSlot") setValue(key, base ? base.slice(11, 16) : "");
                                continue;
                              }
                              if (fieldType === "checkbox") {
                                setValue(key, Boolean(value));
                              } else if (fieldType === "ref") {
                                // When listing endpoints populate refs (objects), selects expect the _id string
                                setValue(key, value && typeof value === "object" ? (value._id ?? "") : (value ?? ""));
                              } else if (fieldType === "datetime-local" && value) {
                                setValue(key, new Date(value).toISOString().slice(0, 16));
                              } else if (fieldType === "date" && value) {
                                setValue(key, String(value).slice(0, 10));
                              } else {
                                setValue(key, Array.isArray(value) ? value.join(", ") : value ?? "");
                              }
                            }

                            if (supportsImages) {
                              setImagesExisting(Array.isArray(r.images) ? r.images.filter(Boolean) : []);
                              setImagesNew((prev) => {
                                prev.forEach((p) => {
                                  try {
                                    if (p?.previewUrl) URL.revokeObjectURL(p.previewUrl);
                                  } catch {
                                    // ignore
                                  }
                                });
                                return [];
                              });
                              setImagesTouched(false);
                            }
                          }}
                          type="button"
                          title="Edit"
                          aria-label="Edit"
                        >
                          <Pencil size={16} />
                          <span className="sr-only">Edit</span>
                        </button>
                      ) : null}
                      {cfg.actions?.includes("cancel") && resource === "bookings" && ["BOOKED", "APPROVED"].includes(r.status) ? (
                        <button
                          className="btn icon"
                          type="button"
                          title="Cancel"
                          aria-label="Cancel"
                          onClick={() => actionMut.mutate({ id: r._id, action: "cancel" })}
                        >
                          <Ban size={16} />
                          <span className="sr-only">Cancel</span>
                        </button>
                      ) : cfg.actions?.includes("cancel") ? (
                        <button
                          className="btn icon"
                          type="button"
                          title="Cancel"
                          aria-label="Cancel"
                          onClick={() => actionMut.mutate({ id: r._id, action: "cancel" })}
                        >
                          <Ban size={16} />
                          <span className="sr-only">Cancel</span>
                        </button>
                      ) : null}

                      {cfg.actions?.includes("approve") && r.status === "BOOKED" ? (
                        <button
                          className="btn icon"
                          type="button"
                          title="Approve"
                          aria-label="Approve"
                          onClick={() => actionMut.mutate({ id: r._id, action: "approve" })}
                        >
                          <Check size={16} />
                          <span className="sr-only">Approve</span>
                        </button>
                      ) : null}

                      {cfg.actions?.includes("reject") && r.status === "BOOKED" ? (
                        <button
                          className="btn icon"
                          type="button"
                          title="Reject"
                          aria-label="Reject"
                          onClick={() => actionMut.mutate({ id: r._id, action: "reject" })}
                        >
                          <X size={16} />
                          <span className="sr-only">Reject</span>
                        </button>
                      ) : null}

                      {cfg.actions?.includes("check-in") && resource === "bookings" && r.status === "APPROVED" ? (
                        <button
                          className="btn icon"
                          type="button"
                          title="Check-in"
                          aria-label="Check-in"
                          onClick={() => actionMut.mutate({ id: r._id, action: "check-in" })}
                        >
                          <LogIn size={16} />
                          <span className="sr-only">Check-in</span>
                        </button>
                      ) : null}
                      {cfg.actions?.includes("check-out") && resource === "bookings" && r.status === "CHECKED_IN" ? (
                        <button
                          className="btn icon"
                          type="button"
                          title="Check-out"
                          aria-label="Check-out"
                          onClick={() => actionMut.mutate({ id: r._id, action: "check-out" })}
                        >
                          <LogOut size={16} />
                          <span className="sr-only">Check-out</span>
                        </button>
                      ) : null}
                      {cfg.actions?.includes("return") ? (
                        <button
                          className="btn icon"
                          type="button"
                          title="Return"
                          aria-label="Return"
                          onClick={() => actionMut.mutate({ id: r._id, action: "return" })}
                        >
                          <Undo2 size={16} />
                          <span className="sr-only">Return</span>
                        </button>
                      ) : null}
                      {cfg.actions?.includes("status") ? (
                        <select
                          className="select"
                          style={{ width: 150 }}
                          defaultValue=""
                          onChange={(e) => {
                            const status = e.target.value;
                            if (!status) return;
                            actionMut.mutate({ id: r._id, action: "status", payload: { status } });
                            e.target.value = "";
                          }}
                        >
                          <option value="">Set status</option>
                          {["PLACED", "PREPARING", "SERVED", "PAID", "CANCELLED"].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : null}
                      {confirmDeleteId === r._id ? (
                        <>
                          <button
                            type="button"
                            className="btn danger icon"
                            onClick={() => {
                              delMut.mutate(r._id);
                              setConfirmDeleteId(null);
                            }}
                            disabled={delMut.isPending}
                            title="Confirm delete"
                            aria-label="Confirm delete"
                          >
                            <Check size={16} />
                            <span className="sr-only">Confirm</span>
                          </button>
                          <button
                            type="button"
                            className="btn ghost icon"
                            onClick={() => setConfirmDeleteId(null)}
                            title="Cancel delete"
                            aria-label="Cancel delete"
                          >
                            <X size={16} />
                            <span className="sr-only">Cancel</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn danger icon"
                          onClick={() => {
                            setConfirmDeleteId(r._id);
                            setEditOpen(false);
                          }}
                          disabled={delMut.isPending}
                          title="Delete"
                          aria-label="Delete"
                        >
                          <Trash2 size={16} />
                          <span className="sr-only">Delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? <tr><td colSpan={colCount} className="muted">No records yet</td></tr> : null}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
