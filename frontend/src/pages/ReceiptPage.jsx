import React from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, Printer } from "lucide-react";
import api from "../lib/api";

export default function ReceiptPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const autoPrint = sp.get("print") === "1";

  const { data: payment, isLoading } = useQuery({
    queryKey: ["payment", id],
    enabled: !!id,
    queryFn: async () => (await api.get(`/payments/${id}`)).data.data,
  });

  React.useEffect(() => {
    if (!autoPrint) return;
    if (!payment) return;
    const t = setTimeout(() => window.print(), 200);
    return () => clearTimeout(t);
  }, [autoPrint, payment]);

  return (
    <div className="container" style={{ padding: "24px 0" }}>
      <div className="card" style={{ maxWidth: 760, margin: "0 auto" }}>
        <div className="card-head" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileText size={22} className="icon-accent" />
            <div>
              <h3 className="section-title" style={{ marginBottom: 2 }}>Receipt</h3>
              <div className="muted" style={{ fontSize: 12 }}>#{payment?.receiptNo ?? "—"}</div>
            </div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <Link className="btn" to="/customer?tab=payments">Back</Link>
            <button className="btn primary" type="button" onClick={() => window.print()} disabled={!payment}>
              <Printer size={16} /> Print
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="muted">Loading receipt…</div>
        ) : !payment ? (
          <div className="muted">Receipt not found.</div>
        ) : (
          <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
            {[
              ["Receipt", payment.receiptNo],
              ["Type", payment.payableType],
              ["Method", payment.method],
              ["Reference", payment.refId ?? "—"],
              ["Paid At", new Date(payment.paidAt).toLocaleString()],
            ].map(([label, val]) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between",
                padding: "10px 14px",
                borderBottom: "1px solid var(--border)",
                fontSize: 14,
              }}>
                <span className="muted">{label}</span>
                <span style={{ fontWeight: 600, textAlign: "right" }}>{val}</span>
              </div>
            ))}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 14px",
              background: "linear-gradient(135deg,#fffdf8,#f6ede0)",
            }}>
              <span style={{ fontWeight: 700 }}>Total Paid</span>
              <span className="accent-price" style={{ fontWeight: 700, fontSize: 18 }}>
                LKR {Number(payment.amount).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
