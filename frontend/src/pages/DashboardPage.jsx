import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";

function Stat({ title, value, hint }) {
  return (
    <div className="card">
      <div className="muted" style={{ fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{value}</div>
      {hint ? <div className="footer-note">{hint}</div> : null}
    </div>
  );
}

export default function DashboardPage() {
  const { data: revenue } = useQuery({
    queryKey: ["revenue"],
    queryFn: async () => (await api.get("/reports/revenue")).data.data,
  });

  const { data: occupancy } = useQuery({
    queryKey: ["occupancy"],
    queryFn: async () => (await api.get("/reports/occupancy")).data.data,
  });

  const { data: topMenu } = useQuery({
    queryKey: ["top-menu"],
    queryFn: async () => (await api.get("/reports/top-menu-items")).data.data,
  });

  const { data: ratings } = useQuery({
    queryKey: ["rating-trends"],
    queryFn: async () => (await api.get("/reports/rating-trends")).data.data,
  });

  return (
    <div className="grid">
      <div className="card" style={{ display: "grid", gap: 6 }}>
        <div className="pill">Operations snapshot</div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Daily command center</div>
        <div className="muted">Monitor rooms, dining, and guest sentiment at a glance.</div>
      </div>

      <div className="grid two">
        <Stat title="Total Bookings" value={occupancy?.totalBookings ?? "-"} hint="All historical reservations" />
        <Stat title="Active Stays" value={occupancy?.active ?? "-"} hint="Booked + Checked in" />
        <Stat title="Checked-out" value={occupancy?.checkedOut ?? "-"} hint="Completed stays" />
        <Stat title="Revenue Lines" value={revenue?.length ?? "-"} hint="Room / Restaurant" />
      </div>

      <div className="grid two">
        <div className="card">
          <h3 className="section-title">Revenue Summary</h3>
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

        <div className="card">
          <h3 className="section-title">Top Menu Items</h3>
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
      </div>

      <div className="card">
        <h3 className="section-title">Guest Feedback Trend</h3>
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
  );
}
