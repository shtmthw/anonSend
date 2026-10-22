"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const MAX_LEN = 300;

export default function SendMessageForm({ username }: { username: string }) {
    const [message, setMessage] = useState("");
    const [state, setState] = useState<"loading" | "ready" | "sent" | "off" | "error">("loading");
    const [status, setStatus] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
                    // Autofocus once the form is actually usable.
                    setTimeout(() => textareaRef.current?.focus(), 0);
                } else if (data.success) {
                    setState("off");
                    setStatus("That inbox is paused right now.");
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

    const submit = async () => {
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

    const backLink = (
        <Link href="/" className="text-sm text-emerald-500 hover:underline">
            Go back
        </Link>
    );

    if (state === "loading") {
        return <p className="text-sm text-[var(--foreground)]/60">Loading…</p>;
    }

    if (state === "error") {
        return (
            <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-black/[.08] dark:border-white/[.1] p-10 text-center">
                <h1 className="text-lg font-semibold">User not found</h1>
                <p className="text-sm text-[var(--foreground)]/60">
                    {status ?? "This user does not exist (yet)."}
                </p>
                {backLink}
            </div>
        );
    }

    if (state === "off") {
        return (
            <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-black/[.08] dark:border-white/[.1] p-10 text-center">
                <h1 className="text-lg font-semibold">Inbox paused</h1>
                <p className="text-sm text-[var(--foreground)]/60">
                    {status ?? `@${username} paused their inbox and is not accepting messages right now.`}
                </p>
                {backLink}
            </div>
        );
    }

    if (state === "sent") {
        return (
            <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-black/[.08] dark:border-white/[.1] p-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-lg font-bold text-emerald-500">
                    ✓
                </div>
                <h1 className="text-lg font-semibold">Message delivered</h1>
                <p className="text-sm text-[var(--foreground)]/60">
                    Your anonymous message was sent to {username}. They will never know it was you.
                </p>
                <button
                    onClick={() => {
                        setMessage("");
                        setState("ready");
                        setTimeout(() => textareaRef.current?.focus(), 0);
                    }}
                    className="mt-2 text-sm text-emerald-500 hover:underline"
                >
                    Send another
                </button>
            </div>
        );
    }

    const initial = (username[0] ?? "?").toUpperCase();

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                submit();
            }}
            onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && message.trim().length >= 2) {
                    e.preventDefault();
                    submit();
                }
            }}
            className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-black/[.08] dark:border-white/[.1] p-6"
        >
            <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-lg font-bold text-emerald-500">
                    {initial}
                </span>
                <div className="flex flex-col">
                    <span className="text-lg font-semibold break-all">@{username}</span>
                    <span className="text-xs text-[var(--foreground)]/60">Anonymous message — no name, no email, no trace.</span>
                </div>
            </div>

            <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
                placeholder="Write your message… (Ctrl+Enter to send)"
                rows={5}
                required
                minLength={2}
                maxLength={MAX_LEN}
                className="w-full rounded-lg border border-black/[.1] dark:border-white/[.15] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-emerald-500 transition-colors resize-none"
            />

            <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--foreground)]/40">{message.length}/{MAX_LEN}</span>
                <button
                    type="submit"
                    disabled={message.trim().length < 2}
                    className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                >
                    Send anonymously
                </button>
            </div>

            {status && <p className="text-xs text-red-500">{status}</p>}
        </form>
    );
}
