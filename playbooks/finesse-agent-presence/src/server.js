/**
 * Webex Finesse Agent Presence Sync — server.js
 *
 * WHAT THIS DOES:
 *   Subscribes to Webex presence events for a configured list of agents using a
 *   Webex Bot token, then syncs each agent's Webex presence state to their
 *   Cisco Finesse agent status (READY / NOT_READY).
 *
 *   Two operating modes (controlled by GADGET_MODE env var):
 *
 *   Gadget mode (GADGET_MODE=true — recommended):
 *     Pushes presence data to the Finesse agent desktop browser via Socket.io.
 *     The WebexPresenceConnector gadget running in the agent's browser calls the
 *     Finesse client-side JS API to set the agent's own state, including specific
 *     NOT_READY reason codes ("Webex DND", "Webex Meeting", "Webex Call", etc.).
 *
 *   Server mode (GADGET_MODE=false):
 *     Calls the Finesse REST API directly using a supervisor Basic Auth token.
 *     Limited to READY and "Supervisor Initiated" NOT_READY — cannot set specific
 *     NOT_READY reason codes.
 *
 * WHAT THIS DOES NOT DO:
 *   - Token refresh — restart the server if the Webex Bot token expires
 *   - Persist state across server restarts
 *   - Support multiple Finesse clusters
 *   - Production-grade error handling or retry logic
 *
 * REQUIRED ENVIRONMENT VARIABLES (see env.template):
 *   PORT, WEBEX_ACCESS_TOKEN, GADGET_MODE, FINESSE_USERS, WEBEX_DOMAIN,
 *   FINESSE_BASE_URL, FINESSE_ORIGIN, FINESSE_ADMIN_TOKEN,
 *   FINESSE_SUPERVISOR_TOKEN (server mode only),
 *   FINESSE_REJECT_UNAUTHORIZED (optional, default "false")
 */

import express from "express";
import cors from "cors";
import 'dotenv/config';
import fetch from "node-fetch";
import http from "http";
import https from "https";
import Webex from "./webex-lite.cjs";
import { Server } from "socket.io";
import { XMLParser } from "fast-xml-parser";

const port = process.env.PORT || 5000;

// Comma-separated Finesse login names of agents to monitor (e.g. "agent1,agent2")
const subscribeUsers = process.env.FINESSE_USERS
  ? process.env.FINESSE_USERS.split(",").map(u => u.trim()).filter(Boolean)
  : [];

// Email domain for the monitored agents (e.g. "company.com")
const domain = process.env.WEBEX_DOMAIN || "";

// Base URL of your Cisco Finesse server (e.g. "https://finesse.company.com")
const finesseBaseUrl = (process.env.FINESSE_BASE_URL || "").replace(/\/$/, "");

// Whether to reject invalid/self-signed TLS certificates from the Finesse server.
// Set FINESSE_REJECT_UNAUTHORIZED=true in production when Finesse has a valid CA cert.
const rejectUnauthorized = (process.env.FINESSE_REJECT_UNAUTHORIZED || "false").toLowerCase() === "true";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // The Finesse server origin that is allowed to connect via Socket.io
    origin: process.env.FINESSE_ORIGIN || "",
    methods: ["GET", "POST"],
    credentials: true
  }
});

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(__dirname + '/public', {
  setHeaders: function(res, path) {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
}));

let finesseUsers = {};
let subscribedHash = {}; // { webexId: finesseLoginId }
let presenceHash = {};   // { finesseLoginId: { data: webexPresenceData, socket: socket.id } }
var webex;

const GADGET_MODE = (process.env.GADGET_MODE || "true").toLowerCase() === "true";

const httpsAgent = new https.Agent({
  // See note above — set FINESSE_REJECT_UNAUTHORIZED=true for production
  rejectUnauthorized: rejectUnauthorized,
});

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

app.use(cors());
app.use(express.json());


async function getFinesseUsers() {
  let resp = await fetch(`${finesseBaseUrl}/finesse/api/Users`, {
    method: "GET",
    headers: {
      'Authorization': `Basic ${process.env.FINESSE_ADMIN_TOKEN}`
    },
    agent: httpsAgent
  });
  let xmlData = await resp.text();
  const jsonData = parser.parse(xmlData);
  if (jsonData?.Users?.User?.length > 0) {
    for (let user of jsonData.Users.User) {
      console.log(user);
      finesseUsers[user.loginName] = user;
    }
  }
}

async function getFinesseUserStatus(webexId) {
  let resp = await fetch(`${finesseBaseUrl}/finesse/api/User/${subscribedHash[webexId]}`, {
    method: "GET",
    headers: {
      'Authorization': `Basic ${process.env.FINESSE_ADMIN_TOKEN}`
    },
    agent: httpsAgent
  });
  let xmlData = await resp.text();
  const jsonData = parser.parse(xmlData);
  console.log(jsonData);
  let state;
  if (jsonData?.User) {
    state = jsonData.User.state;
    if (state.toLowerCase() === "not_ready") {
      return { state: state, reason: jsonData.User.reasonCodeId };
    } else {
      return { state };
    }
  } else {
    console.log("Error: User not found for getFinesseUserStatus");
    return { state };
  }
}

async function setFinesseUserStatus(webexId, state) {
  console.log('setFinesseUserState setting user:', webexId);
  console.log('setFinesseUserState setting user to:', state);
  let resp = await fetch(`${finesseBaseUrl}/finesse/api/User/${subscribedHash[webexId]}`, {
    method: "PUT",
    headers: {
      'Authorization': `Basic ${process.env.FINESSE_SUPERVISOR_TOKEN}`,
      'Content-Type': 'application/xml'
    },
    agent: httpsAgent,
    body: `<User><state>${state}</state></User>`
  });
  console.log('setFinesseUserState result:');
  console.log(resp.status);
  let xmlData = await resp.text();
  console.log(xmlData);
}

