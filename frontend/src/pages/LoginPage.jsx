import React from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm({
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values) => {
    try {
      const data = await login(values.email, values.password);
      toast.success("Logged in");
      if (data?.user?.role === "CUSTOMER") {
        nav("/customer");
      } else {
        nav("/staff");
      }
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Login failed");
    }
  };

  return (
    <div className="grid" style={{ maxWidth: 880, margin: "40px auto" }}>
      <div className="card">
        <div className="grid two" style={{ alignItems: "center" }}>
          <div>
            <div className="pill">Welcome back!</div>
            <h2 className="page-hero-title" style={{ margin: "10px 0 6px" }}>Luxury Operations Console</h2>
            <p className="muted">Sign in with your staff credentials to manage rooms, dining, and guest services.</p>
            <div className="row" style={{ marginTop: 12 }}>
              <span className="chip">Secure access</span>
              <span className="chip">Role-based controls</span>
              <span className="chip">Live notifications</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="card" style={{ margin: 0 }}>
            <h3 className="section-title" style={{ marginTop: 0 }}>Login</h3>
            <div className="stack">
              <div>
                <label className="muted">Email</label>
                <input
                  className={`input${errors.email ? " input-error" : ""}`}
                  placeholder="staff@hotel.local"
                  {...register("email", {
                    required: "Email is required",
                    pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address" },
                  })}
                />
                {errors.email && (
                  <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label className="muted">Password</label>
                <input
                  className={`input${errors.password ? " input-error" : ""}`}
                  type="password"
                  placeholder="••••••••"
                  {...register("password", {
                    required: "Password is required",
                    minLength: { value: 6, message: "Password must be at least 6 characters" },
                  })}
                />
                {errors.password && (
                  <p style={{ color: "#d94f3a", fontSize: 12, margin: "4px 0 0" }}>
                    {errors.password.message}
                  </p>
                )}
              </div>
              <button className="btn primary" disabled={isSubmitting}>
                {isSubmitting ? "Logging in..." : "Login"}
              </button>
            </div>
            <div className="footer-note">
              First time? Bootstrap admin from backend: POST /api/auth/bootstrap-admin
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
