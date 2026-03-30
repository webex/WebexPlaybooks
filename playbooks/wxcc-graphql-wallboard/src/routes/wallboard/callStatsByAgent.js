import express from "express";
const router = express.Router();

import { getWallboardLookbackDays } from "../../controller/wxccApi.js";
import { callStatsByAgent } from "../../controller/wallboard/callStatsByAgent.js";

router.get("/", async (req, res) => {
  res.json({
    data: await callStatsByAgent(),
    wallboard_lookback_days: getWallboardLookbackDays()
  });
});

export { router as callStatsByAgent };
