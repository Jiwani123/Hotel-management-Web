import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

let transporter = null;

function getSmtpConfig() {
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) return null;

  const secure = env.SMTP_SECURE || Number(env.SMTP_PORT) === 465;
  const from = env.SMTP_FROM || env.SMTP_USER;

  return {
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    from,
  };
}

function getTransporter() {
  if (transporter) return transporter;
  const cfg = getSmtpConfig();
  if (!cfg) return null;

  transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.auth,
  });

  return transporter;
}

export async function sendEmail({ to, subject, text, html }) {
  const cfg = getSmtpConfig();
  const tx = getTransporter();

  if (!cfg || !tx) {
    logger.debug("SMTP not configured; skipping email", { to, subject });
    return { skipped: true };
  }

  if (!to) throw new Error("Missing recipient email");
  if (!subject) throw new Error("Missing email subject");

  const info = await tx.sendMail({
    from: cfg.from,
    to,
    subject,
    text,
    html,
  });

  return { skipped: false, messageId: info?.messageId };
}
