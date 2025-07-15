import express from "express"
import { createEventhandler } from "../controllers/event";

const app = express.Router();

app.post("/create", createEventhandler);


export default app;