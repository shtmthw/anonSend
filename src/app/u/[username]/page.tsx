import SendMessageForm from "./SendMessageForm";

export default async function SendPage({
    params,
}: {
    params: Promise<{ username: string }>;
}) {
    const username = (await params).username;

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
            <SendMessageForm username={username.toLowerCase()} />
        </main>
    );
}
