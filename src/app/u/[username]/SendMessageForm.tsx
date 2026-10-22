"use client";

import { useEffect, useState } from "react";

const MAX_LEN = 300;

export default function SendMessageForm({ username }: { username: string }) {
    const [message, setMessage] = useState("");
    const [state, setState] = useState<"loading" | "ready" | "sent" | "off" | "error">("loading");
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/u/${encodeURIComponent(username)}/message`);
                if (cancelled) return;
                if (res.status === 404) {
                    setState("error");
                    setStatus("No user found with that username.");
                    return;
                }
                const data = await res.json();
                if (data.success && data.isAcceptingMsg) {
                    setState("ready");
                } else if (data.success) {
                    setState("off");
                    setStatus("This user is not accepting messages right now.");
                } else {
                    setState("error");
                    setStatus(data.msg ?? "Could not find this user.");
                }
            } catch {
                if (!cancelled) {
                    setState("error");
                    setStatus("Network error, please try again.");
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [username]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/u/${encodeURIComponent(username)}/message`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message }),
            });
            const data = await res.json();
            if (data.success) {
                setState("sent");
                setStatus(null);
            } else {
                setStatus(data.msg ?? "Could not send your message.");
            }
        } catch {
            setStatus("Network error, please try again.");
        }
    };

    if (state === "sent") {
        return (
            <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-black/[.08] dark:border-white/[.1] p-10 text-center">
                <span className="text-4xl">🕊</span>
                <h1 className="text-lg font-semibold">Message delivered!</h1>
                <p className="text-sm text-[var(--foreground)]/60">
                    Your anonymous message was sent to {username}. They will never know
                    it was you.
                </p>
                <button
                    onClick={() => {
                        setMessage("");
                        setState("ready");
                    }}
                    className="mt-2 text-sm text-emerald-500 hover:underline"
                >
                    Send another
                </button>
            </div>
        );
    }

    if (state === "loading") {
        return <p className="text-sm text-[var(--foreground)]/60">Loading…</p>;
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-black/[.08] dark:border-white/[.1] p-6"
        >
            <h1 className="text-xl font-semibold">
                Send <span className="text-emerald-500">@{username}</span> an anonymous message
            </h1>
            <p className="text-xs text-[var(--foreground)]/60">
                No name, no email, no trace. Be kind — the message is 100% anonymous.
            </p>

            <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
                placeholder="Write your message…"
                rows={5}
                required
                minLength={2}
                maxLength={MAX_LEN}
                disabled={state !== "ready"}
                className="w-full rounded-lg border border-black/[.1] dark:border-white/[.15] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-emerald-500 transition-colors resize-none disabled:opacity-50"
            />

            <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--foreground)]/40">
                    {message.length}/{MAX_LEN}
                </span>
                <button
                    type="submit"
                    disabled={state !== "ready" || message.trim().length < 2}
                    className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                >
                    Send anonymously
                </button>
            </div>

            {status && <p className="text-xs text-red-500">{status}</p>}
        </form>
    );
}
