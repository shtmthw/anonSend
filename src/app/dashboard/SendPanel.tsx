"use client";

import { useEffect, useRef, useState } from "react";

const USERNAME_RE = /^[a-z0-9_.-]{3,20}$/;
const MAX_LEN = 300;

type Check = "idle" | "checking" | "ok" | "notfound" | "paused";
type Feedback = { ok: boolean; msg: string } | null;

const STATUS_TEXT: Record<Check, string> = {
    idle: "",
    checking: "Checking…",
    ok: "exists · accepting messages",
    notfound: "no user with that name",
    paused: "inbox paused",
};

/**
 * Inline anonymous-messaging composer for the dashboard: pick a recipient,
 * live-validates the username, and sends the message from here.
 */
export default function SendPanel() {
    const [recipient, setRecipient] = useState("");
    const [check, setCheck] = useState<Check>("idle");
    const [resolvedName, setResolvedName] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [feedback, setFeedback] = useState<Feedback>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Live username validation, debounced so we don't query per keystroke.
    useEffect(() => {
        setCheck("idle");
        setResolvedName(null);

        const name = recipient.trim().toLowerCase().replace(/^@/, "");
        if (!USERNAME_RE.test(name)) return;

        setCheck("checking");
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`/api/u/${encodeURIComponent(name)}/message`);
                if (res.status === 404) {
                    setCheck("notfound");
                    return;
                }
                const data = await res.json();
                if (data.success) {
                    setCheck(data.isAcceptingMsg ? "ok" : "paused");
                    setResolvedName(data.username ?? name);
                } else {
                    setCheck("notfound");
                }
            } catch {
                setCheck("notfound"); // unreachable → treat as invalid
            }
        }, 400);

        return () => clearTimeout(t);
    }, [recipient]);

    const recipientValid = USERNAME_RE.test(recipient.trim().toLowerCase().replace(/^@/, ""));
    const sendable = recipientValid && !sending && message.trim().length >= 2 && check === "ok";

    const submit = async () => {
        if (sending || !resolvedName || message.trim().length < 2) return;
        setSending(true);
        setFeedback(null);

        try {
            const res = await fetch(`/api/u/${encodeURIComponent(resolvedName)}/message`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message }),
            });
            const data = await res.json();
            if (data.success) {
                setFeedback({ ok: true, msg: `Delivered to @${resolvedName} anonymously.` });
                setMessage("");
                setTimeout(() => textareaRef.current?.focus(), 0);
            } else {
                if (data.msg?.includes("not accepting")) setCheck("paused");
                setFeedback({ ok: false, msg: data.msg ?? "Could not send your message." });
            }
        } catch {
            setFeedback({ ok: false, msg: "Network error, please try again." });
        } finally {
            setSending(false);
        }
    };

    const inputClass =
        "w-full rounded-lg border border-black/[.1] bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors dark:border-white/[.15]";
    const checkColor =
        check === "ok" ? "text-emerald-500" : check === "checking" || check === "idle" ? "text-[var(--foreground)]/50" : "text-red-500";

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                submit();
            }}
            onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && sendable) {
                    e.preventDefault();
                    submit();
                }
            }}
            className="flex max-h-[calc(100vh-230px)] flex-col gap-3 self-stretch rounded-2xl border border-black/[.08] p-4 dark:border-white/[.1] sm:p-5 lg:overflow-hidden"
        >
            <h2 className="text-base font-semibold sm:text-lg">Send an anonymous message</h2>

            <div className="flex flex-col gap-1.5">
                <input
                    className={inputClass}
                    type="text"
                    placeholder="to: @username"
                    aria-label="Recipient username"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value.replace(/^@/, "").toLowerCase())}
                    spellCheck={false}
                    autoComplete="off"
                />
                {recipientValid && check !== "idle" && recipient.trim().length > 0 && (
                    <p className={`text-xs leading-relaxed ${checkColor}`}>{STATUS_TEXT[check]}</p>
                )}
            </div>

            <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
                placeholder="Write your message… (Ctrl+Enter to send)"
                rows={6}
                required
                minLength={2}
                maxLength={MAX_LEN}
                className="w-full min-h-[140px] flex-1 resize-y rounded-lg border border-black/[.1] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-emerald-500 transition-colors dark:border-white/[.15] lg:min-h-0"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-[var(--foreground)]/40">
                    {message.length}/{MAX_LEN}
                </span>
                <button
                    type="submit"
                    disabled={!sendable}
                    className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                >
                    {sending ? "Sending…" : "Send anonymously"}
                </button>
            </div>

            {feedback && (
                <p className={`text-xs leading-relaxed ${feedback.ok ? "text-emerald-500" : "text-red-500"} truncate`}>
                    {feedback.msg}
                </p>
            )}
        </form>
    );
}
