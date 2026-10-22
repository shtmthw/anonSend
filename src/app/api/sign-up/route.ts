import { NextResponse } from 'next/server';
import DBconnect from '@/lib/DBconnect';
import { UserModel } from '@/model/user';
import bcrypt from 'bcryptjs';
import { userSchema } from '@/schemas/userSignUp';
import { sendVerificationEmail } from '@/helpers/sendOtpEmail';

const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function generateVerifyCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

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

        // Check if the email already exists
        const isEmailExisting = await UserModel.findOne({ email });

        if (isEmailExisting) {
            if (isEmailExisting.isVerified) {
                return NextResponse.json(
                    { success: false, msg: 'Email is already in use by a verified account.' },
                    { status: 400 }
                );
            }

            // Unverified account: if the password matches, refresh + resend the code
            const passwordMatching = await bcrypt.compare(password, isEmailExisting.password);

            if (!passwordMatching) {
                return NextResponse.json(
                    { success: false, msg: 'This email is registered but unverified, and the password did not match.' },
                    { status: 401 }
                );
            }

            const verifyCode = generateVerifyCode();
            isEmailExisting.verifyCode = verifyCode;
            isEmailExisting.verifyCodeExpiry = new Date(Date.now() + CODE_TTL_MS);
            await isEmailExisting.save();

            const emailResponse = await sendVerificationEmail(isEmailExisting.username, email, verifyCode);
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

        // Check username availability
        const isUsernameTaken = await UserModel.findOne({ username });
        if (isUsernameTaken) {
            return NextResponse.json(
                { success: false, msg: 'Username already taken, choose another one.' },
                { status: 400 }
            );
        }

        // If email doesn't exist, create a new user
        const verifyCode = generateVerifyCode();
        const codeExpiringDate = new Date(Date.now() + CODE_TTL_MS);
        const hashedPass = await bcrypt.hash(password, 10);

        const newUser = new UserModel({
            username,
            email,
            password: hashedPass,
            verifyCode,
            verifyCodeExpiry: codeExpiringDate,
            isAcceptingMsg: true,
            isVerified: false,
            messages: [],
        });

        await newUser.save();

        // Send verification email
        const emailResponse = await sendVerificationEmail(username, email, verifyCode);
        if (!emailResponse.success) {
            // Account exists, but without the email they can't verify.
            // Tell the user clearly instead of silently swallowing the error.
            return NextResponse.json(
                { success: true, msg: `Account created, but the verification email could not be sent: ${emailResponse.message}` },
                { status: 201 }
            );
        }

        return NextResponse.json(
            { success: true, msg: 'User successfully registered, verification code sent to your email.' },
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
