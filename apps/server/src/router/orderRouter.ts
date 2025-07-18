import express from "express"
import { initiateOrderValidator } from "../middlewares/validators/initiate.validator";
import { placeHandler } from "../controllers/order";

const app = express.Router();

app.post("/initiate", initiateOrderValidator, placeHandler)

export default app;
