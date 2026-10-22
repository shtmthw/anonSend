"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const USERNAME_RE = /^[a-z0-9_.-]{3,20}$/;

type Check = "idle" | "checking" | "ok" | "notfound" | "paused" | "error";

const STATUS_TEXT: Record<Check, string> = {
    idle: "",
    checking: "Checking…",
    ok: "Exists and is accepting messages.",
    notfound: "No user with that name (yet).",
    paused: "That inbox is paused.",
    error: "Could not check right now, try again.",
};

export default function UsernameBar() {
    const router = useRouter();
    const [value, setValue] = useState("");
    const [check, setCheck] = useState<Check>("idle");
    const [resolvedName, setResolvedName] = useState<string | null>(null);
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Live username validation, debounced so we don't query per keystroke.
    useEffect(() => {
        setCheck("idle");
        setResolvedName(null);

        const name = value.trim().toLowerCase();
        if (!USERNAME_RE.test(name)) return;

        setCheck("checking");
        if (debounce.current) clearTimeout(debounce.current);

        debounce.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/u/${encodeURIComponent(name)}/message`);
                if (res.status === 404) {
                    setCheck("notfound");
                    setResolvedName(null);
                } else {
                    const data = await res.json();
                    if (data.success) {
                        setCheck(data.isAcceptingMsg ? "ok" : "paused");
                        setResolvedName(data.username ?? name);
                    } else {
                        setCheck("notfound");
                    }
                }
            } catch {
                setCheck("error");
            }
        }, 400);

        return () => {
            if (debounce.current) clearTimeout(debounce.current);
        };
    }, [value]);

    const go = () => {
        const name = (resolvedName ?? value.trim().toLowerCase()).replace(/^@/, "");
        if (name) router.push(`/u/${encodeURIComponent(name)}`);
    };

    const inputClass =
        "w-full rounded-lg border border-black/[.1] dark:border-white/[.15] bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors";

    const goable = check === "ok" && !!resolvedName;

    return (
        <div className="flex flex-col gap-1.5">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    go();
                }}
                className="flex gap-2"
            >
                <input
                    className={inputClass}
                    type="text"
                    placeholder="send anonymously to a username…"
                    aria-label="Send an anonymous message to a username"
                    value={value}
                    onChange={(e) => setValue(e.target.value.replace(/^@/, "").toLowerCase())}
                    spellCheck={false}
                    autoComplete="off"
                />
                <button
                    type="submit"
                    disabled={!goable}
                    className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500"
                >
                    Send
                </button>
            </form>
            {check !== "idle" && value.trim().length > 0 && (
                <p
                    className={`text-xs leading-relaxed ${
                        check === "ok"
                            ? "text-emerald-500"
                            : check === "checking" || check === "error"
                              ? "text-[var(--foreground)]/50"
                              : "text-red-500"
                    }`}
                >
                    {STATUS_TEXT[check]}
                </p>
            )}
        </div>
    );
}
