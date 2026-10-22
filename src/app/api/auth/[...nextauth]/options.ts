import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { UserModel } from '@/model/user'
import DBconnect from '@/lib/DBconnect'

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            id: "credentials",
            name: "Credentials",
            credentials: {
                email: { label: "Email or username", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials: Record<string, string | undefined> | undefined) {
                await DBconnect();

                const identifier = (credentials?.identifier ?? credentials?.email ?? "")
                    .trim()
                    .toLowerCase();
                const password = credentials?.password ?? "";

                if (!identifier || !password) {
                    throw new Error("Please provide your email/username and password.");
                }

                // Email OR username both work as the identifier.
                const user = await UserModel.findOne({
                    $or: [{ email: identifier }, { username: identifier }]
                });

                if (!user) {
                    throw new Error("No user found!");
                }

                if (!user.isVerified) {
                    throw new Error("Please verify your account before continuing.");
                }

                const isPassMatching = await bcrypt.compare(password, user.password);

                if (!isPassMatching) {
                    throw new Error("Password is incorrect!");
                }

                return {
                    id: user._id!.toString(),
                    _id: user._id!.toString(),
                    username: user.username,
                    email: user.email,
                    isVerified: user.isVerified,
                    isAcceptingMsg: user.isAcceptingMsg,
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token._id = user._id?.toString();
                token.username = user.username;
                token.isVerified = user.isVerified;
                token.isAcceptingMsg = user.isAcceptingMsg;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user._id = token._id;
                session.user.username = token.username;
                session.user.isAcceptingMsg = token.isAcceptingMsg;
                session.user.isVerified = token.isVerified;
            }
            return session;
        }
    },
    pages: {
        signIn: '/sign-in'
    },
    session: {
        strategy: 'jwt'
    },
    secret: process.env.NEXTAUTH_SECRET
};
