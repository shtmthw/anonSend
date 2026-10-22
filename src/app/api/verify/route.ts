import { NextResponse } from 'next/server';
import DBconnect from '@/lib/DBconnect';
import { UserModel } from '@/model/user';
import { verifyCodeSchema } from '@/schemas/verificationCode';

// The field is required by the schema, so replace a used code with random
// junk instead of an empty string (which mongoose validation would reject).
function invalidateCode(): string {
    return crypto.randomUUID().replaceAll('-', '');
}

export async function POST(request: Request) {
    await DBconnect();

    try {
        const body = await request.json();
        const parsed = verifyCodeSchema.safeParse({ code: body?.code });

        if (!parsed.success || typeof body?.email !== 'string') {
            return NextResponse.json(
                { success: false, msg: 'Invalid verification details.' },
                { status: 400 }
            );
        }

        const { code } = parsed.data;
        const email = body.email.trim().toLowerCase();

        const user = await UserModel.findOne({ email });

        if (!user) {
            return NextResponse.json(
                { success: false, msg: 'No account found for this email.' },
                { status: 404 }
            );
        }

        if (user.isVerified) {
            return NextResponse.json(
                { success: true, msg: 'Account is already verified, you can sign in.' },
                { status: 200 }
            );
        }

        if (user.verifyCode !== code) {
            return NextResponse.json(
                { success: false, msg: 'Incorrect verification code.' },
                { status: 400 }
            );
        }

        if (new Date(user.verifyCodeExpiry).getTime() < Date.now()) {
            return NextResponse.json(
                { success: false, msg: 'This code has expired. Sign up again with the same email to receive a new one.' },
                { status: 400 }
            );
        }

        user.isVerified = true;
        user.verifyCode = invalidateCode();
        user.verifyCodeExpiry = new Date(Date.now() - 1000);
        await user.save();

        return NextResponse.json(
            { success: true, msg: 'Account verified! You can sign in now.' },
            { status: 200 }
        );
    } catch (e) {
        console.error('Error during verification:', e);
        return NextResponse.json(
            { success: false, msg: 'Error during verification' },
            { status: 500 }
        );
    }
}
