import Link from "next/link";

const steps = [
  { n: "1", title: "Create an account", text: "Sign up with your email and verify it with the code we send you." },
  { n: "2", title: "Share your link", text: "Every account gets a personal anonSend.me/u/username link." },
  { n: "3", title: "Receive honest messages", text: "Anyone with the link can message you — completely anonymously." },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 p-8 sm:p-20">
      <section className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl font-[family-name:var(--font-geist-sans)]">
          anon<span className="text-emerald-500">Send</span>
        </h1>
        <p className="max-w-md text-lg text-[var(--foreground)]/70">
          The anonymous messaging app. Send and receive messages without revealing
          who you are.
        </p>
      </section>

      <section className="flex flex-col gap-4 items-center sm:flex-row">
        <Link
          href="/sign-up"
          className="rounded-full bg-emerald-500 px-6 py-3 text-sm sm:text-base font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          Get started
        </Link>
        <Link
          href="/sign-in"
          className="rounded-full border border-black/[.08] dark:border-white/[.145] px-6 py-3 text-sm sm:text-base font-medium transition-colors hover:bg-black/[.03] dark:hover:bg-white/[.06]"
        >
          Sign in
        </Link>
      </section>

      <section className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.n}
            className="rounded-2xl border border-black/[.08] dark:border-white/[.1] p-5 flex flex-col gap-2"
          >
            <span className="text-emerald-500 font-[family-name:var(--font-geist-mono)] font-semibold">
              {step.n}
            </span>
            <h2 className="font-semibold">{step.title}</h2>
            <p className="text-sm text-[var(--foreground)]/60">{step.text}</p>
          </div>
        ))}
      </section>

      <footer className="text-xs text-[var(--foreground)]/40">
        Self-hosted friendly · Docker ready · Built with Next.js
      </footer>
    </main>
  );
}
