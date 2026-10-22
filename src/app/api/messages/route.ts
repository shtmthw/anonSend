import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import DBconnect from '@/lib/DBconnect';
import { UserModel } from '@/model/user';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?._id) {
            return NextResponse.json({ success: false, msg: 'Unauthorized' }, { status: 401 });
        }

        await DBconnect();

        const user = await UserModel.findById(session.user._id).select(
            'username isAcceptingMsg messages'
        );

        if (!user) {
            return NextResponse.json({ success: false, msg: 'User not found' }, { status: 404 });
        }

        const messages = [...user.messages]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((m) => ({ content: m.content, date: m.date }));

        return NextResponse.json(
            {
                success: true,
                username: user.username,
                isAcceptingMsg: user.isAcceptingMsg,
                messages,
            },
            { status: 200 }
        );
    } catch (e) {
        console.error('Error fetching messages:', e);
        return NextResponse.json({ success: false, msg: 'Error fetching messages' }, { status: 500 });
    }
}
