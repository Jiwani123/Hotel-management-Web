import React from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Printer } from "lucide-react";
import api from "../lib/api";

function money(n) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "LKR 0.00";
  return `LKR ${v.toFixed(2)}`;
}

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

export default function InvoicePage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const autoPrint = sp.get("print") === "1";

  const { data: inv, isLoading } = useQuery({
    queryKey: ["invoice", id],
    enabled: !!id,
    queryFn: async () => (await api.get(`/reports/invoices/payment/${id}`)).data.data,
  });

  React.useEffect(() => {
    if (!autoPrint) return;
    if (!inv) return;
    const t = setTimeout(() => window.print(), 200);
    return () => clearTimeout(t);
  }, [autoPrint, inv]);

  const downloadPdf = async () => {
    if (!id) return;
    const res = await api.get(`/reports/invoices/payment/${id}/pdf`, { responseType: "blob" });
    const blob = new Blob([res.data], { type: "application/pdf" });
    const filename = filenameFromContentDisposition(res.headers?.["content-disposition"]) || `invoice_${inv?.invoiceNo ?? id}.pdf`;
    downloadBlob(blob, filename);
  };

  return (
    <div className="container" style={{ padding: "24px 0" }}>
      <div className="card" style={{ maxWidth: 920, margin: "0 auto" }}>
        <div className="card-head" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileText size={22} className="icon-accent" />
            <div>
              <h3 className="section-title" style={{ marginBottom: 2 }}>Invoice</h3>
              <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                <div className="muted" style={{ fontSize: 12 }}>#{inv?.invoiceNo ?? "—"}</div>
                {inv ? (
                  <span className="chip">
                    {Number(inv?.totals?.balance ?? 0) <= 0 ? "PAID" : "BALANCE DUE"}
                  </span>
                ) : null}
                {inv?.payableType ? <span className="chip">{inv.payableType}</span> : null}
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <Link className="btn" to="/payments">Back</Link>
            <button className="btn" type="button" onClick={downloadPdf} disabled={!id}>
              <Download size={16} /> Download PDF
            </button>
            <button className="btn primary" type="button" onClick={() => window.print()} disabled={!inv}>
              <Printer size={16} /> Print
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="muted">Loading invoice…</div>
        ) : !inv ? (
          <div className="muted">Invoice not found.</div>
        ) : (
          <>
            <div className="grid two" style={{ gap: 14, marginBottom: 14 }}>
              <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 14 }}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Hotel Management System</div>
                <div className="muted" style={{ fontSize: 12 }}>Official invoice / receipt of payment</div>
                <div style={{ marginTop: 10, fontSize: 13 }}>
                  <div className="row space"><span className="muted">Invoice No</span><strong>{inv.invoiceNo}</strong></div>
                  <div className="row space"><span className="muted">Issued</span><strong>{new Date(inv.issuedAt).toLocaleString()}</strong></div>
                  <div className="row space"><span className="muted">Service</span><strong>{inv.title}</strong></div>
                  <div className="row space"><span className="muted">Method</span><strong>{inv.payment?.method ?? "—"}</strong></div>
                  {inv.payment?.provider ? (
                    <div className="row space"><span className="muted">Provider</span><strong>{inv.payment.provider}</strong></div>
                  ) : null}
                  {inv.payment?.providerRef ? (
                    <div className="row space"><span className="muted">Provider Ref</span><strong style={{ fontFamily: "monospace" }}>{String(inv.payment.providerRef).slice(0, 18)}</strong></div>
                  ) : null}
                </div>
              </div>

              <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 14 }}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Billed To</div>
                <div style={{ fontSize: 13, display: "grid", gap: 6 }}>
                  <div className="row space"><span className="muted">Name</span><strong>{inv.customer?.name ?? "—"}</strong></div>
                  <div className="row space"><span className="muted">Email</span><strong>{inv.customer?.email ?? "—"}</strong></div>
                  {inv.customer?.phone ? (
                    <div className="row space"><span className="muted">Phone</span><strong>{inv.customer.phone}</strong></div>
                  ) : null}
                </div>
              </div>
            </div>

            <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ width: 110 }}>Qty</th>
                    <th style={{ width: 140 }}>Unit</th>
                    <th style={{ width: 140 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(inv.lineItems ?? []).map((li, idx) => (
                    <tr key={idx}>
                      <td>{li.description}</td>
                      <td>{li.qty}</td>
                      <td>{money(li.unitPrice)}</td>
                      <td style={{ fontWeight: 900 }}>{money(li.total)}</td>
                    </tr>
                  ))}
                  {(inv.lineItems ?? []).length === 0 ? (
                    <tr><td colSpan={4} className="muted">No line items.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="grid two" style={{ gap: 14 }}>
              <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 14 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Reference</div>
                <div style={{ fontSize: 13, display: "grid", gap: 6 }}>
                  <div className="row space"><span className="muted">Payable</span><strong>{inv.payableType}</strong></div>
                  <div className="row space"><span className="muted">Ref ID</span><strong style={{ fontFamily: "monospace" }}>{String(inv.refId).slice(-12)}</strong></div>

                  {inv.context?.roomNo ? (
                    <div className="row space"><span className="muted">Room</span><strong>{inv.context.roomNo}{inv.context.roomType ? ` · ${inv.context.roomType}` : ""}</strong></div>
                  ) : null}
                  {inv.context?.checkIn ? (
                    <div className="row space"><span className="muted">Check-in</span><strong>{new Date(inv.context.checkIn).toLocaleDateString()}</strong></div>
                  ) : null}
                  {inv.context?.checkOut ? (
                    <div className="row space"><span className="muted">Check-out</span><strong>{new Date(inv.context.checkOut).toLocaleDateString()}</strong></div>
                  ) : null}

                  {inv.context?.dateTime ? (
                    <div className="row space"><span className="muted">Reservation</span><strong>{new Date(inv.context.dateTime).toLocaleString()}</strong></div>
                  ) : null}
                  {inv.context?.partySize ? (
                    <div className="row space"><span className="muted">Party size</span><strong>{inv.context.partySize}</strong></div>
                  ) : null}

                  {inv.context?.orderType ? (
                    <div className="row space"><span className="muted">Order type</span><strong>{inv.context.orderType}</strong></div>
                  ) : null}
                  {inv.context?.tableNo ? (
                    <div className="row space"><span className="muted">Table</span><strong>{inv.context.tableNo}</strong></div>
                  ) : null}
                </div>
              </div>

              <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 14 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Totals</div>
                <div style={{ fontSize: 13, display: "grid", gap: 8 }}>
                  <div className="row space"><span className="muted">Subtotal</span><strong>{money(inv.totals?.subtotal)}</strong></div>
                  <div className="row space"><span className="muted">Paid</span><strong>{money(inv.totals?.paid)}</strong></div>
                  <div className="row space"><span className="muted">Balance</span><strong>{money(inv.totals?.balance)}</strong></div>
                  <div className="row space" style={{ paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                    <span style={{ fontWeight: 900 }}>Total</span>
                    <span className="accent-price" style={{ fontWeight: 900, fontSize: 18 }}>{money(inv.totals?.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="muted" style={{ fontSize: 12, marginTop: 12 }}>
              Tip: add `?print=1` to auto-open the print dialog.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
