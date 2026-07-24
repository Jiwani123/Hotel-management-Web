import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BedDouble, CalendarCheck2, CreditCard, MessageSquare,
  ClipboardList, Star, X, FileText, ChevronRight, LogOut, Clock, ShoppingCart,
} from "lucide-react";
import api, { assetUrl } from "../lib/api";
import { useAuth } from "../lib/auth.jsx";

const CART_KEY = "hms_cart_v1";
const WISHLIST_KEY = "hms_wishlist_v1";

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(Array.isArray(items) ? items : []));
  } catch {
    // ignore
  }
}

function readWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeWishlist(ids) {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(Array.isArray(ids) ? ids : []));
  } catch {
    // ignore
  }
}

const TABS = [
  { id: "overview",     label: "Overview",     icon: BedDouble },
  { id: "bookings",     label: "Bookings",      icon: CalendarCheck2 },
  { id: "reservations", label: "Reservations",  icon: Clock },
  { id: "orders",       label: "Room Service",  icon: ClipboardList },
  { id: "payments",     label: "Payments",      icon: CreditCard },
  { id: "feedback",     label: "Feedback",      icon: MessageSquare },
];

const STATUS_MAP = {
  // Bookings
  BOOKED:      { bg: "#fef9c3", color: "#713f12" }, // pending
  APPROVED:    { bg: "#d1fadf", color: "#14532d" },
  REJECTED:    { bg: "#fee2e2", color: "#7f1d1d" },
  // Legacy / UI aliases
  CONFIRMED:   { bg: "#d1fadf", color: "#14532d" },
  PENDING:     { bg: "#fef9c3", color: "#713f12" },
  CANCELLED:   { bg: "#fee2e2", color: "#7f1d1d" },
  CHECKED_IN:  { bg: "#dbeafe", color: "#1e3a5f" },
  CHECKED_OUT: { bg: "#f3e8ff", color: "#4c1d95" },
  COMPLETED:   { bg: "#d1fadf", color: "#14532d" },
  PREPARING:   { bg: "#fef3c7", color: "#713f12" },
  DELIVERED:   { bg: "#d1fadf", color: "#14532d" },
  SEATED:      { bg: "#dbeafe", color: "#1e3a5f" },
  // Table reservations
  ARRIVED:     { bg: "#dbeafe", color: "#1e3a5f" },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 999,
      background: s.bg, color: s.color, fontSize: 12, fontWeight: 700,
    }}>{status}</span>
  );
}

function StarRating({ value, onChange }) {
  return (
    <div className="row" style={{ gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
        >
          <Star
            size={22}
            fill={n <= value ? "var(--accent-2)" : "none"}
            stroke={n <= value ? "var(--accent-2)" : "#d1b89a"}
          />
        </button>
      ))}
    </div>
  );
}

