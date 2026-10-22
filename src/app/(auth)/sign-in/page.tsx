"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function SignInPage() {
    const router = useRouter();
    const [form, setForm] = useState({ identifier: "", password: "" });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await signIn("credentials", {
                identifier: form.identifier,
                password: form.password,
                redirect: false,
            });

            if (res?.error) {
                // The error message thrown by the authorize callback is
                // returned here (e.g. "Please verify your account...").
                setError(res.error.replace(/^Error occurred while authenticating via authjs:\s*/i, ""));
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } catch {
            setError("Network error, please try again.");
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
                <h1 className="text-xl font-semibold">Sign in</h1>

                <label className="flex flex-col gap-1.5 text-xs text-[var(--foreground)]/60">
                    Email or username
                    <input
                        className={inputClass}
                        type="text"
                        placeholder="you@example.com"
                        required
                        value={form.identifier}
                        onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                    />
                </label>

                <label className="flex flex-col gap-1.5 text-xs text-[var(--foreground)]/60">
                    Password
                    <input
                        className={inputClass}
                        type="password"
                        placeholder="••••••••"
                        required
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                </label>

                <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                >
                    {loading ? "Signing in…" : "Sign in"}
                </button>

                {error && <p className="text-xs leading-relaxed text-red-500">{error}</p>}

                <p className="text-xs text-[var(--foreground)]/60">
                    Don&apos;t have an account?{" "}
                    <Link href="/sign-up" className="text-emerald-500 hover:underline">
                        Sign up
                    </Link>
                </p>
            </form>
        </main>
    );
}
