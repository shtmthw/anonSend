"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function VerifyForm({ email }: { email: string }) {
    const router = useRouter();
    const [code, setCode] = useState("");
    const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            const res = await fetch("/api/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code }),
            });

            const data = await res.json();
            setStatus({ ok: !!data.success, msg: data.msg ?? "Something went wrong." });

            if (data.success) {
                setTimeout(() => router.push("/sign-in"), 1200);
            }
        } catch {
            setStatus({ ok: false, msg: "Network error, please try again." });
        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        "w-full rounded-lg border border-black/[.1] dark:border-white/[.15] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-emerald-500 transition-colors text-center font-mono tracking-[0.5em] text-lg";

    return (
        <form
            onSubmit={handleSubmit}
            className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-black/[.08] dark:border-white/[.1] p-6"
        >
            <h1 className="text-xl font-semibold">Verify your email</h1>
            <p className="text-xs text-[var(--foreground)]/60 leading-relaxed">
                Enter the 6-digit code we sent to{" "}
                <span className="text-[var(--foreground)]/90 font-medium">{email || "your email"}</span>.
                The code expires after 15 minutes.
            </p>

            <input
                className={inputClass}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                placeholder="••••••"
                required
                minLength={6}
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />

            <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="mt-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
                {loading ? "Verifying…" : "Verify"}
            </button>

            {status && (
                <p className={`text-xs leading-relaxed ${status.ok ? "text-emerald-500" : "text-red-500"}`}>
                    {status.msg}
                </p>
            )}

            <p className="text-xs text-[var(--foreground)]/60">
                Didn&apos;t get a code?{" "}
                <Link href="/sign-up" className="text-emerald-500 hover:underline">
                    Sign up again
                </Link>{" "}
                with the same email to resend it.
            </p>
        </form>
    );
}
