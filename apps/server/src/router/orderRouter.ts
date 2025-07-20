import express from "express"
import { initiateOrderValidator } from "../middlewares/validators/initiate.validator";
import { placeHandler } from "../controllers/order";

const app = express.Router();
//Are you sure that you have implemented all the routes?? 
//The ans is clearly no...

app.post("/initiate", initiateOrderValidator, placeHandler)

export default app;
