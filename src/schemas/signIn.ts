import { z } from 'zod';

export const signInSchema = z.object({
    identifier: z.string({ message: 'Invalid identifier.' }).min(1),
    password: z.string({ message: 'Invalid password.' }).min(1),
});
