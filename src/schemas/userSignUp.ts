import { z } from 'zod';

const userNameVal = z
    .string()
    .min(3, { message: 'Username must be at least 3 characters' })
    .max(20, { message: 'Username must be at most 20 characters' })
    .regex(/^[a-zA-Z0-9_.-]+$/, {
        message: 'Username can only contain letters, numbers, dots, dashes and underscores',
    });

export const userSchema = z.object({
    username: userNameVal.transform((v) => v.toLowerCase()),
    email: z.string().email({ message: 'Invalid email' }).transform((v) => v.toLowerCase()),
    password: z
        .string()
        .min(4, { message: 'Password must be at least 4 characters long' })
        .max(72, { message: 'Password must be shorter than 72 characters' }),
});
