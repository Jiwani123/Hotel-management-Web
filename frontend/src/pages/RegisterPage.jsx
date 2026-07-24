import React from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../lib/api";

export default function RegisterPage() {
  const nav = useNavigate();
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values) => {
    try {
      await api.post("/auth/register", values);
      toast.success("Account created. Please login.");
      nav("/login");
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Registration failed");
    }
  };

  return (
    <div className="card" style={{ maxWidth: 520, margin: "40px auto" }}>
      <h2 className="page-hero-title" style={{ marginTop: 0 }}>Create Account</h2>
      <p className="muted">Join Coconut Republik to manage your bookings.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="grid">
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
            type="email"
            {...register("email", {
              required: "Email is required",
              pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address" },
            })}
          />
          {errors.email && <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>{errors.email.message}</p>}
        </div>
        <div>
          <label className="muted">Password</label>
          <input
            className={`input${errors.password ? " input-error" : ""}`}
            type="password"
            {...register("password", {
              required: "Password is required",
              minLength: { value: 6, message: "Password must be at least 6 characters" },
            })}
          />
          {errors.password && <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>{errors.password.message}</p>}
        </div>
        <button className="btn primary" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Register"}
        </button>
      </form>
    </div>
  );
}
