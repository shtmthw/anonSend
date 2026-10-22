/**
 * Next.js boot hook (node runtime only).
 *
 * Prints the effective mail configuration at startup and warns early when
 * SMTP_HOST does not resolve, instead of surfacing a DNS error mid-signup.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') {
        return;
    }

    const smtpHost = process.env.SMTP_HOST;

    if (process.env.RESEND_API_KEY) {
        if (smtpHost) {
            console.warn(
                '[anonSend] Both RESEND_API_KEY and SMTP_HOST are set. Resend will be used.'
            );
        } else {
            console.log('[anonSend] Mail: Resend.');
        }
        return;
    }

    if (!smtpHost) {
        console.warn(
            '[anonSend] Mail: none configured. Set RESEND_API_KEY or SMTP_HOST (see .env.example) or OTP emails will not be sent.'
        );
        return;
    }

    console.log(`[anonSend] Mail: SMTP at ${smtpHost}:${process.env.SMTP_PORT || 587}.`);

    try {
        const { lookup } = await import('dns/promises');
        await lookup(smtpHost);
    } catch {
        console.warn(
            `[anonSend] SMTP_HOST "${smtpHost}" does not resolve. ` +
                'In the compose stack the dev mailbox starts as the "mailpit" service; ' +
                'outside of it, SMTP_HOST must point at a reachable real SMTP server ' +
                '(e.g. smtp.gmail.com) or use RESEND_API_KEY instead.'
        );
    }

    if (!process.env.NEXTAUTH_SECRET && process.env.NODE_ENV === 'production') {
        console.warn(
            '[anonSend] NEXTAUTH_SECRET is not set. Sign in will fail until it is set (see .env.example).'
        );
    }
}
