import { z } from 'zod';

export const verifyCodeSchema = z.object({
    code: z.string({ message: 'Invalid code.' }).length(6, { message: 'Code must be 6 digits long!' }),
});
