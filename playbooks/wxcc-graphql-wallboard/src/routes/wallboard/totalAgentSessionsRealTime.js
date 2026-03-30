import express from "express";
const router = express.Router();

import { getWallboardLookbackDays } from "../../controller/wxccApi.js";
import { totalAgentSessionsRealTime } from "../../controller/wallboard/totalAgentSessionsRealTime.js";

router.get("/", async (req, res) => {
  res.json({
    data: await totalAgentSessionsRealTime(),
    wallboard_lookback_days: getWallboardLookbackDays()
  });
});

export { router as totalAgentSessionsRealTime };
