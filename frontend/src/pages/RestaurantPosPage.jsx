import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Minus, Plus, Trash2 } from "lucide-react";
import api, { assetUrl } from "../lib/api";
import { useAuth } from "../lib/auth.jsx";

function money(n) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "LKR 0.00";
  return `LKR ${v.toFixed(2)}`;
}

export default function RestaurantPosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const canUse = user?.role === "ADMIN" || user?.role === "RESTAURANT_STAFF";

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const searchQ = String(searchDebounced ?? "").trim();

  const [orderType, setOrderType] = useState("DINE_IN");
  const [tableNo, setTableNo] = useState("");
  const [roomId, setRoomId] = useState("");
  const [cart, setCart] = useState([]); // { menuItemId, qty }
  const [createdOrder, setCreatedOrder] = useState(null);
  const [createdPayment, setCreatedPayment] = useState(null);

  const menuQ = useQuery({
    queryKey: ["pos", "menu", "available", searchQ],
    enabled: canUse,
    queryFn: async () => (await api.get("/menu", {
      params: {
        limit: 100,
        isAvailable: true,
        ...(searchQ ? { q: searchQ } : {}),
      },
    })).data.data,
  });

  const roomsQ = useQuery({
    queryKey: ["pos", "rooms"],
    enabled: canUse,
    queryFn: async () => (await api.get("/rooms", { params: { limit: 100 } })).data.data,
  });

  const menuItems = useMemo(() => menuQ.data?.items ?? [], [menuQ.data]);
  const rooms = useMemo(() => roomsQ.data?.items ?? [], [roomsQ.data]);

  const menuErrorText = useMemo(() => {
    if (!menuQ.isError) return "";
    const e = menuQ.error;
    const status = e?.response?.status;
    const msg = e?.response?.data?.message || e?.message;
    if (status) return `Menu request failed (${status})${msg ? `: ${msg}` : ""}`;
    return msg ? `Menu request failed: ${msg}` : "Menu request failed";
  }, [menuQ.isError, menuQ.error]);

  const menuById = useMemo(() => {
    const m = new Map();
    menuItems.forEach((it) => m.set(it._id, it));
    return m;
  }, [menuItems]);

  const filteredMenu = useMemo(() => {
    const q = String(searchDebounced ?? "").trim().toLowerCase();
    if (!q) return menuItems;
    return menuItems.filter((it) => {
      const name = String(it?.name ?? "").toLowerCase();
      const cat = String(it?.category ?? "").toLowerCase();
      return name.includes(q) || cat.includes(q);
    });
  }, [menuItems, searchDebounced]);

  const cartRows = useMemo(() => {
    return (Array.isArray(cart) ? cart : [])
      .map((c) => {
        const mi = menuById.get(c.menuItemId);
        const unit = Number(mi?.price ?? 0);
        const qty = Number(c.qty ?? 0);
        const lineTotal = Number.isFinite(unit) && Number.isFinite(qty) ? unit * qty : 0;
        return {
          key: c.menuItemId,
          menuItemId: c.menuItemId,
          name: mi?.name ?? "Menu item",
          image: mi?.images?.[0] ?? null,
          unit,
          qty,
          lineTotal,
        };
      })
      .filter((r) => r.qty > 0);
  }, [cart, menuById]);

  const orderTotal = useMemo(() => cartRows.reduce((s, r) => s + Number(r.lineTotal || 0), 0), [cartRows]);

  const canCreateOrder = cartRows.length > 0 && (
    (orderType === "DINE_IN" ? tableNo.trim().length > 0 : !!roomId)
  );

  const addToCart = (menuItemId) => {
    if (!menuItemId) return;
    setCreatedOrder(null);
    setCreatedPayment(null);
    setCart((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const existing = list.find((x) => x.menuItemId === menuItemId);
      if (existing) {
        return list.map((x) => x.menuItemId === menuItemId ? { ...x, qty: Number(x.qty ?? 0) + 1 } : x);
      }
      return [...list, { menuItemId, qty: 1 }];
    });
  };

  const setQty = (menuItemId, nextQty) => {
    setCart((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const qty = Math.max(0, Math.floor(Number(nextQty) || 0));
      const without = list.filter((x) => x.menuItemId !== menuItemId);
      if (qty <= 0) return without;
      return [...without, { menuItemId, qty }];
    });
  };

  const clearCart = () => {
    setCart([]);
    setCreatedOrder(null);
    setCreatedPayment(null);
  };

  const createOrderMut = useMutation({
    mutationFn: async () => {
      if (!canCreateOrder) throw new Error("Missing order details");
      const items = cartRows.map((r) => ({ menuItemId: r.menuItemId, qty: r.qty }));
      const payload = {
        orderType,
        items,
        ...(orderType === "DINE_IN" ? { tableNo: tableNo.trim() } : { roomId }),
      };
      return (await api.post("/orders", payload)).data.data;
    },
    onSuccess: (order) => {
      toast.success("Order created");
      setCreatedOrder(order);
      setCreatedPayment(null);
      setCart([]);
      setTableNo("");
      setRoomId("");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? e?.message ?? "Order failed"),
  });

  const takeCashPaymentMut = useMutation({
    mutationFn: async () => {
      if (!createdOrder?._id) throw new Error("No order to pay");
      const amount = Number(createdOrder?.total ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid order total");

      return (await api.post("/payments", {
        payableType: "RESTAURANT",
        refId: createdOrder._id,
        amount,
        method: "CASH",
      })).data.data;
    },
    onSuccess: (payment) => {
      toast.success("Payment recorded (CASH)");
      setCreatedPayment(payment);
      setCreatedOrder((prev) => prev ? { ...prev, status: "PAID", paymentId: payment?._id } : prev);
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? e?.message ?? "Payment failed"),
  });

  if (!canUse) {
    return (
      <div className="card">
        <h3 className="section-title">Restaurant POS</h3>
        <div className="muted">You do not have access to this area.</div>
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="row space">
          <div>
            <h2 className="page-hero-title">Restaurant POS</h2>
            <div className="muted page-hero-sub">Create orders and record CASH payments</div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <Link to="/orders" className="btn">View Orders</Link>
            <Link to="/payments" className="btn">View Payments</Link>
          </div>
        </div>
      </div>

      <div className="grid two" style={{ alignItems: "start", gap: 16 }}>
        {/* Menu */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="row space" style={{ marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 800 }}>Menu</div>
              <div className="muted" style={{ fontSize: 12 }}>Tap an item to add</div>
            </div>
            <input
              className="input"
              placeholder="Search items"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 260 }}
            />
          </div>

          {menuQ.isLoading ? <div className="muted">Loading menu…</div> : null}
          {menuQ.isError ? <div className="muted">{menuErrorText || "Could not load menu."}</div> : null}

          <div className="grid two" style={{ gap: 12 }}>
            {filteredMenu.map((it) => (
              <button
                key={it._id}
                type="button"
                className="card"
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  padding: 12,
                  display: "grid",
                  gap: 8,
                }}
                onClick={() => addToCart(it._id)}
                title="Add to cart"
              >
                <div className="row space" style={{ gap: 10, alignItems: "center" }}>
                  <div className="row" style={{ gap: 10, alignItems: "center" }}>
                    {it.images?.[0] ? (
                      <img
                        src={assetUrl(it.images[0])}
                        alt=""
                        style={{ width: 42, height: 32, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
                      />
                    ) : null}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{it.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{it.category ?? ""}</div>
                    </div>
                  </div>
                  <div className="accent-price" style={{ fontWeight: 900 }}>{money(it.price)}</div>
                </div>
              </button>
            ))}

            {!menuQ.isLoading && filteredMenu.length === 0 ? (
              <div className="muted">No items found.</div>
            ) : null}
          </div>
        </div>

        {/* Cart / Checkout */}
        <div className="card" style={{ position: "sticky", top: 16 }}>
          <div className="row space" style={{ marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 800 }}>Current Order</div>
              <div className="muted" style={{ fontSize: 12 }}>Build the cart and submit</div>
            </div>
            <button className="btn danger" type="button" onClick={clearCart} disabled={cartRows.length === 0 && !createdOrder}>
              Clear
            </button>
          </div>

          <div className="grid" style={{ gap: 12, marginBottom: 14 }}>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Order type</label>
              <select
                className="select"
                value={orderType}
                onChange={(e) => {
                  const next = e.target.value;
                  setOrderType(next);
                  setTableNo("");
                  setRoomId("");
                }}
                disabled={createOrderMut.isPending || !!createdOrder}
              >
                <option value="DINE_IN">DINE_IN</option>
                <option value="ROOM_SERVICE">ROOM_SERVICE</option>
              </select>
            </div>

            {orderType === "DINE_IN" ? (
              <div>
                <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Table number</label>
                <input
                  className="input"
                  placeholder="e.g. T12"
                  value={tableNo}
                  onChange={(e) => setTableNo(e.target.value)}
                  disabled={createOrderMut.isPending || !!createdOrder}
                />
              </div>
            ) : (
              <div>
                <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Deliver to room</label>
                <select
                  className="select"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  disabled={createOrderMut.isPending || !!createdOrder}
                >
                  <option value="">— choose room —</option>
                  {rooms.map((r) => (
                    <option key={r._id} value={r._id}>Room {r.roomNo} · {r.type} · {r.status}</option>
                  ))}
                </select>
                {roomsQ.isLoading ? <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Loading rooms…</div> : null}
              </div>
            )}
          </div>

          {cartRows.length > 0 ? (
            <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
              {cartRows.map((r) => (
                <div
                  key={r.key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                    padding: "10px 12px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.name}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>{money(r.unit)} each</div>
                  </div>

                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <button className="btn icon" type="button" onClick={() => setQty(r.menuItemId, r.qty - 1)}>
                      <Minus size={16} />
                    </button>
                    <div style={{ width: 28, textAlign: "center", fontWeight: 900 }}>{r.qty}</div>
                    <button className="btn icon" type="button" onClick={() => setQty(r.menuItemId, r.qty + 1)}>
                      <Plus size={16} />
                    </button>
                    <button className="btn icon danger" type="button" onClick={() => setQty(r.menuItemId, 0)} title="Remove">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px 12px",
                  background: "linear-gradient(135deg,#fffdf8,#f6ede0)",
                  fontWeight: 900,
                }}
              >
                <span>Total</span>
                <span className="accent-price" style={{ fontSize: 18 }}>{money(orderTotal)}</span>
              </div>
            </div>
          ) : (
            <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>Cart is empty.</div>
          )}

          <button
            className="btn primary"
            type="button"
            disabled={!canCreateOrder || createOrderMut.isPending || !!createdOrder}
            onClick={() => createOrderMut.mutate()}
            style={{ width: "100%", padding: 12 }}
          >
            {createOrderMut.isPending ? "Creating…" : "Create Order"}
          </button>

          {createdOrder ? (
            <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Last Created</div>
              <div className="muted" style={{ fontSize: 13 }}>Order ID: {String(createdOrder._id ?? "").slice(-6)}</div>
              <div className="muted" style={{ fontSize: 13 }}>Status: {createdOrder.status}</div>
              <div className="muted" style={{ fontSize: 13 }}>Total: {money(createdOrder.total)}</div>

              <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() => navigate(`/orders`)}
                >
                  Open Orders
                </button>

                <button
                  className="btn primary"
                  type="button"
                  disabled={createdOrder.status === "PAID" || !!createdOrder.paymentId || takeCashPaymentMut.isPending}
                  onClick={() => takeCashPaymentMut.mutate()}
                >
                  {takeCashPaymentMut.isPending ? "Recording…" : "Take CASH Payment"}
                </button>

                {createdPayment?._id ? (
                  <button className="btn" type="button" onClick={() => navigate(`/invoice/${createdPayment._id}`)}>
                    View Invoice
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
