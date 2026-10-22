import mong, { Schema, Document } from 'mongoose';

/**
 * Holds signups that have not completed email verification yet.
 *
 * The username is NOT claimed in the real users collection until the
 * OTP is verified and the account is finalized. A TTL index deletes
 * entries automatically 24h after creation, so abandoned signups free
 * their reserved usernames without any cron job.
 */
export interface PendingUser extends Document {
    username: string;
    email: string;
    password: string; // bcrypt hash
    verifyCode: string;
    verifyCodeExpiry: Date;
    createdAt: Date;
}

const pendingUserSchema: Schema<PendingUser> = new Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            minlength: 3,
            maxlength: 20,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: true,
        },
        verifyCode: {
            type: String,
            required: true,
        },
        verifyCodeExpiry: {
            type: Date,
            required: true,
        },
        createdAt: {
            type: Date,
            required: true,
            default: Date.now,
            // MongoDB TTL: remove the document once createdAt + 24h passed.
            expires: '24h',
        },
    }
);

// Fast lookups by email/username; uniqueness is enforced in application
// code (see api/sign-up + api/verify) so partially expired docs can be
// handled smoothly instead of throwing duplicate-key errors.
pendingUserSchema.index({ email: 1 });
pendingUserSchema.index({ username: 1 });

export const PendingUserModel =
    (mong.models.PendingUser as mong.Model<PendingUser>) ||
    mong.model<PendingUser>('PendingUser', pendingUserSchema);
