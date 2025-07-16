import express from "express"
import { initiateOrderValidator } from "../middlewares/validators/initiate.validator";

const app = express.Router();

app.post("/initiate", initiateOrderValidator, )
