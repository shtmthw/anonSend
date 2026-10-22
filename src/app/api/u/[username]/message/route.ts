import { NextResponse } from 'next/server';
import DBconnect from '@/lib/DBconnect';
import { UserModel, Messages } from '@/model/user';
import { messageSchema } from '@/schemas/messages';

// The messages live in an embedded array (16MB document limit), so keep
// a sane cap per user. Users can contact the host to have their inbox
// cleared once full.
const MAX_MESSAGES_PER_USER = 300;

type RouteContext = { params: Promise<{ username: string }> };

export async function GET(_request: Request, context: RouteContext) {
    await DBconnect();

    try {
        const { username } = await context.params;

        const user = await UserModel.findOne({ username: username.toLowerCase() }).select(
            'username isAcceptingMsg'
        );

        if (!user) {
            return NextResponse.json(
                { success: false, msg: 'No user found with that username.' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                username: user.username,
                isAcceptingMsg: user.isAcceptingMsg,
            },
            { status: 200 }
        );
    } catch (e) {
        console.error('Error looking up user:', e);
        return NextResponse.json({ success: false, msg: 'Error looking up user' }, { status: 500 });
    }
}

export async function POST(request: Request, context: RouteContext) {
    await DBconnect();

    try {
        const { username } = await context.params;

        const parsed = messageSchema.safeParse(await request.json());

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, msg: parsed.error.issues[0]?.message ?? 'Invalid message.' },
                { status: 400 }
            );
        }

        const recipient = await UserModel.findOne({ username: username.toLowerCase() }).select(
            'username isAcceptingMsg messages'
        );

        if (!recipient) {
            return NextResponse.json(
                { success: false, msg: 'That user does not exist.' },
                { status: 404 }
            );
        }

        if (!recipient.isAcceptingMsg) {
            return NextResponse.json(
                { success: false, msg: 'This user is not accepting messages right now.' },
                { status: 403 }
            );
        }

        if (recipient.messages.length >= MAX_MESSAGES_PER_USER) {
            return NextResponse.json(
                { success: false, msg: 'This inbox is full, no more messages can be accepted.' },
                { status: 507 }
            );
        }

        recipient.messages.push({ content: parsed.data.message, date: new Date() } as Messages);
        await recipient.save();

        return NextResponse.json(
            { success: true, msg: 'Your anonymous message was delivered!' },
            { status: 201 }
        );
    } catch (e) {
        console.error('Error sending message:', e);
        return NextResponse.json(
            { success: false, msg: 'Error sending message' },
            { status: 500 }
        );
    }
}
