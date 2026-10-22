import { NextResponse } from 'next/server';
import DBconnect from '@/lib/DBconnect';
import { UserModel } from '@/model/user';
import { PendingUserModel } from '@/model/pendingUser';
import bcrypt from 'bcryptjs';
import { userSchema } from '@/schemas/userSignUp';
import { sendVerificationEmail } from '@/helpers/sendOtpEmail';

const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function generateVerifyCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Sign-up reserves the email + username in the PendingUser collection only.
 * The username is claimed in the real users collection when the OTP is
 * verified (see api/verify).
 */
export async function POST(request: Request) {
    await DBconnect();

    try {
        const parsed = userSchema.safeParse(await request.json());

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, msg: parsed.error.issues[0]?.message ?? 'Invalid signup details.' },
                { status: 400 }
            );
        }

        const { username, email, password } = parsed.data;

        // Legacy cleanup: unverified user docs from older versions of this
        // app never completed verification, so their name/email claims are
        // invalid. Free them before the conflict checks. ($ne: true also
        // catches legacy documents that stored isVerified as "false".)
        await UserModel.deleteMany({
            isVerified: { $ne: true },
            $or: [{ email }, { username }],
        });

        // Conflicts against finalized (verified) accounts
        if (await UserModel.findOne({ email }).select('_id')) {
            return NextResponse.json(
                { success: false, msg: 'Email is already in use by a verified account.' },
                { status: 400 }
            );
        }

        if (await UserModel.findOne({ username }).select('_id')) {
            return NextResponse.json(
                { success: false, msg: 'Username already taken, choose another one.' },
                { status: 400 }
            );
        }

        // Conflicts against other pending signups
        if (await PendingUserModel.findOne({ username, email: { $ne: email } }).select('_id')) {
            return NextResponse.json(
                { success: false, msg: 'Username already taken, choose another one.' },
                { status: 400 }
            );
        }

        const verifyCode = generateVerifyCode();
        const verifyCodeExpiry = new Date(Date.now() + CODE_TTL_MS);
        const hashedPassword = await bcrypt.hash(password, 10);

        const existingPending = await PendingUserModel.findOne({ email });

        if (existingPending) {
            // The email has a signup in progress. With a matching password we
            // refresh + resend the code; otherwise do not leak any info.
            const passwordMatches = await bcrypt.compare(password, existingPending.password);

            if (!passwordMatches) {
                return NextResponse.json(
                    {
                        success: false,
                        msg: 'This email has a verification in progress, but the password did not match.',
                    },
                    { status: 401 }
                );
            }

            // A verified account may have grabbed this username since the
            // pending entry was created (they last up to 24h).
            if (await UserModel.findOne({ username }).select('_id')) {
                return NextResponse.json(
                    {
                        success: false,
                        msg: 'This username is no longer available. Sign up again with another username.',
                    },
                    { status: 409 }
                );
            }

            await PendingUserModel.updateOne(
                { _id: existingPending._id },
                {
                    $set: {
                        username,
                        verifyCode,
                        verifyCodeExpiry,
                        createdAt: new Date(), // restart the 24h TTL
                    },
                }
            );

            const emailResponse = await sendVerificationEmail(username, email, verifyCode);
            if (!emailResponse.success) {
                return NextResponse.json(
                    { success: false, msg: `Could not resend the verification email: ${emailResponse.message}` },
                    { status: 500 }
                );
            }

            return NextResponse.json(
                { success: true, msg: 'Verification code re-sent to your email.' },
                { status: 200 }
            );
        }

        // Fresh signup: reserve email + username as pending.
        await PendingUserModel.create({
            username,
            email,
            password: hashedPassword,
            verifyCode,
            verifyCodeExpiry,
            createdAt: new Date(),
        });

        const emailResponse = await sendVerificationEmail(username, email, verifyCode);
        if (!emailResponse.success) {
            // Nothing was claimed in the users collection. They can simply
            // sign up again (same email + password) to resend a fresh code.
            return NextResponse.json(
                {
                    success: true,
                    msg: `Account reserved, but the verification email could not be sent: ${emailResponse.message} Sign up again to resend.`,
                },
                { status: 201 }
            );
        }

        return NextResponse.json(
            { success: true, msg: 'Signup reserved. Verification code sent to your email.' },
            { status: 201 }
        );
    } catch (e) {
        console.error('Error during signup:', e);
        return NextResponse.json(
            { success: false, msg: 'Error during signup' },
            { status: 500 }
        );
    }
}
