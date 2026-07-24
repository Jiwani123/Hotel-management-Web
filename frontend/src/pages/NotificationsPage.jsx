import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../lib/api";

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

export default function NotificationsPage() {
  const qc = useQueryClient();

  const exportCsv = async () => {
    try {
      const res = await api.get("/reports/export/notifications", { responseType: "blob" });
      const cd = res.headers?.["content-disposition"];
      const filename = filenameFromContentDisposition(cd) || "notifications.csv";
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      downloadBlob(blob, filename);
      toast.success("Export started");
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Export failed");
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications")).data.data,
  });

  const rows = data?.items ?? [];

  const readMut = useMutation({
    mutationFn: async (id) => (await api.patch(`/notifications/${id}/read`)).data,
    onSuccess: () => {
      toast.success("Marked as read");
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Update failed"),
  });

  const readAllMut = useMutation({
    mutationFn: async () => (await api.patch("/notifications/read-all")).data,
    onSuccess: () => {
      toast.success("All read");
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Update failed"),
  });

  return (
    <div className="grid">
      <div className="card">
        <div className="row space">
          <div>
            <h2 className="page-hero-title">Notifications</h2>
            <div className="muted page-hero-sub">Operational alerts and system updates.</div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn" type="button" onClick={exportCsv}>Export CSV</button>
            <button className="btn" onClick={() => readAllMut.mutate()} disabled={readAllMut.isPending}>Mark all read</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Inbox</h3>
        {isLoading ? <div className="muted">Loading...</div> : (
          <div className="grid">
            {rows.map((n) => (
              <div key={n._id} className="card">
                <div className="row space">
                  <div>
                    <div style={{ fontWeight: 700 }}>{n.title}</div>
                    <div className="muted">{n.message}</div>
                  </div>
                  <div className="row">
                    <span className="chip">{n.type}</span>
                    {n.readAt ? <span className="chip">Read</span> : <span className="chip">Unread</span>}
                    {!n.readAt ? (
                      <button className="btn" onClick={() => readMut.mutate(n._id)} disabled={readMut.isPending}>Mark read</button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            {rows.length === 0 ? <div className="muted">No notifications yet</div> : null}
          </div>
        )}
      </div>
    </div>
  );
}
