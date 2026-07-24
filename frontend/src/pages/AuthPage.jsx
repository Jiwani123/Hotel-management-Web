import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useLocation, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Mail, Lock, User, Phone, Eye, EyeOff,
  BedDouble, Star, Shield, Sparkles,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import api from "../lib/api";

/* ── brand feature list ── */
const PERKS = [
  { icon: <BedDouble size={20} />,  label: "Exclusive suite access" },
  { icon: <Star size={20} />,       label: "Loyalty rewards & upgrades" },
  { icon: <Sparkles size={20} />,   label: "Personalised concierge" },
  { icon: <Shield size={20} />,     label: "Secure & private account" },
];

function PasswordInput({ reg, placeholder = "••••••••" }) {
  const [show, setShow] = useState(false);
  return (
    <div className="auth-pw-wrap">
      <input
        className="auth-input"
        type={show ? "text" : "password"}
        placeholder={placeholder}
        {...reg}
        autoComplete="current-password"
      />
      <button
        type="button"
        className="auth-pw-eye"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  /* derive initial mode from path */
  const [mode, setMode] = useState(
    location.pathname === "/register" ? "register" : "login"
  );

  /* keep URL in sync when toggle changes */
  useEffect(() => {
    const target = mode === "login" ? "/login" : "/register";
    if (location.pathname !== target) {
      navigate(target, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /* ── Login form ── */
  const loginForm = useForm({
    defaultValues: { email: "", password: "" },
  });
  const onLogin = async (values) => {
    try {
      const data = await login(values.email, values.password);
      toast.success("Welcome back!");
      if (data?.user?.role === "CUSTOMER") navigate("/customer");
      else navigate("/staff");
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Login failed");
    }
  };

  /* ── Register form ── */
  const registerForm = useForm({
    defaultValues: { name: "", email: "", phone: "", password: "", confirm: "" },
  });
  const { watch: watchReg } = registerForm;
  const onRegister = async (values) => {
    if (values.password !== values.confirm) {
      registerForm.setError("confirm", { message: "Passwords do not match" });
      return;
    }
    try {
      await api.post("/auth/register", {
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
      });
      toast.success("Account created! Please sign in.");
      registerForm.reset();
      setMode("login");
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Registration failed");
    }
  };

  const li = loginForm.formState.isSubmitting;
  const ri = registerForm.formState.isSubmitting;

  return (
    <div className="auth-root">
      {/* floating brand strip at top */}
      <div className="auth-topbar">
        <span className="auth-topbar-brand">
          <BedDouble size={18} />
          Coconut Republik
        </span>
        <Link to="/" className="auth-topbar-back">
          ← Back to website
        </Link>
      </div>

      <div className="auth-card">
        {/* ── Left: brand panel ── */}
        <div className="auth-brand">
          <div className="auth-brand-inner">
            <p className="auth-brand-eyebrow">Est. 1994 · Luxury Resort</p>
            <h1 className="auth-brand-title">Coconut<br />Republik</h1>
            <p className="auth-brand-sub">
              One account for every stay, dining experience, and exclusive benefit.
            </p>

            <ul className="auth-perks">
              {PERKS.map((p) => (
                <li key={p.label} className="auth-perk">
                  <span className="auth-perk-icon">{p.icon}</span>
                  {p.label}
                </li>
              ))}
            </ul>

            <div className="auth-brand-quote">
              "The finest hospitality, now at your fingertips."
            </div>
          </div>
        </div>

        {/* ── Right: form panel ── */}
        <div className="auth-form-panel">
          {/* toggle */}
          <div className="auth-toggle">
            <button
              className={`auth-toggle-btn${mode === "login" ? " active" : ""}`}
              onClick={() => setMode("login")}
              type="button"
            >
              Sign In
            </button>
            <button
              className={`auth-toggle-btn${mode === "register" ? " active" : ""}`}
              onClick={() => setMode("register")}
              type="button"
            >
              Register
            </button>
          </div>

          {/* ─── LOGIN ─────────────────────────────────── */}
          {mode === "login" && (
            <form
              onSubmit={loginForm.handleSubmit(onLogin)}
              className="auth-form"
              noValidate
            >
              <div className="auth-form-header">
                <h2 className="auth-form-title">Welcome back!</h2>
                <p className="auth-form-sub">Sign in to your account to continue</p>
              </div>

              <div className="auth-field">
                <label className="auth-label">Email address</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    className="auth-input with-icon"
                    type="email"
                    placeholder="you@example.com"
                    {...loginForm.register("email", {
                      required: "Email is required",
                      pattern: { value: /^\S+@\S+\.\S+$/, message: "Invalid email address" },
                    })}
                    autoComplete="email"
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="auth-error">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="auth-field">
                <label className="auth-label">Password</label>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <div className="auth-pw-wrap with-icon">
                    <PasswordInput
                      reg={loginForm.register("password", { required: "Password is required" })}
                    />
                  </div>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="auth-error">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <button className="auth-submit-btn" disabled={li}>
                {li ? (
                  <span className="auth-spinner" />
                ) : (
                  <>Sign In <ArrowRight size={16} /></>
                )}
              </button>

              <p className="auth-switch-hint">
                Don't have an account?{" "}
                <button type="button" className="auth-link" onClick={() => setMode("register")}>
                  Create one →
                </button>
              </p>

              <div className="auth-divider"><span>Staff portal</span></div>
              <p className="auth-footnote">
                Admin bootstrap: <code>POST /api/auth/bootstrap-admin</code>
              </p>
            </form>
          )}

          {/* ─── REGISTER ──────────────────────────────── */}
          {mode === "register" && (
            <form
              onSubmit={registerForm.handleSubmit(onRegister)}
              className="auth-form"
              noValidate
            >
              <div className="auth-form-header">
                <h2 className="auth-form-title">Create account</h2>
                <p className="auth-form-sub">Join Coconut Republik in minutes</p>
              </div>

              <div className="auth-fields-row">
                <div className="auth-field">
                  <label className="auth-label">Full name</label>
                  <div className="auth-input-wrap">
                    <User size={16} className="auth-input-icon" />
                    <input
                      className="auth-input with-icon"
                      placeholder="Jane Smith"
                      {...registerForm.register("name", { required: "Name is required", minLength: { value: 2, message: "Min 2 characters" } })}
                      autoComplete="name"
                    />
                  </div>
                  {registerForm.formState.errors.name && (
                    <p className="auth-error">{registerForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="auth-field">
                  <label className="auth-label">Phone (optional)</label>
                  <div className="auth-input-wrap">
                    <Phone size={16} className="auth-input-icon" />
                    <input
                      className="auth-input with-icon"
                      placeholder="+1 555 000 0000"
                      {...registerForm.register("phone")}
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">Email address</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    className="auth-input with-icon"
                    type="email"
                    placeholder="you@example.com"
                    {...registerForm.register("email", {
                      required: "Email is required",
                      pattern: { value: /^\S+@\S+\.\S+$/, message: "Invalid email" },
                    })}
                    autoComplete="email"
                  />
                </div>
                {registerForm.formState.errors.email && (
                  <p className="auth-error">{registerForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="auth-fields-row">
                <div className="auth-field">
                  <label className="auth-label">Password</label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <div className="auth-pw-outer">
                      <PasswordInput
                        reg={registerForm.register("password", {
                          required: "Password required",
                          minLength: { value: 8, message: "Min 8 characters" },
                        })}
                        placeholder="Min 8 characters"
                      />
                    </div>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="auth-error">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="auth-field">
                  <label className="auth-label">Confirm password</label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <div className="auth-pw-outer">
                      <PasswordInput
                        reg={registerForm.register("confirm", { required: "Please confirm" })}
                        placeholder="Repeat password"
                      />
                    </div>
                  </div>
                  {registerForm.formState.errors.confirm && (
                    <p className="auth-error">{registerForm.formState.errors.confirm.message}</p>
                  )}
                </div>
              </div>

              {/* password strength bar */}
              <PasswordStrength password={watchReg("password")} />

              <button className="auth-submit-btn" disabled={ri}>
                {ri ? (
                  <span className="auth-spinner" />
                ) : (
                  <>Create Account <ArrowRight size={16} /></>
                )}
              </button>

              <p className="auth-switch-hint">
                Already registered?{" "}
                <button type="button" className="auth-link" onClick={() => setMode("login")}>
                  Sign in →
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Password strength indicator ── */
function PasswordStrength({ password = "" }) {
  const score = getStrengthScore(password);
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "#e74c3c", "#e67e22", "#f1c40f", "#27ae60"];
  if (!password) return null;
  return (
    <div className="auth-strength">
      <div className="auth-strength-bars">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="auth-strength-bar"
            style={{ background: i <= score ? colors[score] : "var(--border)" }}
          />
        ))}
      </div>
      <span className="auth-strength-label" style={{ color: colors[score] }}>
        {labels[score]}
      </span>
    </div>
  );
}

function getStrengthScore(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