async function syncUserPresence(presenceData) {
  let webexId = presenceData.subject;
  console.log("syncUserPresence presenceData.subject", webexId);
  console.log("syncUserPresence presenceData.status", presenceData.status);
  console.log("syncUserPresence presenceData.meetingType", presenceData.meetingType);
  if (presenceHash[subscribedHash[webexId]]) {
    presenceHash[subscribedHash[webexId]].data = presenceData;
    if (GADGET_MODE) {
      if (presenceHash[subscribedHash[webexId]].socket) {
        console.log(`syncUserPresence: emitting presence for user ${subscribedHash[webexId]}`);
        io.to(presenceHash[subscribedHash[webexId]].socket).emit("message", presenceData);
      } else {
        console.log("syncUserPresence: Server in gadget mode, but no socket for user yet.");
      }
    }
  } else {
    presenceHash[subscribedHash[webexId]] = { data: presenceData };
  }
  if (!GADGET_MODE) {
    let userStatus = await getFinesseUserStatus(webexId);
    console.log("----------------------------");
    console.log('syncUserPresence: userStatus:');
    console.log(userStatus);
    if (presenceData.status === "dnd" || (presenceData.status === "meeting" && presenceData.meetingType === "online")) {
      if (userStatus.state.toLowerCase() === "ready") {
        await setFinesseUserStatus(webexId, "NOT_READY");
      } else {
        console.log("syncUserPresence: No state change needed.");
      }
    } else {
      if (userStatus.state.toLowerCase() === "not_ready") {
        if ([19, -1, undefined].indexOf(userStatus.reason) >= 0) {
          await setFinesseUserStatus(webexId, "READY");
        } else {
          console.log("syncUserPresence: finessePresence was set by user - we cannot override.");
        }
      } else {
        console.log("syncUserPresence: No state change needed.");
      }
    }
    console.log("----------------------------");
  }
}

async function subscribePresence(id) {
  try {
    await webex.internal.presence.subscribe(id, 600);
    console.log("subscribed...");
    const response = await webex.internal.presence.list([id]);
    console.log("******************************");
    console.log(response.statusList[0]);
    await syncUserPresence(response.statusList[0]);
    console.log("******************************");
    setInterval(async function() {
      try {
        console.log("resubscribing id:", id);
        await webex.internal.presence.subscribe(id, 600);
      } catch (ex) {
        console.error("subscribePresence resubscribe error:");
        console.error(ex);
      }
    }, 1000 * 300);
  } catch (e) {
    console.error("subscribePresence error:");
    console.error(e);
  }
}

async function subscribePresenceInitial(user) {
  try {
    console.log("******* subscribePresenceInitial: *******");
    let email = `${user}@${domain}`;
    let people = await webex.people.list({ email: email });
    if (people?.items.length > 0) {
      console.log('people.items[0]:');
      console.log(people.items[0]);
      var idString = Buffer.from(people.items[0].id, 'base64').toString('utf-8');
      console.log(idString);
      let id = idString.split("/").slice(-1)[0];
      subscribedHash[id] = finesseUsers[user].loginId;
      await subscribePresence(id);
    } else {
      console.error("Error: subscribePresenceInitial no user found for", email);
    }
  } catch (error) {
    console.error("subscribePresenceInitial Error:");
    console.error(error);
  }
}


app.get("/users", async function(req, res, next) {
  res.setHeader('Content-Type', "application/json");
  res.send(JSON.stringify(presenceHash));
});

app.get("/user/:userId", async function(req, res, next) {
  res.setHeader('Content-Type', "application/json");
  console.log(`GET /user/${req.params.userId}`);
  res.send(JSON.stringify(presenceHash[req.params.userId]));
});

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);
  socket.on('message', (msg) => {
    console.log(socket.id, "sent message:");
    console.log(msg);
    if (msg.id) {
      if (presenceHash[msg.id]) {
        presenceHash[msg.id].socket = socket.id;
        io.to(socket.id).emit("message", presenceHash[msg.id].data);
      } else {
        presenceHash[msg.id] = { socket: socket.id };
      }
      console.log("set socket.id for presence user:", msg.id);
    } else {
      console.log("unknown message format.");
    }
  });
});

server.listen(port, async () => {
  try {
    await getFinesseUsers();
  } catch (err) {
    console.error("Startup: Finesse unavailable, skipping user load:", err.message);
  }

  webex = Webex.init({
    credentials: {
      access_token: process.env.WEBEX_ACCESS_TOKEN
    }
  });
  console.log("Webex Initialized.");

  webex.once("ready", async () => {
    console.log(`Webex OBJ ready ${webex.version}`);

    webex.internal.device.register().then(() => {
      console.info(`Meetings:index#register --> INFO, Device registered ${webex.internal.device.url}`);
    }).then(() => {
      webex.internal.mercury.connect();
    }).then(async () => {
      let me = await webex.people.get("me");
      console.log(me);
      webex.internal.mercury.on('event:apheleia.subscription_update', async (event) => {
        if (subscribedHash[event.data.subject]) {
          console.log('event.data:', event.data);
          await syncUserPresence(event.data);
        }
      });
      for (let user of subscribeUsers) {
        subscribePresenceInitial(user);
      }
    }).catch(err => {
      console.error("Startup: Webex SDK init failed (check WEBEX_ACCESS_TOKEN):", err.message);
    });
  });
  console.log(`listening on ${port}`);
});
