import nodemailer from "nodemailer";
import { getResendClient } from "@/lib/resend";
import { Email } from "../../emailTemps/validationCode";
import { Apiresp } from "@/types/ApiResp";

/**
 * Sends an email through whichever provider is configured:
 * - Resend, when RESEND_API_KEY is set
 * - Generic SMTP (Gmail, Mailpit, ...), when SMTP_HOST is set
 *
 * This keeps self-hosting simple: no Resend account is required,
 * any SMTP server works.
 */
const MAIL_FROM: string =
    process.env.MAIL_FROM ||
    (process.env.SMTP_USER ? `AnonSend <${process.env.SMTP_USER}>` : "AnonSend <onboarding@resend.dev>");

let smtpTransporter: nodemailer.Transporter | null = null;

function getSmtpTransporter(): nodemailer.Transporter | null {
    if (!process.env.SMTP_HOST) {
        return null;
    }

    if (!smtpTransporter) {
        const port = Number(process.env.SMTP_PORT || 587);
        smtpTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port,
            secure: process.env.SMTP_SECURE === "true" || port === 465, // true for 465, false for other ports
            auth:
                process.env.SMTP_USER && process.env.SMTP_PASS
                    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                    : undefined,
        });
    }

    return smtpTransporter;
}

export async function sendOtpEmail(
    to: string,
    subject: string,
    html: string
): Promise<Apiresp> {
    try {
        if (process.env.RESEND_API_KEY) {
            // Provider 1: Resend
            await getResendClient().emails.send({
                from: MAIL_FROM,
                to,
                subject,
                html,
            });
        } else {
            // Provider 2: generic SMTP
            const transporter = getSmtpTransporter();
            if (!transporter) {
                throw new Error(
                    "No email provider configured. Set RESEND_API_KEY or SMTP_HOST (see .env.example)."
                );
            }
            await transporter.sendMail({ from: MAIL_FROM, to, subject, html });
        }

        return { success: true, message: "Sent OTP email" };
    } catch (error) {
        console.error("Error sending OTP email:", error);
        const message = error instanceof Error ? error.message : "Failed to send OTP email";
        return { success: false, message: `Failed to send OTP email: ${message}` };
    }
}

export async function sendVerificationEmail(
    username: string,
    email: string,
    verifyCode: string
): Promise<Apiresp> {
    let htmlContent: string;

    try {
        // Next.js forbids static `react-dom/server` imports inside route
        // handlers, so render the React email template on demand.
        const ReactDomServer = (await import('react-dom/server')).default;
        htmlContent = ReactDomServer.renderToStaticMarkup(
            <Email username={username} otp={verifyCode} />
        );
    } catch (renderError) {
        console.error("Error rendering OTP email template:", renderError);
        // Plain-text fallback so verification still works if rendering fails
        htmlContent = `<p>Hello ${username},</p><p>Your AnonSend verification code is:</p><h2>${verifyCode}</h2><p>The code expires in 15 minutes.</p>`;
    }

    return sendOtpEmail(email, "AnonSend verification code", htmlContent);
}
