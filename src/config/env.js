import dotenv from "dotenv";
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 5000),
  MONGO_URI: process.env.MONGO_URI ?? "",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",

  // Optional SMTP (email receipts/notifications)
  SMTP_HOST: process.env.SMTP_HOST ?? "",
  SMTP_PORT: Number(process.env.SMTP_PORT ?? ""),
  SMTP_USER: process.env.SMTP_USER ?? "",
  SMTP_PASS: process.env.SMTP_PASS ?? "",
  SMTP_FROM: process.env.SMTP_FROM ?? "",
  SMTP_SECURE: String(process.env.SMTP_SECURE ?? "").toLowerCase() === "true",

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? "",
  CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER ?? "hotel",

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? "dev_access_secret",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? "dev_refresh_secret",
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",

  // Stripe (optional)
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  STRIPE_CURRENCY: (process.env.STRIPE_CURRENCY ?? "lkr").toLowerCase(),
  STRIPE_SUCCESS_URL: process.env.STRIPE_SUCCESS_URL ?? "",
  STRIPE_CANCEL_URL: process.env.STRIPE_CANCEL_URL ?? "",
};

if (env.NODE_ENV === "production") {
  if (!env.MONGO_URI) throw new Error("MONGO_URI is required in production");
  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT secrets are required in production");
  }

  const anySmtp = !!env.SMTP_HOST || !!env.SMTP_PORT || !!env.SMTP_USER || !!env.SMTP_PASS || !!env.SMTP_FROM;
  const smtpReady = !!env.SMTP_HOST && !!env.SMTP_PORT && !!env.SMTP_USER && !!env.SMTP_PASS;
  if (anySmtp && !smtpReady) {
    throw new Error(
      "SMTP env vars are partially set. Provide SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS (and optionally SMTP_FROM, SMTP_SECURE)."
    );
  }

  const anyCloudinary =
    !!env.CLOUDINARY_CLOUD_NAME || !!env.CLOUDINARY_API_KEY || !!env.CLOUDINARY_API_SECRET;
  const allCloudinary =
    !!env.CLOUDINARY_CLOUD_NAME && !!env.CLOUDINARY_API_KEY && !!env.CLOUDINARY_API_SECRET;
  if (anyCloudinary && !allCloudinary) {
    throw new Error(
      "Cloudinary env vars are partially set. Provide CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  const anyStripe = !!env.STRIPE_SECRET_KEY || !!env.STRIPE_WEBHOOK_SECRET;
  const allStripe = !!env.STRIPE_SECRET_KEY && !!env.STRIPE_WEBHOOK_SECRET;
  if (anyStripe && !allStripe) {
    throw new Error(
      "Stripe env vars are partially set. Provide STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET."
    );
  }
}
