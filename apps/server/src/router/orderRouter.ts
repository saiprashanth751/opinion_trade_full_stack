import express from "express"
// import { initiateOrderValidator } from "../middlewares/validators/initiate.validator";
import { placeHandler } from "../controllers/order";

const app = express.Router();
//Are you sure that you have implemented all the routes?? 
//The ans is clearly no...
//todo: use middlew are, implement proper user input validation

app.post("/initiate", placeHandler)

export default app;
