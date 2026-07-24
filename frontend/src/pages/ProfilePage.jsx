import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../lib/api";

export default function ProfilePage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/users/me")).data.data,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    reset({
      name: data?.name ?? "",
      email: data?.email ?? "",
      password: "",
    });
  }, [data, reset]);

  const updateMut = useMutation({
    mutationFn: async (values) => {
      const payload = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== ""));
      const res = await api.patch("/users/me", payload);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      reset({ password: "" });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Update failed"),
  });

  return (
    <div className="grid">
      <div className="card">
        <h2 className="page-hero-title">Profile</h2>
        <div className="muted page-hero-sub">Manage your personal details and security.</div>
      </div>

      <div className="card">
        <h3 className="section-title">Update details</h3>
        <form className="grid two" onSubmit={handleSubmit((v) => updateMut.mutate(v))}>
          <div>
            <label className="muted">Name</label>
            <input
              className={`input${errors.name ? " input-error" : ""}`}
              {...register("name", {
                required: "Name is required",
                minLength: { value: 2, message: "Name must be at least 2 characters" },
              })}
            />
            {errors.name && <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>{errors.name.message}</p>}
          </div>
          <div>
            <label className="muted">Email</label>
            <input
              className={`input${errors.email ? " input-error" : ""}`}
              {...register("email", {
                required: "Email is required",
                pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address" },
              })}
            />
            {errors.email && <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>{errors.email.message}</p>}
          </div>
          <div>
            <label className="muted">New password</label>
            <input
              className={`input${errors.password ? " input-error" : ""}`}
              type="password"
              {...register("password", {
                validate: (v) => {
                  const val = String(v ?? "");
                  if (!val) return true;
                  return val.length >= 6 || "Password must be at least 6 characters";
                },
              })}
            />
            {errors.password && <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>{errors.password.message}</p>}
          </div>
          <div className="row" style={{ gridColumn: "1 / -1" }}>
            <button className="btn primary" disabled={updateMut.isPending}>
              {updateMut.isPending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
