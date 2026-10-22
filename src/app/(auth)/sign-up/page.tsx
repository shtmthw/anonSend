"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
    const router = useRouter();
    const [form, setForm] = useState({ username: "", email: "", password: "" });
    const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            const res = await fetch("/api/sign-up", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (data.success) {
                setStatus({ ok: true, msg: data.msg });
                // Give the user a moment to read the message, then send
                // them off to the verification page.
                setTimeout(() => {
                    router.push(`/verify?email=${encodeURIComponent(form.email)}`);
                }, 1200);
            } else {
                setStatus({ ok: false, msg: data.msg ?? "Something went wrong." });
            }
        } catch {
            setStatus({ ok: false, msg: "Network error, please try again." });
        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        "w-full rounded-lg border border-black/[.1] dark:border-white/[.15] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-emerald-500 transition-colors";

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
            <Link href="/" className="text-2xl font-bold tracking-tight">
                anon<span className="text-emerald-500">Send</span>
            </Link>

            <form
                onSubmit={handleSubmit}
                className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-black/[.08] dark:border-white/[.1] p-6"
            >
                <h1 className="text-xl font-semibold">Create your account</h1>

                <label className="flex flex-col gap-1.5 text-xs text-[var(--foreground)]/60">
                    Username
                    <input
                        className={inputClass}
                        type="text"
                        placeholder="username"
                        required
                        minLength={3}
                        maxLength={20}
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                    />
                </label>

                <label className="flex flex-col gap-1.5 text-xs text-[var(--foreground)]/60">
                    Email
                    <input
                        className={inputClass}
                        type="email"
                        placeholder="you@example.com"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                </label>

                <label className="flex flex-col gap-1.5 text-xs text-[var(--foreground)]/60">
                    Password
                    <input
                        className={inputClass}
                        type="password"
                        placeholder="••••••••"
                        required
                        minLength={4}
                        maxLength={72}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                </label>

                <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                >
                    {loading ? "Signing up…" : "Sign up"}
                </button>

                {status && (
                    <p
                        className={`text-xs leading-relaxed ${
                            status.ok ? "text-emerald-500" : "text-red-500"
                        }`}
                    >
                        {status.msg}
                    </p>
                )}

                <p className="text-xs text-[var(--foreground)]/60">
                    Already have an account?{" "}
                    <Link href="/sign-in" className="text-emerald-500 hover:underline">
                        Sign in
                    </Link>
                </p>
            </form>
        </main>
    );
}
