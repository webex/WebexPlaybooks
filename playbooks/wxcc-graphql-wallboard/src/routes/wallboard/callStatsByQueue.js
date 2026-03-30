import express from "express";
const router = express.Router();

import { getWallboardLookbackDays } from "../../controller/wxccApi.js";
import { callStatsByQueue } from "../../controller/wallboard/callStatsByQueue.js";

router.get("/", async (req, res) => {
  res.json({
    data: await callStatsByQueue(),
    wallboard_lookback_days: getWallboardLookbackDays()
  });
});

export { router as callStatsByQueue };
