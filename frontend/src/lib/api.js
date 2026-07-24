import axios from "axios";
import toast from "react-hot-toast";

function normalizeApiBaseUrl(raw) {
  const s = String(raw ?? "").trim();

  // When not configured, default to local backend during dev.
  // For non-localhost deployments, a relative `/api` is the safest fallback.
  if (!s) {
    if (typeof window !== "undefined" && window.location?.hostname === "localhost") {
      return "http://localhost:5000/api";
    }
    return "/api";
  }

  const noTrailing = s.replace(/\/+$/g, "");
  if (/\/api$/i.test(noTrailing)) return noTrailing;
  return `${noTrailing}/api`;
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
export const ASSET_BASE_URL = (API_BASE_URL || "").replace(/\/api$/i, "");

export function assetUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  const s = String(pathOrUrl);
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/")) return `${ASSET_BASE_URL}${s}`;
  return s;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export async function uploadImages(files) {
  const list = Array.isArray(files) ? files : [];
  if (list.length === 0) return [];

  const fd = new FormData();
  list.forEach((f) => fd.append("images", f));

  const res = await api.post("/uploads/images", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.data?.items ?? [];
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing = false;
let queue = [];

function flushQueue(err, token) {
  queue.forEach((p) => (err ? p.reject(err) : p.resolve(token)));
  queue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error?.response?.status;

    const originalUrl = String(original?.url ?? "");
    const isAuthEndpoint =
      originalUrl.includes("/auth/login") ||
      originalUrl.includes("/auth/register") ||
      originalUrl.includes("/auth/refresh") ||
      originalUrl.includes("/auth/logout") ||
      originalUrl.includes("/auth/bootstrap-admin") ||
      originalUrl.includes("/auth/users");

    if (status === 401 && !original?._retry && !isAuthEndpoint) {
      original._retry = true;

      if (refreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      refreshing = true;
      try {
        const r = await api.post("/auth/refresh");
        const token = r.data?.data?.accessToken;
        setAccessToken(token);
        flushQueue(null, token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (e) {
        const hadAccessToken = !!accessToken;
        flushQueue(e, null);
        setAccessToken(null);
        // If the user was already authenticated, guide them back to login.
        // If they were never authenticated (no access token), treat this as normal logged-out state.
        if (hadAccessToken) {
          toast.error("Session expired. Please login again.");
          if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/register")) {
            window.location.href = "/login";
          }
        }
        return Promise.reject(e);
      } finally {
        refreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
