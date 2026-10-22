"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import SendPanel from "./SendPanel";

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

    const initial = (username[0] ?? "?").toUpperCase();

    return (
        <main className="flex min-h-screen flex-col">
            <header className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                <Link href="/" className="text-2xl font-bold tracking-tight sm:text-3xl">
                    anon<span className="text-emerald-500">Send</span>
                </Link>
                <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="rounded-full border border-black/[.08] dark:border-white/[.145] px-3 py-1.5 text-xs sm:px-4 sm:text-sm transition-colors hover:bg-black/[.03] dark:hover:bg-white/[.06]"
                >
                    Sign out
                </button>
            </header>

            <div className="mx-auto grid w-full max-w-screen-2xl flex-1 grid-cols-1 items-start gap-4 px-4 sm:gap-5 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-6 lg:px-8">
                <aside className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 rounded-2xl border border-black/[.08] p-4 dark:border-white/[.1] sm:p-5">
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-lg font-bold text-emerald-500">
                                {initial}
                            </span>
                            <div className="min-w-0">
                                <p className="truncate font-semibold">
                                    {username ? `@${username}` : "Your inbox"}
                                </p>
                                <p className="text-xs text-[var(--foreground)]/60">
                                    Share your link to receive anonymous messages
                                </p>
                            </div>
                        </div>
                        {username ? (
                            <div className="flex flex-col gap-1.5">
                                <code className="self-start rounded-lg bg-black/[.05] px-2.5 py-1 break-all font-mono text-xs dark:bg-white/[.08]">
                                    /u/{username}
                                </code>
                                <div className="flex gap-3 text-xs">
                                    <button onClick={copyLink} className="text-emerald-500 hover:underline">
                                        {copied ? "Copied!" : "Copy link"}
                                    </button>
                                    <Link href={`/u/${username}`} className="text-emerald-500 hover:underline">
                                        Open sender page →
                                    </Link>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </aside>

                <SendPanel />

                <section className="flex flex-col gap-3">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-base font-semibold sm:text-lg">
                            Messages{" "}
                            <span className="text-sm text-[var(--foreground)]/50">
                                ({messages.length})
                            </span>
                        </h2>
                        <button onClick={load} className="text-xs text-emerald-500 hover:underline">
                            Refresh
                        </button>
                    </div>

                    <div className="flex flex-col gap-3 lg:max-h-[calc(100vh-230px)] lg:overflow-y-auto lg:pr-2">
                        {loading && (
                            <p className="px-1 text-sm text-[var(--foreground)]/60">Loading your inbox…</p>
                        )}

                        {error && <p className="px-1 text-sm text-red-500">{error}</p>}

                        {!loading && !error && messages.length === 0 && (
                            <div className="rounded-2xl border border-black/[.08] p-6 text-center text-sm text-[var(--foreground)]/60 dark:border-white/[.1] sm:p-8">
                                No messages yet. Share your link and wait for someone to be brave.
                                <br />
                                <span className="text-xs">This page refreshes itself every 15s.</span>
                            </div>
                        )}

                        {messages.map((m, i) => (
                            <article
                                key={i}
                                className="flex flex-col gap-1.5 rounded-2xl border border-black/[.08] p-4 dark:border-white/[.1] sm:p-5"
                            >
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                                <time className="text-xs text-[var(--foreground)]/40">
                                    {new Date(m.date).toLocaleString()}
                                </time>
                            </article>
                        ))}
                    </div>
                </section>
            </div>

            <footer className="mt-4 pb-4 sm:pb-6">
                <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-black/[.08] px-4 py-2.5 dark:border-white/[.1]">
                        <div className="flex min-w-0 flex-col sm:flex-row sm:items-center sm:gap-2">
                            <span className="text-xs font-medium sm:text-sm">
                                {isAccepting ? "Accepting messages" : "Not accepting messages"}
                            </span>
                            <span className="truncate text-xs text-[var(--foreground)]/60">
                                {isAccepting
                                    ? "anyone with your link can send you messages"
                                    : "new anonymous messages are being rejected"}
                            </span>
                        </div>
                        <button
                            onClick={toggleAccepting}
                            role="switch"
                            aria-checked={isAccepting}
                            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                                isAccepting ? "bg-emerald-500" : "bg-black/[.2] dark:bg-white/[.2]"
                            }`}
                        >
                            <span
                                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                                    isAccepting ? "left-[18px]" : "left-0.5"
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </footer>
        </main>
    );
}
