import { Messages } from "@/model/user";

export interface Apiresp {
    success: boolean;
    message: string;
    isAcceptingMsg?: boolean;
    messages?: Array<Messages>;
}
