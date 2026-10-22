import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import DBconnect from '@/lib/DBconnect';
import { UserModel } from '@/model/user';
import { acceptMessageSchema } from '@/schemas/acceptMessages';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?._id) {
            return NextResponse.json({ success: false, msg: 'Unauthorized' }, { status: 401 });
        }

        const parsed = acceptMessageSchema.safeParse(await request.json());

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, msg: 'Invalid request body' },
                { status: 400 }
            );
        }

        await DBconnect();

        const user = await UserModel.findById(session.user._id).select('isAcceptingMsg');

        if (!user) {
            return NextResponse.json({ success: false, msg: 'User not found' }, { status: 404 });
        }

        user.isAcceptingMsg = parsed.data.isAcceptingMsg;
        await user.save();

        return NextResponse.json(
            {
                success: true,
                msg: user.isAcceptingMsg
                    ? 'Your inbox is now accepting anonymous messages.'
                    : 'Your inbox is now paused. New messages will be rejected.',
                isAcceptingMsg: user.isAcceptingMsg,
            },
            { status: 200 }
        );
    } catch (e) {
        console.error('Error updating accept-messages:', e);
        return NextResponse.json(
            { success: false, msg: 'Error updating accept-messages' },
            { status: 500 }
        );
    }
}
