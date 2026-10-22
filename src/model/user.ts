import mong, { Schema, Document } from 'mongoose';

export interface Messages extends Document {
    content: string;
    date: Date;
}

const msgSchema: Schema<Messages> = new Schema({
    content: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
});

export interface User extends Document {
    username: string,
    password: string,
    email: string,
    verifyCode: string,
    verifyCodeExpiry: Date,
    isAcceptingMsg: boolean,
    isVerified: boolean,
    messages: Messages[]
}

const userSchema: Schema<User> = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            minlength: 3,
            maxlength: 20,
        },
        password: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        // Bug fix: this was `String`, which made every truthy value
        // ("false" included) count as verified.
        isVerified: {
            type: Boolean,
            required: true,
            default: false,
        },
        verifyCode: {
            type: String,
            required: true,
        },
        verifyCodeExpiry: {
            type: Date,
            required: true,
        },
        isAcceptingMsg: {
            type: Boolean,
            required: true,
            default: true,
        },
        messages: [msgSchema],
    },
    { timestamps: true }
);

export const UserModel =
    (mong.models.User as mong.Model<User>) || mong.model<User>('User', userSchema);
