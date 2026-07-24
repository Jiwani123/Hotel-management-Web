import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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

const ROLES = ["ADMIN", "RECEPTION", "RESTAURANT_STAFF", "HOUSEKEEPING", "CUSTOMER"];

export default function UsersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);

  const exportCsv = async () => {
    try {
      const res = await api.get("/reports/export/users", { responseType: "blob" });
      const cd = res.headers?.["content-disposition"];
      const filename = filenameFromContentDisposition(cd) || "users.csv";
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      downloadBlob(blob, filename);
      toast.success("Export started");
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Export failed");
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["users", q],
    queryFn: async () => (await api.get("/users", { params: q ? { q } : {} })).data.data,
  });

  const rows = data?.items ?? [];
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: "",
      email: "",
      role: "",
      password: "",
    },
  });

  const createMut = useMutation({
    mutationFn: async (values) => {
      const res = await api.post("/auth/users", values);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success("User created");
      reset();
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Create failed"),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, values }) => {
      const payload = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== ""));
      const res = await api.patch(`/users/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success("User updated");
      reset();
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Update failed"),
  });

  return (
    <div className="grid">
      <div className="card">
        <div className="row space">
          <div>
            <h2 className="page-hero-title">Users</h2>
            <div className="muted page-hero-sub">Manage staff and customer accounts.</div>
          </div>
          <div className="row" style={{ gap: 12 }}>
            <button className="btn" type="button" onClick={exportCsv}>Export CSV</button>
            <input className="input" style={{ width: 240 }} placeholder="Search by name/email" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">{editing ? "Update User" : "Create User"}</h3>
        <form className="grid two" onSubmit={handleSubmit((v) => editing ? updateMut.mutate({ id: editing, values: v }) : createMut.mutate(v))}>
          <div>
            <label className="muted">Name</label>
            <input
              className={`input${errors.name ? " input-error" : ""}`}
              {...register("name", {
                required: editing ? false : "Name is required",
                validate: (v) => {
                  const val = String(v ?? "").trim();
                  if (!val) return editing ? true : "Name is required";
                  return val.length >= 2 || "Name must be at least 2 characters";
                },
              })}
            />
            {errors.name && <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>{errors.name.message}</p>}
          </div>
          <div>
            <label className="muted">Email</label>
            <input
              className={`input${errors.email ? " input-error" : ""}`}
              {...register("email", {
                required: editing ? false : "Email is required",
                validate: (v) => {
                  const val = String(v ?? "").trim();
                  if (!val) return editing ? true : "Email is required";
                  return /^\S+@\S+\.\S+$/.test(val) || "Enter a valid email address";
                },
              })}
            />
            {errors.email && <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>{errors.email.message}</p>}
          </div>
          <div>
            <label className="muted">Role</label>
            <select
              className={`select${errors.role ? " input-error" : ""}`}
              {...register("role", {
                required: editing ? false : "Role is required",
              })}
            >
              <option value="">Select</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {errors.role && <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>{errors.role.message}</p>}
          </div>
          <div>
            <label className="muted">Password</label>
            <input
              className={`input${errors.password ? " input-error" : ""}`}
              type="password"
              {...register("password", {
                required: editing ? false : "Password is required",
                validate: (v) => {
                  const val = String(v ?? "");
                  if (!val) return editing ? true : "Password is required";
                  return val.length >= 6 || "Password must be at least 6 characters";
                },
              })}
            />
            {errors.password && <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>{errors.password.message}</p>}
          </div>
          <div className="row" style={{ gridColumn: "1 / -1" }}>
            <button className="btn primary" disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? "Saving..." : editing ? "Update" : "Create"}
            </button>
            {editing ? (
              <button type="button" className="btn ghost" onClick={() => { reset(); setEditing(null); }}>Cancel</button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="card">
        <h3 className="section-title">Directory</h3>
        {isLoading ? <div className="muted">Loading...</div> : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td>{r.name}</td>
                  <td className="muted">{r.email}</td>
                  <td>{r.role}</td>
                  <td>{r.isActive ? "Active" : "Inactive"}</td>
                  <td>
                    <button
                      className="btn"
                      onClick={() => {
                        setEditing(r._id);
                        setValue("name", r.name ?? "");
                        setValue("email", r.email ?? "");
                        setValue("role", r.role ?? "");
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? <tr><td colSpan="5" className="muted">No users found</td></tr> : null}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
