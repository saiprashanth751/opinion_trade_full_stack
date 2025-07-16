import express from "express"
import { createEventhandler, getTradeSummaryHandler } from "../controllers/event";

const app = express.Router();

// validation middleware...
app.post("/create", createEventhandler);
app.get("/tradeSummary", getTradeSummaryHandler)

export default app;