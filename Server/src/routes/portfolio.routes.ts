import express from "express";
import { getPortfolioController } from "../controllers/portfolio.controller";

const router = express.Router();

router.get("/portfolio/:clientId", getPortfolioController);

export default router;