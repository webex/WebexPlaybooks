import express from "express";
import cors from "cors";
import 'dotenv/config';
import http from "http";
import { Server } from "socket.io";

import Cache from 'ttl-mem-cache';
const cache = new Cache();

const app = express();
const port = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server,{
  cors: {
    origin: "https://desktop.wxcc-us1.cisco.com",
    methods: ["GET", "POST"],
    credentials: true
  }
} );

//needed for CommonJS
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(__dirname + "/src"));
app.use(express.json());

const MAX_ATTEMPTS = 5; // TODO: Should calculate this based on the 4 second multiplier in the flow's hold music. i.e. 10 = 40 seconds -  not long enough.

app.post('/transfer-hold', async (req, res) => {
  console.log('/transfer-hold POST body:');
  console.log(req.body);
  let response = {
    ready: false
  }
  if(req.body.attempt && !isNaN(parseInt(req.body.attempt))){
    try{
      let attempt = parseInt(req.body.attempt);
      if(attempt >= MAX_ATTEMPTS){
        response.ready = true;
      } else {
        response.attempt = attempt + 1;
      }
    }catch(e){
      console.log('Error checking attempt:');
      console.log(e);
    }
  }
  let cached = cache.get(req.body.number);
  console.log('cached:');
  console.log(cached);
  if(cached){
    response.agentNumber = cached.agentNumber;
    if(cached.agentReady){
      response.ready = true;
    }
  }
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(response); // Using .json() instead of .send()
});

// Fix malformed Headers: provider="value" breaks JSON; normalize to provider=value
function fixProviderQuotes(str) {
  return str.replace(/provider="([^"]*)"/g, 'provider=$1');
}

app.post('/', express.text({ type: 'text/plain' }), async (req, res) => {
  let body = req.body;
  if (typeof body === 'string') {
    body = fixProviderQuotes(body);
    try {
      body = JSON.parse(body);
    } catch (e) {
      console.log('POST / JSON parse error:', e.message);
      return res.status(400).send('Invalid JSON');
    }
  }
  console.log('/ POST body:');
  console.log(body);
  if (body?.InteractionId) {
    cache.set(body.InteractionId, body, 3600 * 1000);
    io.to(body.OrgId).emit('message', body);
    console.log("Cached", body.InteractionId);
  }
  res.status(200).send('OK');
});

app.options('/callerIds', cors());
app.post('/callerIds', cors(), async (req, res) => {
  try{
    let response = [];
    console.log('/callerIds body:');
    console.log(req.body);
    if(req.body?.taskIds && req.body.taskIds.length > 0){
      for(let t of req.body.taskIds){
        let callerId = cache.get(t);
        if(callerId){
          response.push(callerId);
        } else {
          response.push({InteractionId: t});
        }
      }
    }
    console.log('Found callerIds:');
    console.log(response);
    res.setHeader('Content-Type',"application/json");
    res.send(JSON.stringify(response));
  } catch (e) {
    console.log('Error getting callerIds:');
    console.log(e);
    res.status(500).send('Internal Server Error');
  }
});


io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);
  console.log(socket.handshake.auth);
  if(socket.handshake.auth.orgId){
    console.log("joining", socket.handshake.auth.orgId);
    socket.join(socket.handshake.auth.orgId);
  }
  socket.on('message', (msg) => {
    console.log(socket.id, "sent message:");
    console.log(msg);
    if(msg.command === "transfer-hold"){
      console.log('setting cache for', msg.number, 'to agentReady: false');
      cache.set(msg.number, {owner: msg.owner, state: msg.command, agentNumber: msg.agentNumber, agentReady: false}, 3600 * 1000);
    }else if(msg.command === "transfer-merge"){
      console.log('setting cache for', msg.number, 'to agentReady: true');
      cache.set(msg.number, {owner: msg.owner, state: msg.command, agentNumber: msg.agentNumber, agentReady: true}, 3600 * 1000);
    }
  });
});

server.listen(port, () => {
  console.log(`listening on ${port}`);
});
