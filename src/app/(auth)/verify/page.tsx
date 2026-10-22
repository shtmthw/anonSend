import Link from "next/link";
import VerifyForm from "./VerifyForm";

export default async function VerifyPage({
    searchParams,
}: {
    searchParams: Promise<{ email?: string }>;
}) {
    const email = (await searchParams).email ?? "";

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
            <Link href="/" className="text-2xl font-bold tracking-tight">
                anon<span className="text-emerald-500">Send</span>
            </Link>
            <VerifyForm email={email} />
        </main>
    );
}
