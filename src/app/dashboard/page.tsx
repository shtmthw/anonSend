"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

type Message = { content: string; date: string };

export default function DashboardPage() {
    const [username, setUsername] = useState<string>("");
    const [isAccepting, setIsAccepting] = useState<boolean>(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/messages");
            if (res.status === 401) return; // redirected by middleware anyway
            const data = await res.json();
            if (data.success) {
                setUsername(data.username);
                setIsAccepting(data.isAcceptingMsg);
                setMessages(data.messages ?? []);
                setError(null);
            } else {
                setError(data.msg ?? "Failed to load your inbox.");
            }
        } catch {
            setError("Network error while loading your inbox.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const interval = setInterval(load, 15000); // light polling for new messages
        return () => clearInterval(interval);
    }, [load]);

    const toggleAccepting = async () => {
        const next = !isAccepting;
        setIsAccepting(next); // optimistic
        try {
            const res = await fetch("/api/accept-messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isAcceptingMsg: next }),
            });
            const data = await res.json();
            if (!data.success) {
                setIsAccepting(!next);
                setError(data.msg ?? "Failed to update setting.");
            }
        } catch {
            setIsAccepting(!next);
            setError("Network error while updating setting.");
        }
    };

    const copyLink = async () => {
        const link = `${window.location.origin}/u/${username}`;
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 p-6 sm:p-10">
            <header className="flex items-center justify-between flex-wrap gap-3">
                <Link href="/" className="text-xl font-bold tracking-tight">
                    anon<span className="text-emerald-500">Send</span>
                </Link>
                <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="rounded-full border border-black/[.08] dark:border-white/[.145] px-4 py-2 text-sm transition-colors hover:bg-black/[.03] dark:hover:bg-white/[.06]"
                >
                    Sign out
                </button>
            </header>

            <section className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold">Your inbox</h1>
                {username ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <code className="rounded-lg bg-black/[.05] dark:bg-white/[.08] px-2.5 py-1 font-mono text-xs break-all">
                            /u/{username}
                        </code>
                        <button
                            onClick={copyLink}
                            className="text-xs text-emerald-500 hover:underline"
                        >
                            {copied ? "Copied!" : "Copy link"}
                        </button>
                        <Link
                            href={`/u/${username}`}
                            className="text-xs text-emerald-500 hover:underline"
                        >
                            Open sender page →
                        </Link>
                    </div>
                ) : null}
            </section>

            <section className="flex items-center justify-between rounded-2xl border border-black/[.08] dark:border-white/[.1] p-4 sm:p-5">
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">
                        {isAccepting ? "Accepting messages" : "Not accepting messages"}
                    </span>
                    <span className="text-xs text-[var(--foreground)]/60">
                        {isAccepting
                            ? "Anyone with your link can send you anonymous messages."
                            : "New anonymous messages are being rejected."}
                    </span>
                </div>
                <button
                    onClick={toggleAccepting}
                    role="switch"
                    aria-checked={isAccepting}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        isAccepting ? "bg-emerald-500" : "bg-black/[.2] dark:bg-white/[.2]"
                    }`}
                >
                    <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                            isAccepting ? "left-[22px]" : "left-0.5"
                        }`}
                    />
                </button>
            </section>

            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                        Messages{" "}
                        <span className="text-sm text-[var(--foreground)]/50">
                            ({messages.length})
                        </span>
                    </h2>
                    <button
                        onClick={load}
                        className="text-xs text-emerald-500 hover:underline"
                    >
                        Refresh
                    </button>
                </div>

                {loading && (
                    <p className="text-sm text-[var(--foreground)]/60">Loading your inbox…</p>
                )}

                {error && <p className="text-sm text-red-500">{error}</p>}

                {!loading && !error && messages.length === 0 && (
                    <div className="rounded-2xl border border-black/[.08] dark:border-white/[.1] p-8 text-center text-sm text-[var(--foreground)]/60">
                        No messages yet. Share your link and wait for someone to be brave. 🕊
                        <br />
                        <span className="text-xs">Messages appear here automatically — this page refreshes every 15s.</span>
                    </div>
                )}

                {messages.map((m, i) => (
                    <article
                        key={i}
                        className="flex flex-col gap-1.5 rounded-2xl border border-black/[.08] dark:border-white/[.1] p-4 sm:p-5"
                    >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                        <time className="text-xs text-[var(--foreground)]/40">
                            {new Date(m.date).toLocaleString()}
                        </time>
                    </article>
                ))}
            </section>
        </main>
    );
}
