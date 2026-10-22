import { Resend } from 'resend';

let client: Resend | null = null;

/**
 * Lazily-constructed Resend client.
 * The API key is read from the environment (RESEND_API_KEY), never hardcoded.
 */
export function getResendClient(): Resend {
    if (!client) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            throw new Error(
                'RESEND_API_KEY is not set. Add it to your .env file, or configure SMTP_HOST to use a generic SMTP provider instead.'
            );
        }
        client = new Resend(apiKey);
    }
    return client;
}

export default getResendClient;
