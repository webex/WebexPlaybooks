/**
 * Webex Contact Center Audio Files — Express backend
 *
 * What this does: OAuth code exchange (Webex), stores user/tokens in MongoDB, and exposes
 * API routes that call the WxCC Audio Files API (list, upload, patch, delete) using the
 * stored access token.
 *
 * What it does NOT do: Token refresh, production-grade error handling, or rate limiting.
 * Secrets must be set via environment variables (see env.template).
 *
 * Required env: MONGO_URI, PORT, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI.
 * Optional: WXCC_API_BASE (defaults to https://api.wxcc-us1.cisco.com).
 */
import express from 'express'
import dotenv from 'dotenv'
import { connectDB } from './config/db.js';
import userRoutes from "./routes/user.route.js";
import audiofileRoutes from "./routes/audiofile.route.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json())

app.use("/api/users", userRoutes);

app.use("/api/audiofiles", audiofileRoutes);

app.listen(PORT, () => {
    connectDB();
    console.log(`server started at http://localhost:${PORT}`)
});