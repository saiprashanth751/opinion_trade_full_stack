import { initiateOrderZodSchema } from "@trade/zod-schema";
import { AsyncWrapper } from "../../utils/asynCatch";

export const initiateOrderValidator = AsyncWrapper( async (req, res, next) => {
    initiateOrderZodSchema.parse(req.body);
    next();
})