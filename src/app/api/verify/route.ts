import { NextResponse } from 'next/server';
import DBconnect from '@/lib/DBconnect';
import { UserModel } from '@/model/user';
import { PendingUserModel } from '@/model/pendingUser';
import { verifyCodeSchema } from '@/schemas/verificationCode';

// The real user schema requires these fields; once verified they carry no
// meaning, so fill them with inert random/past values.
function invalidateCode(): string {
    return crypto.randomUUID().replaceAll('-', '');
}

/**
 * Finalizes a pending signup: checks the emailed 6-digit code, re-checks
 * username availability, then creates the real user. The username becomes
 * officially claimed at this point only.
 */
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

        const pending = await PendingUserModel.findOne({ email });

        if (!pending) {
            // Maybe the account was verified in the meantime (double submit).
            const user = await UserModel.findOne({ email }).select('isVerified');
            if (user?.isVerified) {
                return NextResponse.json(
                    { success: true, msg: 'Account is already verified, you can sign in.' },
                    { status: 200 }
                );
            }
            return NextResponse.json(
                { success: false, msg: 'No verification in progress for this email. Sign up again to receive a fresh code.' },
                { status: 404 }
            );
        }

        if (await UserModel.findOne({ email }).select('_id')) {
            // A verified account with this email already exists; the pending
            // entry is stale. Remove it so the name/email claims free up.
            await PendingUserModel.deleteOne({ _id: pending._id });
            return NextResponse.json(
                { success: true, msg: 'Account is already verified, you can sign in.' },
                { status: 200 }
            );
        }

        if (pending.verifyCode !== code) {
            return NextResponse.json(
                { success: false, msg: 'Incorrect verification code.' },
                { status: 400 }
            );
        }

        if (pending.verifyCodeExpiry.getTime() < Date.now()) {
            return NextResponse.json(
                { success: false, msg: 'This code has expired. Sign up again with the same email to receive a new one.' },
                { status: 400 }
            );
        }

        // Username may have been grabbed while they waited. Since this is
        // the moment it becomes official, check users AND other pendings.
        const usernameTaken =
            (await UserModel.findOne({ username: pending.username }).select('_id')) ||
            (await PendingUserModel.findOne({
                username: pending.username,
                email: { $ne: email },
            }).select('_id'));

        if (usernameTaken) {
            // Keep their signup but tell them to re-sign up: on the next
            // signup they keep email + password and just change the username.
            return NextResponse.json(
                {
                    success: false,
                    msg: `The username "${pending.username}" is no longer available. Sign up again with another username.`,
                },
                { status: 409 }
            );
        }

        try {
            await UserModel.create({
                username: pending.username,
                email: pending.email,
                password: pending.password, // already bcrypt-hashed
                verifyCode: invalidateCode(),
                verifyCodeExpiry: new Date(Date.now() - 1000),
                isVerified: true,
                isAcceptingMsg: true,
                messages: [],
            });
        } catch (createError) {
            // Unique index guard against a race between two verifications.
            if (createError instanceof Error && 'code' in createError && (createError as { code?: number }).code === 11000) {
                return NextResponse.json(
                    { success: false, msg: 'This username was just taken. Sign up again with another username.' },
                    { status: 409 }
                );
            }
            throw createError;
        }

        // Claims settled: the pending reservation is no longer needed.
        await PendingUserModel.deleteOne({ _id: pending._id });

        return NextResponse.json(
            { success: true, msg: 'Account created! You can sign in now.' },
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
