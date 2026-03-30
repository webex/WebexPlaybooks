import express from "express";
const router = express.Router();

import { getWallboardLookbackDays } from "../../controller/wxccApi.js";
import { callCountByEntryPoint } from "../../controller/wallboard/callCountByEntryPoint.js";

router.get("/", async (req, res) => {
  res.json({
    data: await callCountByEntryPoint(),
    wallboard_lookback_days: getWallboardLookbackDays()
  });
});

export { router as callCountByEntryPoint };