function InvoiceModal({ payment, onClose }) {
  if (!payment) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(27,26,24,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99,
    }}>
      <div className="card" style={{ width: "100%", maxWidth: 460, position: "relative" }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer",
        }}>
          <X size={18} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <FileText size={22} className="icon-accent" />
          <div>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 18, fontWeight: 700 }}>Invoice</div>
            <div className="muted" style={{ fontSize: 12 }}>Receipt #{payment.receiptNo}</div>
          </div>
        </div>
        <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
          {[
            ["Payment Type", payment.payableType],
            ["Method", payment.method],
            ["Reference", payment.refId ?? "—"],
            ["Paid At", new Date(payment.paidAt).toLocaleString()],
          ].map(([label, val]) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between",
              padding: "10px 14px", borderBottom: "1px solid var(--border)", fontSize: 14,
            }}>
              <span className="muted">{label}</span>
              <span style={{ fontWeight: 600 }}>{val}</span>
            </div>
          ))}
          <div style={{
            display: "flex", justifyContent: "space-between",
            padding: "12px 14px", background: "linear-gradient(135deg,#fffdf8,#f6ede0)",
          }}>
            <span style={{ fontWeight: 700 }}>Total Paid</span>
            <span className="accent-price" style={{ fontWeight: 700, fontSize: 18 }}>
              LKR {Number(payment.amount).toFixed(2)}
            </span>
          </div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <Link className="btn" style={{ flex: 1 }} to={`/customer/receipt/${payment._id}`}>Open receipt</Link>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function PaymentPortalModal({ target, onClose, onPaid }) {
  const enabled = !!target?.payableType && !!target?.refId;
  const [method, setMethod] = useState(target?.defaultMethod ?? "CARD");

  const { data: quote, isLoading } = useQuery({
    queryKey: ["payment-portal-quote", target?.payableType, target?.refId],
    enabled,
    queryFn: async () => (await api.get("/payments/portal/quote", {
      params: { payableType: target.payableType, refId: target.refId },
    })).data.data,
  });

  const payMut = useMutation({
    mutationFn: async () => {
      if (method === "PAY_ON_PICKUP") {
        await api.post("/payments/portal/option", {
          payableType: target.payableType,
          refId: target.refId,
          option: "PAY_ON_PICKUP",
        });
        return { saved: true };
      }

      // Persist intent and redirect to real gateway
      await api.post("/payments/portal/option", {
        payableType: target.payableType,
        refId: target.refId,
        option: "CARD",
      });
      const session = (await api.post("/payments/portal/checkout", {
        payableType: target.payableType,
        refId: target.refId,
      })).data.data;
      if (!session?.url) throw new Error("Missing checkout URL");
      window.location.href = session.url;
      return null;
    },
    onSuccess: (payment) => {
      if (!payment) return;
      toast.success(method === "PAY_ON_PICKUP" ? "Saved: Pay on pickup" : "Payment recorded");
      onPaid?.(payment);
      onClose?.();
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Payment failed"),
  });

  if (!enabled) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(27,26,24,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99,
    }}>
      <div className="card" style={{ width: "100%", maxWidth: 520, position: "relative" }}>
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer" }}
          aria-label="Close"
          type="button"
        >
          <X size={18} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <CreditCard size={22} className="icon-accent" />
          <div>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 18, fontWeight: 700 }}>Payment Portal</div>
            <div className="muted" style={{ fontSize: 12 }}>Server-calculated total</div>
          </div>
        </div>

        {isLoading ? (
          <div className="muted">Calculating total…</div>
        ) : (
          <>
            <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
              {[
                ["Type", quote?.payableType ?? target.payableType],
                ["Reference", quote?.refId ?? target.refId],
                ["Item", quote?.summary?.title ?? "—"],
                ["Status", quote?.summary?.status ?? "—"],
              ].map(([label, val]) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "10px 14px", borderBottom: "1px solid var(--border)", fontSize: 14,
                }}>
                  <span className="muted">{label}</span>
                  <span style={{ fontWeight: 600, marginLeft: 14, textAlign: "right" }}>{val}</span>
                </div>
              ))}
              <div style={{
                display: "flex", justifyContent: "space-between",
                padding: "12px 14px", background: "linear-gradient(135deg,#fffdf8,#f6ede0)",
              }}>
                <span style={{ fontWeight: 700 }}>Amount</span>
                <span className="accent-price" style={{ fontWeight: 700, fontSize: 18 }}>
                  LKR {Number(quote?.amount ?? 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="grid" style={{ gap: 12, marginBottom: 14 }}>
              <div>
                <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Payment method</label>
                <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="PAY_ON_PICKUP">Pay on pickup</option>
                  <option value="CARD">Pay by card</option>
                </select>
                {method === "CARD" ? (
                  <div className="footer-note" style={{ marginTop: 6 }}>
                    You’ll be redirected to a secure Stripe Checkout page.
                  </div>
                ) : (
                  <div className="footer-note" style={{ marginTop: 6 }}>
                    No online payment will be taken now.
                  </div>
                )}
              </div>
            </div>

            <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
              <button className="btn" type="button" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn primary"
                type="button"
                disabled={payMut.isPending || Number(quote?.amount ?? 0) <= 0}
                onClick={() => payMut.mutate()}
              >
                {payMut.isPending ? "Processing…" : method === "PAY_ON_PICKUP" ? "Save option" : "Continue to checkout"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CartCheckoutModal({
  onClose,
  orderItems,
  itemsById,
  orderTotal,
  eligibleBookings,
  onCreateAndPay,
}) {
  const [roomId, setRoomId] = useState("");
  const [method, setMethod] = useState("CARD");

  const itemRows = (Array.isArray(orderItems) ? orderItems : []).map((it) => {
    const mi = itemsById.get(it.menuItemId);
    const unitPrice = Number(mi?.price ?? 0);
    const lineTotal = unitPrice * Number(it?.qty ?? 0);
    return {
      key: it.menuItemId,
      name: mi?.name ?? "Menu item",
      qty: Number(it?.qty ?? 0),
      lineTotal,
    };
  });

  const canCheckout = itemRows.length > 0 && !!roomId;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(27,26,24,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99,
    }}>
      <div className="card" style={{ width: "100%", maxWidth: 560, position: "relative" }}>
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer" }}
          aria-label="Close"
          type="button"
        >
          <X size={18} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <ShoppingCart size={22} className="icon-accent" />
          <div>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 18, fontWeight: 700 }}>Checkout</div>
            <div className="muted" style={{ fontSize: 12 }}>Restaurant order · Review details before payment</div>
          </div>
        </div>

        <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
            <span className="muted">Payment type</span>
            <span style={{ fontWeight: 700 }}>Restaurant (Room Service)</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
            <span className="muted">Items</span>
            <span style={{ fontWeight: 700 }}>{itemRows.reduce((s, r) => s + r.qty, 0)} item(s)</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "linear-gradient(135deg,#fffdf8,#f6ede0)" }}>
            <span style={{ fontWeight: 700 }}>Total</span>
            <span className="accent-price" style={{ fontWeight: 700, fontSize: 18 }}>LKR {Number(orderTotal ?? 0).toFixed(2)}</span>
          </div>
        </div>

        {itemRows.length > 0 ? (
          <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
            {itemRows.map((r) => (
              <div key={r.key} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{r.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>Qty: {r.qty}</div>
                </div>
                <div style={{ fontWeight: 800 }}>LKR {Number(r.lineTotal).toFixed(2)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 14, marginBottom: 14 }}>Your cart is empty.</div>
        )}

        <div className="grid" style={{ gap: 12, marginBottom: 14 }}>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Deliver to room</label>
            <select className="select" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">— choose room —</option>
              {eligibleBookings.map((b) => (
                <option key={b._id} value={b.roomId?._id ?? b.roomId}>
                  Room {b.roomId?.roomNo ?? b.roomId}
                </option>
              ))}
            </select>
            {eligibleBookings.length === 0 && (
              <div className="footer-note" style={{ color: "#a33a2a", marginTop: 6 }}>
                ⚠ You need an approved or active booking to place room service orders.
              </div>
            )}
          </div>

          <div>
            <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Payment method</label>
            <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CARD">Pay by card</option>
              <option value="PAY_ON_PICKUP">Pay on pickup</option>
            </select>
          </div>
        </div>

        <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
          <button className="btn" type="button" onClick={onClose}>Cancel</button>
          <button
            className="btn primary"
            type="button"
            disabled={!canCheckout}
            onClick={() => onCreateAndPay({ roomId, defaultMethod: method })}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerDashboardPage() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const cartSectionRef = useRef(null);
  const wishlistSectionRef = useRef(null);
  const focusedOnceRef = useRef(false);
  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const focus = params.get("focus");
    if (focus === "cart" || focus === "wishlist") return "overview";

    const t = params.get("tab");
    const allowed = new Set(TABS.map((x) => x.id));
    return t && allowed.has(t) ? t : "overview";
  });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [portalTarget, setPortalTarget] = useState(null);
  const [cartCheckoutOpen, setCartCheckoutOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editingReservation, setEditingReservation] = useState(null);
  const [orderItems, setOrderItems] = useState(() => readCart());
  const [wishlistIds, setWishlistIds] = useState(() => readWishlist());
  const [menuItemId, setMenuItemId] = useState("");
  const [qty, setQty] = useState(1);
  const [rating, setRating] = useState(0);
  const feedbackForm = useForm();
  const orderForm = useForm({ mode: "onChange" });
  const bookingForm = useForm({ mode: "onChange" });
  const reservationForm = useForm({ mode: "onChange" });

  // Stripe return: poll until webhook-created payment appears, then refresh UI.
  useEffect(() => {
    const url = new URL(window.location.href);
    const stripeState = url.searchParams.get("stripe");
    const sessionId = url.searchParams.get("session_id");
    if (stripeState !== "success" || !sessionId) return;

    let cancelled = false;
    let tries = 0;

    const poll = async () => {
      tries += 1;
      try {
        const res = await api.get("/payments/portal/stripe/confirm", { params: { sessionId } });
        const data = res.data?.data;
        if (data?.status === "PAID" && data?.payment?._id) {
          if (cancelled) return;
          toast.success("Payment successful");
          setSelectedPayment(data.payment);
          qc.invalidateQueries({ queryKey: ["customer-payments"] });
          qc.invalidateQueries({ queryKey: ["customer-bookings"] });
          qc.invalidateQueries({ queryKey: ["customer-reservations"] });
          qc.invalidateQueries({ queryKey: ["customer-orders"] });

          // Clean URL so it doesn't re-run.
          url.searchParams.delete("stripe");
          url.searchParams.delete("session_id");
          window.history.replaceState({}, "", url.toString());
          return;
        }
      } catch {
        // ignore and retry
      }

      if (!cancelled && tries < 15) {
        setTimeout(poll, 1000);
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [qc]);

  // Deep-link focus from navbar (cart/wishlist)
  useEffect(() => {
    if (focusedOnceRef.current) return;
    const url = new URL(window.location.href);
    const focus = url.searchParams.get("focus");
    if (!focus) return;

    // This link always routes to `tab=overview`, so we can scroll without switching tabs.
    if (tab !== "overview") return;

    // Wait for overview render, then scroll.
    setTimeout(() => {
      if (focus === "cart") cartSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (focus === "wishlist") wishlistSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

      url.searchParams.delete("focus");
      window.history.replaceState({}, "", url.toString());
      focusedOnceRef.current = true;
    }, 0);
  }, [tab]);

  const portalTargetKey = useMemo(() => {
    if (!portalTarget?.payableType || !portalTarget?.refId) return "";
    return `${portalTarget.payableType}:${portalTarget.refId}:${portalTarget.defaultMethod ?? ""}`;
  }, [portalTarget?.payableType, portalTarget?.refId, portalTarget?.defaultMethod]);

  const toDateTimeLocalValue = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    return dt.toISOString().slice(0, 16);
  };

  const toDateValue = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toISOString().slice(0, 10);
  };

  useEffect(() => {
    // keep local cart in sync with the order builder
    writeCart(orderItems);
  }, [orderItems]);

  useEffect(() => {
    writeWishlist(wishlistIds);
  }, [wishlistIds]);

  const { data: bookingsData } = useQuery({
    queryKey: ["customer-bookings"],
    queryFn: async () => (await api.get("/bookings")).data.data,
  });
  const { data: reservationsData } = useQuery({
    queryKey: ["customer-reservations"],
    queryFn: async () => (await api.get("/table-reservations")).data.data,
  });
  const { data: paymentsData } = useQuery({
    queryKey: ["customer-payments"],
    queryFn: async () => (await api.get("/payments")).data.data,
  });
  const { data: ordersData } = useQuery({
    queryKey: ["customer-orders"],
    queryFn: async () => (await api.get("/orders")).data.data,
  });
  const { data: menuData } = useQuery({
    queryKey: ["public-menu"],
    queryFn: async () => (await api.get("/public/menu", { params: { limit: 100 } })).data.data,
  });

  const { data: publicFeedbackData } = useQuery({
    queryKey: ["public-feedback"],
    queryFn: async () => (await api.get("/public/feedback", { params: { limit: 6 } })).data.data,
    staleTime: 60 * 1000,
  });

  const bookings     = bookingsData?.items ?? [];
  const reservations = reservationsData?.items ?? [];
  const payments     = paymentsData?.items ?? [];
  const orders       = ordersData?.items ?? [];
  const menuItems    = useMemo(() => menuData?.items ?? [], [menuData]);
  const recentFeedback = publicFeedbackData?.items ?? [];

  const itemsById = useMemo(() => {
    const m = new Map();
    menuItems.forEach((i) => m.set(i._id, i));
    return m;
  }, [menuItems]);

  const cartCount = useMemo(
    () => orderItems.reduce((sum, it) => sum + Number(it?.qty ?? 0), 0),
    [orderItems]
  );

  const wishlistCount = wishlistIds.length;

  const wishlistItems = useMemo(() => {
    return wishlistIds
      .map((id) => itemsById.get(id))
      .filter(Boolean);
  }, [wishlistIds, itemsById]);

  const orderTotal = useMemo(() =>
    orderItems.reduce((sum, it) => {
      const price = itemsById.get(it.menuItemId)?.price ?? 0;
      return sum + price * it.qty;
    }, 0),
  [orderItems, itemsById]);

  const addItem = () => {
    if (!menuItemId || !qty) return;
    const existing = orderItems.find((it) => it.menuItemId === menuItemId);
    if (existing) {
      setOrderItems(orderItems.map((it) =>
        it.menuItemId === menuItemId ? { ...it, qty: it.qty + Number(qty) } : it
      ));
    } else {
      setOrderItems([...orderItems, { menuItemId, qty: Number(qty) }]);
    }
    setMenuItemId("");
    setQty(1);
  };

  const removeItem = (id) => setOrderItems(orderItems.filter((it) => it.menuItemId !== id));

  const clearCart = () => {
    setOrderItems([]);
    writeCart([]);
    toast.success("Cart cleared");
  };

  const removeFromWishlist = (menuItemId) => {
    setWishlistIds((prev) => prev.filter((id) => id !== menuItemId));
  };

  const clearWishlist = () => {
    setWishlistIds([]);
    writeWishlist([]);
    toast.success("Wishlist cleared");
  };

  const moveWishlistToCart = (menuItemId) => {
    if (!menuItemId) return;
    setOrderItems((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const existing = list.find((it) => it.menuItemId === menuItemId);
      if (existing) {
        return list.map((it) => (it.menuItemId === menuItemId ? { ...it, qty: Number(it.qty || 0) + 1 } : it));
      }
      return [...list, { menuItemId, qty: 1 }];
    });
    setWishlistIds((prev) => prev.filter((id) => id !== menuItemId));
    toast.success("Added to cart");
  };

  const createOrderMut = useMutation({
    mutationFn: async (values) => {
      if (!values.roomId) {
        toast.error("Please select a room before placing an order");
        throw new Error("No room selected");
      }
      if (orderItems.length === 0) {
        toast.error("Please add at least one item to your order");
        throw new Error("Empty order");
      }
      return (await api.post("/orders", {
        orderType: "ROOM_SERVICE",
        items: orderItems,
        roomId: values.roomId,
      })).data.data;
    },
    onSuccess: () => {
      toast.success("Order placed! We'll deliver shortly.");
      orderForm.reset();
      setOrderItems([]);
      writeCart([]);
      qc.invalidateQueries({ queryKey: ["customer-orders"] });
    },
    onError: (e) => {
      const msg = e?.response?.data?.message;
      if (msg) toast.error(msg);
    },
  });

  const createFeedbackMut = useMutation({
    mutationFn: async (values) => (await api.post("/feedback", {
      customerName: user?.name,
      bookingId: values.bookingId || undefined,
      comment: values.comment,
      rating,
    })).data.data,
    onSuccess: () => {
      toast.success("Thank you for your feedback!");
      feedbackForm.reset();
      setRating(0);
      qc.invalidateQueries({ queryKey: ["public-feedback"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Feedback submission failed"),
  });

  const cancelBookingMut = useMutation({
    mutationFn: async (id) => (await api.post(`/bookings/${id}/cancel`)).data.data,
    onSuccess: () => {
      toast.success("Booking cancelled successfully");
      qc.invalidateQueries({ queryKey: ["customer-bookings"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Cancellation failed"),
  });

  const updateBookingMut = useMutation({
    mutationFn: async ({ id, values }) => (await api.patch(`/bookings/${id}`, values)).data.data,
    onSuccess: () => {
      toast.success("Booking updated");
      setEditingBooking(null);
      bookingForm.reset();
      qc.invalidateQueries({ queryKey: ["customer-bookings"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Update failed"),
  });

  const deleteBookingMut = useMutation({
    mutationFn: async (id) => (await api.delete(`/bookings/${id}`)).data,
    onSuccess: () => {
      toast.success("Booking deleted");
      qc.invalidateQueries({ queryKey: ["customer-bookings"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Delete failed"),
  });

  const updateReservationMut = useMutation({
    mutationFn: async ({ id, values }) => (await api.patch(`/table-reservations/${id}`, values)).data.data,
    onSuccess: () => {
      toast.success("Reservation updated");
      setEditingReservation(null);
      reservationForm.reset();
      qc.invalidateQueries({ queryKey: ["customer-reservations"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Update failed"),
  });

  const openEditReservation = (r) => {
    setEditingReservation(r);
    reservationForm.reset({
      customerName: r.customerName ?? user?.name ?? "",
      phone: r.phone ?? "",
      partySize: Number(r.partySize ?? 1),
      dateTime: toDateTimeLocalValue(r.dateTime),
    });
  };

  const openEditBooking = (b) => {
    setEditingBooking(b);
    bookingForm.reset({
      customerName: b.customerName ?? user?.name ?? "",
      customerContact: b.customerContact ?? "",
      checkIn: toDateValue(b.checkIn),
      checkOut: toDateValue(b.checkOut),
    });
  };

  const stats = [
    { label: "Active Bookings",       value: bookings.filter((b) => ["APPROVED","CHECKED_IN"].includes(b.status)).length, icon: BedDouble },
    { label: "Upcoming Reservations", value: reservations.filter((r) => r.status !== "CANCELLED").length,                  icon: CalendarCheck2 },
    { label: "Total Spent",           value: `LKR ${payments.reduce((s, p) => s + Number(p.amount), 0).toFixed(2)}`,          icon: CreditCard },
    { label: "Orders Placed",         value: orders.length,                                                                  icon: ClipboardList },
  ];

  return (
    <>
      <InvoiceModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />
      {cartCheckoutOpen ? (
        <CartCheckoutModal
          onClose={() => setCartCheckoutOpen(false)}
          orderItems={orderItems}
          itemsById={itemsById}
          orderTotal={orderTotal}
          eligibleBookings={bookings.filter((b) => b.status === "APPROVED" || b.status === "CHECKED_IN")}
          onCreateAndPay={async ({ roomId, defaultMethod }) => {
            try {
              const created = (await api.post("/orders", {
                orderType: "ROOM_SERVICE",
                items: orderItems,
                roomId,
              })).data.data;

              toast.success("Order placed");
              setOrderItems([]);
              writeCart([]);
              qc.invalidateQueries({ queryKey: ["customer-orders"] });

              setCartCheckoutOpen(false);

              setPortalTarget({ payableType: "RESTAURANT", refId: created._id, defaultMethod });
            } catch (e) {
              toast.error(e?.response?.data?.message ?? "Checkout failed");
            }
          }}
        />
      ) : null}

      {portalTarget ? (
        <PaymentPortalModal
          key={portalTargetKey}
          target={portalTarget}
          onClose={() => setPortalTarget(null)}
          onPaid={() => {
            qc.invalidateQueries({ queryKey: ["customer-payments"] });
            qc.invalidateQueries({ queryKey: ["customer-bookings"] });
            qc.invalidateQueries({ queryKey: ["customer-reservations"] });
            qc.invalidateQueries({ queryKey: ["customer-orders"] });
          }}
        />
      ) : null}

      {editingBooking && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(27,26,24,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99,
        }}>
          <div className="card" style={{ width: "100%", maxWidth: 520, position: "relative" }}>
            <button
              onClick={() => { setEditingBooking(null); bookingForm.reset(); }}
              style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer" }}
              aria-label="Close"
              type="button"
            >
              <X size={18} />
            </button>
            <div className="card-head">
              <h3 className="section-title">Edit Booking</h3>
            </div>

            <form
              className="grid"
              style={{ gap: 14 }}
              onSubmit={bookingForm.handleSubmit((v) => {
                updateBookingMut.mutate({ id: editingBooking._id, values: v });
              })}
            >
              <div className="grid two" style={{ gap: 12 }}>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Check-in</label>
                  <input
                    className={`input${bookingForm.formState.errors.checkIn ? " input-error" : ""}`}
                    type="date"
                    {...bookingForm.register("checkIn", { required: "Check-in date is required" })}
                  />
                  {bookingForm.formState.errors.checkIn && (
                    <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>
                      {bookingForm.formState.errors.checkIn.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Check-out</label>
                  <input
                    className={`input${bookingForm.formState.errors.checkOut ? " input-error" : ""}`}
                    type="date"
                    {...bookingForm.register("checkOut", { required: "Check-out date is required" })}
                  />
                  {bookingForm.formState.errors.checkOut && (
                    <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>
                      {bookingForm.formState.errors.checkOut.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid two" style={{ gap: 12 }}>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Full name</label>
                  <input
                    className={`input${bookingForm.formState.errors.customerName ? " input-error" : ""}`}
                    {...bookingForm.register("customerName", { required: "Name is required", minLength: { value: 2, message: "Name too short" } })}
                  />
                  {bookingForm.formState.errors.customerName && (
                    <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>
                      {bookingForm.formState.errors.customerName.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Contact number</label>
                  <input
                    className={`input${bookingForm.formState.errors.customerContact ? " input-error" : ""}`}
                    type="tel"
                    inputMode="numeric"
                    placeholder="0771234567"
                    onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\s+/g, ""); }}
                    {...bookingForm.register("customerContact", {
                      required: "Contact number is required",
                      pattern: { value: /^0\d{9}$/, message: "Must be 10 digits starting with 0" },
                    })}
                  />
                  {bookingForm.formState.errors.customerContact && (
                    <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>
                      {bookingForm.formState.errors.customerContact.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() => { setEditingBooking(null); bookingForm.reset(); }}
                >
                  Cancel
                </button>
                <button
                  className="btn primary"
                  type="submit"
                  disabled={updateBookingMut.isPending}
                >
                  {updateBookingMut.isPending ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingReservation && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(27,26,24,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99,
        }}>
          <div className="card" style={{ width: "100%", maxWidth: 520, position: "relative" }}>
            <button
              onClick={() => { setEditingReservation(null); reservationForm.reset(); }}
              style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer" }}
              aria-label="Close"
              type="button"
            >
              <X size={18} />
            </button>
            <div className="card-head">
              <h3 className="section-title">Edit Reservation</h3>
            </div>

            <form
              className="grid"
              style={{ gap: 14 }}
              onSubmit={reservationForm.handleSubmit((v) => {
                updateReservationMut.mutate({ id: editingReservation._id, values: v });
              })}
            >
              <div className="grid two" style={{ gap: 12 }}>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Full name</label>
                  <input
                    className={`input${reservationForm.formState.errors.customerName ? " input-error" : ""}`}
                    {...reservationForm.register("customerName", { required: "Name is required", minLength: { value: 2, message: "Name too short" } })}
                  />
                  {reservationForm.formState.errors.customerName && (
                    <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>
                      {reservationForm.formState.errors.customerName.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Contact number</label>
                  <input
                    className={`input${reservationForm.formState.errors.phone ? " input-error" : ""}`}
                    type="tel"
                    inputMode="numeric"
                    placeholder="0771234567"
                    onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\s+/g, ""); }}
                    {...reservationForm.register("phone", {
                      required: "Phone is required",
                      pattern: { value: /^0\d{9}$/, message: "Must be 10 digits starting with 0" },
                    })}
                  />
                  {reservationForm.formState.errors.phone && (
                    <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>
                      {reservationForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid two" style={{ gap: 12 }}>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Date & time</label>
                  <input
                    className={`input${reservationForm.formState.errors.dateTime ? " input-error" : ""}`}
                    type="datetime-local"
                    {...reservationForm.register("dateTime", { required: "Date/time is required" })}
                  />
                  {reservationForm.formState.errors.dateTime && (
                    <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>
                      {reservationForm.formState.errors.dateTime.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Party size</label>
                  <input
                    className={`input${reservationForm.formState.errors.partySize ? " input-error" : ""}`}
                    type="number"
                    min={1}
                    max={50}
                    {...reservationForm.register("partySize", {
                      required: "Party size is required",
                      valueAsNumber: true,
                      min: { value: 1, message: "Minimum 1 guest" },
                      max: { value: 50, message: "Maximum 50 guests" },
                    })}
                  />
                  {reservationForm.formState.errors.partySize && (
                    <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>
                      {reservationForm.formState.errors.partySize.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() => { setEditingReservation(null); reservationForm.reset(); }}
                >
                  Cancel
                </button>
                <button
                  className="btn primary"
                  type="submit"
                  disabled={updateReservationMut.isPending}
                >
                  {updateReservationMut.isPending ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="cust-header">
        <div>
          <div className="cust-greeting">Welcome back,</div>
          <div className="cust-name">{user?.name}</div>
          <div className="muted" style={{ fontSize: 13 }}>{user?.email}</div>
          <div className="row" style={{ marginTop: 10, gap: 10, flexWrap: "wrap" }}>
            <span className="chip">Cart: {cartCount}</span>
            <span className="chip">Wishlist: {wishlistCount}</span>
          </div>
        </div>
        <div className="row">
          <Link to="/guest/book" className="btn primary">Book a Stay</Link>
          <Link to="/guest/reservations" className="btn">Reserve Table</Link>
          <button className="btn ghost" onClick={logout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="cust-stats">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="cust-stat-card" onClick={() => {
              const tabMap = { "Active Bookings": "bookings", "Upcoming Reservations": "reservations", "Total Spent": "payments", "Orders Placed": "orders" };
              if (tabMap[s.label]) setTab(tabMap[s.label]);
            }} style={{ cursor: "pointer" }}>
              <Icon size={20} className="icon-accent" style={{ marginBottom: 8 }} />
              <div className="cust-stat-val">{s.value}</div>
              <div className="muted" style={{ fontSize: 12 }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="cust-tabs">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={tab === t.id ? "cust-tab active" : "cust-tab"}
              onClick={() => setTab(t.id)}
              type="button"
              title={t.label}
              aria-label={t.label}
            >
              <Icon size={15} />
              <span className="sr-only">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="grid two">
          <div className="card">
            <div className="card-head">
              <h3 className="section-title">Recent Bookings</h3>
              <button className="btn ghost sm" onClick={() => setTab("bookings")}>
                View all <ChevronRight size={14} />
              </button>
            </div>
            {bookings.slice(0, 3).map((b) => (
              <div key={b._id} className="cust-row-item">
                <div>
                  <div style={{ fontWeight: 700 }}>Room {b.roomId?.roomNo ?? "—"}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {new Date(b.checkIn).toLocaleDateString()} → {new Date(b.checkOut).toLocaleDateString()}
                  </div>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
            {bookings.length === 0 && (
              <div className="muted" style={{ fontSize: 14 }}>No bookings yet.{" "}
                <Link to="/guest/book" className="accent-link">Book now</Link>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="section-title">Recent Orders</h3>
              <button className="btn ghost sm" onClick={() => setTab("orders")}>
                View all <ChevronRight size={14} />
              </button>
            </div>
            {orders.slice(0, 3).map((o) => (
              <div key={o._id} className="cust-row-item">
                <div>
                  <div style={{ fontWeight: 700 }}>LKR {Number(o.total).toFixed(2)}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <StatusBadge status={o.status} />
              </div>
            ))}
            {orders.length === 0 && <div className="muted" style={{ fontSize: 14 }}>No room service orders yet.</div>}
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="section-title">Reservations</h3>
              <button className="btn ghost sm" onClick={() => setTab("reservations")}>
                View all <ChevronRight size={14} />
              </button>
            </div>
            {reservations.filter((r) => r.status !== "CANCELLED").slice(0, 3).map((r) => (
              <div key={r._id} className="cust-row-item">
                <div>
                  <div style={{ fontWeight: 700 }}>{new Date(r.dateTime).toLocaleString()}</div>
                  <div className="muted" style={{ fontSize: 12 }}>Party of {r.partySize}</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
            {reservations.length === 0 && (
              <div className="muted" style={{ fontSize: 14 }}>No reservations.{" "}
                <Link to="/guest/reservations" className="accent-link">Reserve now</Link>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="section-title">Payment Summary</h3>
              <button className="btn ghost sm" onClick={() => setTab("payments")}>
                View all <ChevronRight size={14} />
              </button>
            </div>
            {payments.slice(0, 3).map((p) => (
              <div key={p._id} className="cust-row-item">
                <div>
                  <div style={{ fontWeight: 700 }}>Receipt #{p.receiptNo}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{p.payableType} · {new Date(p.paidAt).toLocaleDateString()}</div>
                </div>
                <span className="accent-price" style={{ fontWeight: 700 }}>LKR {Number(p.amount).toFixed(2)}</span>
              </div>
            ))}
            {payments.length === 0 && <div className="muted" style={{ fontSize: 14 }}>No payments yet.</div>}
          </div>

          <div className="card" ref={cartSectionRef}>
            <div className="card-head">
              <div>
                <h3 className="section-title" style={{ marginBottom: 2 }}>My Cart</h3>
                <div className="muted" style={{ fontSize: 13 }}>{cartCount} item(s) · LKR {Number(orderTotal).toFixed(2)}</div>
              </div>
              <div className="card-head-actions">
                <button className="btn sm" type="button" onClick={() => setCartCheckoutOpen(true)}>
                  Checkout <ChevronRight size={14} />
                </button>
                <button className="btn ghost sm" type="button" onClick={clearCart} disabled={orderItems.length === 0}>
                  Clear
                </button>
              </div>
            </div>

            {orderItems.length === 0 ? (
              <div className="muted" style={{ fontSize: 14 }}>
                Your cart is empty. <Link to="/guest/dining" className="accent-link">Browse the menu</Link>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {orderItems.slice(0, 3).map((it) => {
                  const mi = itemsById.get(it.menuItemId);
                  return (
                    <div key={it.menuItemId} className="cust-row-item">
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          {mi ? mi.name : "Menu item"} <span className="muted" style={{ fontWeight: 600 }}>×{it.qty}</span>
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {mi ? `${mi.category}${typeof mi.isVeg === "boolean" ? ` · ${mi.isVeg ? "🟢 Veg" : "🔴 Non-veg"}` : ""}` : it.menuItemId}
                        </div>
                      </div>
                      <div className="row" style={{ gap: 10 }}>
                        {mi ? <span className="accent-price" style={{ fontWeight: 800 }}>LKR {Number(mi.price).toFixed(2)}</span> : null}
                        <button className="btn danger xs" type="button" onClick={() => removeItem(it.menuItemId)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
                {orderItems.length > 3 ? (
                  <div className="muted" style={{ fontSize: 12 }}>
                    + {orderItems.length - 3} more item(s) in cart
                  </div>
                ) : null}
                <Link to="/guest/dining" className="btn" style={{ justifySelf: "start" }}>
                  Add more items
                </Link>
              </div>
            )}
          </div>

          <div className="card" ref={wishlistSectionRef}>
            <div className="card-head">
              <div>
                <h3 className="section-title" style={{ marginBottom: 2 }}>Wishlist</h3>
                <div className="muted" style={{ fontSize: 13 }}>{wishlistCount} saved</div>
              </div>
              <div className="card-head-actions">
                <Link to="/guest/dining" className="btn sm">
                  Browse <ChevronRight size={14} />
                </Link>
                <button className="btn ghost sm" type="button" onClick={clearWishlist} disabled={wishlistIds.length === 0}>
                  Clear
                </button>
              </div>
            </div>

            {wishlistItems.length === 0 ? (
              <div className="muted" style={{ fontSize: 14 }}>No saved items yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {wishlistItems.slice(0, 3).map((mi) => (
                  <div key={mi._id} className="cust-row-item">
                    <div className="row" style={{ gap: 8, alignItems: "center" }}>
                      {mi.images?.[0] && (
                        <img src={assetUrl(mi.images[0])} alt=""
                             style={{ width: 40, height: 30, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          {mi.name} {typeof mi.isVeg === "boolean" ? (mi.isVeg ? "🟢" : "🔴") : null}
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>{mi.category}</div>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 10 }}>
                      <button className="btn primary sm" type="button" onClick={() => moveWishlistToCart(mi._id)}>
                        Add
                      </button>
                      <button className="btn danger sm" type="button" onClick={() => removeFromWishlist(mi._id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                {wishlistItems.length > 3 ? (
                  <div className="muted" style={{ fontSize: 12 }}>
                    + {wishlistItems.length - 3} more item(s) saved
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOOKINGS */}
      {tab === "bookings" && (
        <div className="card">
          <div className="card-head">
            <h3 className="section-title">My Bookings</h3>
            <Link to="/guest/book" className="btn primary sm">New Booking</Link>
          </div>
          {bookings.length === 0 ? (
            <div className="muted">No bookings yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Room</th><th>Type</th><th>Check-in</th><th>Check-out</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const linkedPayment = payments.find((p) => String(p.refId) === String(b._id) && p.payableType === "ROOM");
                  const isPaid = !!b.paymentId || !!linkedPayment;
                  return (
                  <tr key={b._id}>
                    <td><strong>{b.roomId?.roomNo ?? "—"}</strong></td>
                    <td>{b.roomId?.type ?? "—"}</td>
                    <td>{new Date(b.checkIn).toLocaleDateString()}</td>
                    <td>{new Date(b.checkOut).toLocaleDateString()}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td>
                      <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                        {isPaid ? (
                          <button
                            className="btn xs"
                            type="button"
                            onClick={() => setSelectedPayment(linkedPayment)}
                            disabled={!linkedPayment}
                            title={linkedPayment ? "View invoice" : "Invoice unavailable"}
                          >
                            Paid
                          </button>
                        ) : (b.status === "APPROVED" || b.status === "CHECKED_IN") ? (
                          <button
                            className="btn primary xs"
                            type="button"
                            onClick={() => setPortalTarget({ payableType: "ROOM", refId: b._id })}
                          >
                            Pay
                          </button>
                          ) : b.paymentOption === "PAY_ON_PICKUP" ? (
                            <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>Pay on pickup</span>
                        ) : null}

                        {b.status === "BOOKED" ? (
                          <>
                            <button className="btn xs" type="button" onClick={() => openEditBooking(b)}>
                              Edit
                            </button>
                            <button
                              className="btn danger xs"
                              type="button"
                              disabled={deleteBookingMut.isPending}
                              onClick={() => {
                                if (window.confirm("Delete this booking request?")) deleteBookingMut.mutate(b._id);
                              }}
                            >
                              Delete
                            </button>
                          </>
                        ) : b.status === "APPROVED" ? (
                          <button
                            className="btn danger xs"
                            onClick={() => cancelBookingMut.mutate(b._id)}
                            disabled={cancelBookingMut.isPending}
                          >
                            Cancel
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* RESERVATIONS */}
      {tab === "reservations" && (
        <div className="card">
          <div className="card-head">
            <h3 className="section-title">My Table Reservations</h3>
            <Link to="/guest/reservations" className="btn primary sm">New Reservation</Link>
          </div>
          {reservations.length === 0 ? (
            <div className="muted">No reservations yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Date & Time</th><th>Party Size</th><th>Contact</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {reservations.map((r) => {
                  const linkedPayment = payments.find((p) => String(p.refId) === String(r._id) && p.payableType === "RESERVATION");
                  const isPaid = !!r.paymentId || !!linkedPayment;
                  return (
                  <tr key={r._id}>
                    <td>{new Date(r.dateTime).toLocaleString()}</td>
                    <td>{r.partySize} guests</td>
                    <td>{r.phone ?? "—"}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>
                      <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                        {isPaid ? (
                          <button
                            className="btn xs"
                            type="button"
                            onClick={() => setSelectedPayment(linkedPayment)}
                            disabled={!linkedPayment}
                            title={linkedPayment ? "View invoice" : "Invoice unavailable"}
                          >
                            Paid
                          </button>
                        ) : r.status === "BOOKED" ? (
                          <button
                            className="btn primary xs"
                            type="button"
                            onClick={() => setPortalTarget({ payableType: "RESERVATION", refId: r._id })}
                          >
                            Pay
                          </button>
                        ) : r.paymentOption === "PAY_ON_PICKUP" ? (
                          <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>Pay on pickup</span>
                        ) : null}

                        {r.status === "BOOKED" ? (
                          <button className="btn xs" type="button" onClick={() => openEditReservation(r)}>
                            Edit
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ORDERS */}
      {tab === "orders" && (
        <div className="grid">
          <div className="card">
            <div className="card-head">
              <h3 className="section-title">My Room Service Orders</h3>
            </div>
            {orders.length === 0 ? (
              <div className="muted">No orders placed yet.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr><th>Placed</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const linkedPayment = payments.find((p) => String(p.refId) === String(o._id) && p.payableType === "RESTAURANT");
                    const isPaid = !!o.paymentId || o.status === "PAID" || !!linkedPayment;
                    return (
                    <tr key={o._id}>
                      <td>{new Date(o.createdAt).toLocaleString()}</td>
                      <td>{(o.items ?? []).length} item(s)</td>
                      <td><strong>LKR {Number(o.total).toFixed(2)}</strong></td>
                      <td><StatusBadge status={o.status} /></td>
                      <td>
                        <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                          {isPaid ? (
                            <button
                              className="btn xs"
                              type="button"
                              onClick={() => setSelectedPayment(linkedPayment)}
                              disabled={!linkedPayment}
                              title={linkedPayment ? "View invoice" : "Invoice unavailable"}
                            >
                              Paid
                            </button>
                          ) : o.paymentOption === "PAY_ON_PICKUP" ? (
                            <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>Pay on pickup</span>
                          ) : (
                            <button
                              className="btn primary xs"
                              type="button"
                              onClick={() => setPortalTarget({ payableType: "RESTAURANT", refId: o._id })}
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="section-title">Place a Room Service Order</h3>
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: -6, marginBottom: 10 }}>
              Your cart is already synced here. Add items from <Link to="/guest/dining" className="accent-link">Dining</Link>.
            </div>
            <form className="grid" onSubmit={orderForm.handleSubmit((v) => createOrderMut.mutate(v))} style={{ gap: 16 }}>
              <div>
                <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Select your room</label>
                <select
                  className={`select${orderForm.formState.errors.roomId ? " input-error" : ""}`}
                  {...orderForm.register("roomId", { required: "Please select a room" })}
                >
                  <option value="">— choose room —</option>
                  {bookings
                    .filter((b) => b.status === "APPROVED" || b.status === "CHECKED_IN")
                    .map((b) => (
                      <option key={b._id} value={b.roomId?._id ?? b.roomId}>
                        Room {b.roomId?.roomNo ?? b.roomId}
                      </option>
                    ))}
                </select>
                {orderForm.formState.errors.roomId && (
                  <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>
                    {orderForm.formState.errors.roomId.message}
                  </p>
                )}
                {bookings.filter((b) => ["APPROVED","CHECKED_IN"].includes(b.status)).length === 0 && (
                  <div className="footer-note" style={{ color: "#a33a2a", marginTop: 6 }}>
                    ⚠ You need an approved or active booking to place room service orders.
                  </div>
                )}
              </div>

              <div className="grid two" style={{ gap: 14 }}>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Menu item</label>
                  <select className="select" value={menuItemId} onChange={(e) => setMenuItemId(e.target.value)}>
                    <option value="">— select item —</option>
                    {menuItems.filter((i) => i.isAvailable).map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name} — LKR {item.price}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Quantity</label>
                  <div className="row">
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      style={{ maxWidth: 100 }}
                    />
                    <button type="button" className="btn" onClick={addItem} disabled={!menuItemId}>
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {orderItems.length > 0 && (
                <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                  {orderItems.map((it) => {
                    const menuItem = itemsById.get(it.menuItemId);
                    return (
                      <div key={it.menuItemId} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 14px", borderBottom: "1px solid var(--border)", fontSize: 14,
                      }}>
                        <div className="row" style={{ gap: 8, alignItems: "center" }}>
                          {menuItem?.images?.[0] && (
                            <img src={assetUrl(menuItem.images[0])} alt=""
                                 style={{ width: 40, height: 30, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
                          )}
                          <div>
                            <strong>{menuItem?.name ?? it.menuItemId}</strong>
                            <span className="muted"> × {it.qty}</span>
                          </div>
                        </div>
                        <div className="row">
                          <span style={{ fontWeight: 700 }}>LKR {((menuItem?.price ?? 0) * it.qty).toFixed(2)}</span>
                          <button type="button" className="btn ghost icon" onClick={() => removeItem(it.menuItemId)}>
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{
                    display: "flex", justifyContent: "space-between", padding: "12px 14px",
                    background: "linear-gradient(135deg,#fffdf8,#f6ede0)", fontWeight: 700,
                  }}>
                    <span>Order Total</span>
                    <span className="accent-price" style={{ fontSize: 18 }}>LKR {orderTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {orderItems.length === 0 && (
                <p style={{ color: "#a37a40", fontSize: 13, textAlign: "center", margin: 0 }}>
                  Add at least one item above to place your order.
                </p>
              )}
              <button
                className="btn primary"
                disabled={createOrderMut.isPending || orderItems.length === 0}
                style={{ width: "100%", padding: 12 }}
              >
                {createOrderMut.isPending ? "Placing Order…" : `Place Order${orderItems.length > 0 ? ` · LKR ${orderTotal.toFixed(2)}` : ""}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENTS */}
      {tab === "payments" && (
        <div className="card">
          <div className="card-head">
            <h3 className="section-title">Payment History</h3>
          </div>
          {payments.length === 0 ? (
            <div className="muted">No payments yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Receipt</th><th>Type</th><th>Method</th><th>Amount</th><th>Paid At</th><th></th></tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td><strong>#{p.receiptNo}</strong></td>
                    <td>{p.payableType}</td>
                    <td>{p.method}</td>
                    <td><strong className="accent-price">LKR {Number(p.amount).toFixed(2)}</strong></td>
                    <td>{new Date(p.paidAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn xs"
                        onClick={() => setSelectedPayment(p)}
                      >
                        Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* FEEDBACK */}
      {tab === "feedback" && (
        <div className="grid" style={{ gap: 12, maxWidth: 920 }}>
          <div className="card" style={{ maxWidth: 560 }}>
            <div className="card-head">
              <h3 className="section-title">Share Your Experience</h3>
            </div>
            <div className="muted" style={{ marginBottom: 16, fontSize: 13 }}>
              Your feedback helps us deliver better experiences.
            </div>
            <form
              className="grid"
              onSubmit={feedbackForm.handleSubmit((v) => {
                if (rating === 0) {
                  feedbackForm.setError("rating", { message: "Please select a star rating." });
                  toast.error("Please select a star rating.");
                  return;
                }
                createFeedbackMut.mutate(v);
              })}
              style={{ gap: 16 }}
            >
              <div>
                <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Linked booking (optional)</label>
                <select className="select" {...feedbackForm.register("bookingId")}>
                  <option value="">— not linked to a specific booking —</option>
                  {bookings.map((b) => (
                    <option key={b._id} value={b._id}>
                      Room {b.roomId?.roomNo ?? "—"} · {new Date(b.checkIn).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="muted" style={{ display: "block", marginBottom: 8, fontSize: 13 }}>
                  Your rating <span style={{ color: "#d94f3a" }}>*</span>
                </label>
                <StarRating
                  value={rating}
                  onChange={(n) => {
                    setRating(n);
                    feedbackForm.clearErrors("rating");
                  }}
                />
                {feedbackForm.formState.errors.rating && (
                  <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>
                    {feedbackForm.formState.errors.rating.message}
                  </p>
                )}
              </div>
              <div>
                <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Your feedback</label>
                <textarea
                  className={`textarea${feedbackForm.formState.errors.comment ? " input-error" : ""}`}
                  rows={4}
                  placeholder="Share your experience with our rooms, dining, staff, or general service…"
                  {...feedbackForm.register("comment", {
                    required: "Please write a short feedback",
                    minLength: { value: 5, message: "Feedback must be at least 5 characters" },
                  })}
                />
                {feedbackForm.formState.errors.comment && (
                  <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>
                    {feedbackForm.formState.errors.comment.message}
                  </p>
                )}
              </div>
              <div>
                <button
                  className="btn primary"
                  disabled={createFeedbackMut.isPending}
                  style={{ width: "100%", padding: 12 }}
                >
                  {createFeedbackMut.isPending ? "Submitting…" : "Submit Feedback"}
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="section-title">Recent Feedback</h3>
            </div>
            {recentFeedback.length === 0 ? (
              <div className="muted" style={{ fontSize: 14 }}>No feedback yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {recentFeedback.map((f) => (
                  <div key={f._id} className="cust-row-item">
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, letterSpacing: "0.03em" }}>
                        {"★".repeat(Number(f.rating) || 0)}{"☆".repeat(Math.max(0, 5 - (Number(f.rating) || 0)))}
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {f.customerName || "Guest"} · {new Date(f.createdAt).toLocaleDateString()}
                      </div>
                      {f.comment ? (
                        <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.55 }}>{f.comment}</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
