import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";

function isoDate(d) {
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const today = useMemo(() => new Date(), []);
  const defaultTo = isoDate(today);
  const defaultFrom = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 29);
    return isoDate(d);
  }, [today]);

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const params = useMemo(() => ({ from, to }), [from, to]);

  const { data: dash, isLoading } = useQuery({
    queryKey: ["reports-dashboard", from, to],
    queryFn: async () => (await api.get("/reports/dashboard", { params })).data.data,
  });

  const revenueByDay = dash?.revenueByDay ?? [];
  const maxDay = Math.max(1, ...revenueByDay.map((d) => Number(d.total ?? 0)));

  const exportCsv = async (type) => {
    const url = `/reports/export/${type}`;
    const res = await api.get(url, { params, responseType: "blob" });
    const stamp = `${from}_to_${to}`;
    downloadBlob(res.data, `${type}_${stamp}.csv`);
  };

  return (
    <div className="grid">
      <div className="card">
        <h2 className="page-hero-title">Reports</h2>
        <div className="muted page-hero-sub">Analytics, exports, and invoice reporting for admins.</div>

        <div className="row" style={{ gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>From</div>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>To</div>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div style={{ flex: 1 }} />
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <button className="btn" type="button" onClick={() => exportCsv("payments")}>Download payments CSV</button>
            <button className="btn" type="button" onClick={() => exportCsv("bookings")}>Download bookings CSV</button>
            <button className="btn" type="button" onClick={() => exportCsv("orders")}>Download orders CSV</button>
          </div>
        </div>
      </div>

      <div className="grid two">
        <div className="card">
          <h3 className="section-title">KPIs</h3>
          {isLoading ? (
            <div className="muted">Loading analytics…</div>
          ) : (
            <div className="grid two" style={{ gap: 12 }}>
              <div className="card" style={{ margin: 0 }}>
                <div className="muted" style={{ fontSize: 12 }}>Revenue</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>LKR {Number(dash?.kpis?.revenue ?? 0).toFixed(2)}</div>
              </div>
              <div className="card" style={{ margin: 0 }}>
                <div className="muted" style={{ fontSize: 12 }}>Payments</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{dash?.kpis?.paymentsCount ?? 0}</div>
              </div>
              <div className="card" style={{ margin: 0 }}>
                <div className="muted" style={{ fontSize: 12 }}>Active stays</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{dash?.kpis?.activeStays ?? 0}</div>
              </div>
              <div className="card" style={{ margin: 0 }}>
                <div className="muted" style={{ fontSize: 12 }}>Avg rating</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{Number(dash?.kpis?.avgRating ?? 0).toFixed(2)} / 5</div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="section-title">Revenue Summary</h3>
          <table className="table">
            <thead>
              <tr><th>Type</th><th>Count</th><th>Total</th></tr>
            </thead>
            <tbody>
              {(dash?.revenueByType ?? []).map((r) => (
                <tr key={r._id}>
                  <td>{r._id}</td>
                  <td>{r.count}</td>
                  <td>LKR {Number(r.total ?? 0).toFixed(2)}</td>
                </tr>
              ))}
              {(!dash?.revenueByType || dash.revenueByType.length === 0) ? (
                <tr><td colSpan="3" className="muted">No data yet</td></tr>
              ) : null}
            </tbody>
          </table>

          <div style={{ marginTop: 14 }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Revenue by day</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 92, padding: 10, border: "1px solid var(--border)", borderRadius: 14, overflowX: "auto" }}>
              {(revenueByDay ?? []).length === 0 ? (
                <div className="muted">No activity in selected range.</div>
              ) : (
                revenueByDay.map((d) => (
                  <div key={d.date} title={`${d.date}: LKR ${Number(d.total ?? 0).toFixed(2)}`} style={{ width: 14, minWidth: 14 }}>
                    <div style={{ height: Math.max(4, Math.round((Number(d.total ?? 0) / maxDay) * 72)), borderRadius: 8, background: "var(--accent-2)" }} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid two">
        <div className="card">
          <h3 className="section-title">Top Menu Items</h3>
          <table className="table">
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Revenue</th></tr>
            </thead>
            <tbody>
              {(dash?.topMenuItems ?? []).map((r) => (
                <tr key={r._id}>
                  <td>{r.name ?? String(r._id).slice(-6)}</td>
                  <td>{r.qty}</td>
                  <td>LKR {Number(r.revenue ?? 0).toFixed(2)}</td>
                </tr>
              ))}
              {(!dash?.topMenuItems || dash.topMenuItems.length === 0) ? (
                <tr><td colSpan="3" className="muted">No data yet</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 className="section-title">Feedback Ratings</h3>
          <div className="row" style={{ flexWrap: "wrap" }}>
            {(dash?.feedback?.distribution ?? []).map((r) => (
              <span className="chip" key={r._id}>Rating {r._id}: {r.count}</span>
            ))}
            {(!dash?.feedback?.distribution || dash.feedback.distribution.length === 0) ? (
              <span className="muted">No ratings yet</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
