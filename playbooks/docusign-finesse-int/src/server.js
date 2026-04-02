/**
 * DocuSign + Cisco Finesse + Webex sample (playbook scaffold).
 *
 * Demonstrates: Webex OAuth refresh token, Finesse Task Routing XML POST,
 * Webex Meetings / xAPI Desk WebView, DocuSign JWT envelopes and webhooks.
 *
 * Not production-ready: broad CORS, minimal validation, optional TLS verification
 * bypass for lab Finesse (see FINESSE_ALLOW_INSECURE_TLS in env.template).
 *
 * Required env: see env.template in this directory (Webex, Finesse, DocuSign,
 * BASE_URL for webhooks, optional FINESSE_SESSION_COOKIE).
 */
const express = require("express");
const path = require("path");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const { createServer } = require("node:http");
const cron = require("node-cron");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const docusign = require("docusign-esign");

const app = express();
const server = createServer(app);
let deviceMainId = null;
const getAccessToken = require("./utils/get-access-token.js");
const socketIo = require("socket.io");
const getGuestToken = require("./utils/get-guest-token.js");
const port = process.env.PORT || 3000;
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const { parseString } = require("xml2js");
let socketClient = null;

if (process.env.FINESSE_ALLOW_INSECURE_TLS === "true") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

cron.schedule("0 0 */13 * *", () => {
  console.log("Generating new access token");
  getAccessToken();
});

app.use(express.static(path.join(__dirname, "dist")));
app.use(express.static(__dirname));
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use(cors());
app.get("/hangup", (req, res) => {
  res.send("Call has been ended");
});

app.post("/end-meeting", async (req, res) => {
  console.log(req.body);
  const { accessToken, destination } = req.body;
  await axios
    .get(`${process.env.WEBEX_API_URL}/meetings?webLink=${destination}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    })
    .then(async (resp) => {
      const id = resp.data.items[0].id;
      console.log("id", id);
      await axios
        .get(
          `${process.env.WEBEX_API_URL}/meetingParticipants?meetingId=${id}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          }
        )
        .then(async (resp) => {
          console.log("res", resp.data);
          resp.data.items.forEach(async (participant) => {
            const data = {
              expel: true,
            };
            await axios
              .put(
                `${process.env.WEBEX_API_URL}/meetingParticipants/${participant.id}`,
                data,
                {
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                  },
                }
              )
              .then(async (resp) => {
                console.log("expel res", resp.data);
                const date = new Date();
                const connectData = {
                  accessToken: accessToken,
                  meetingId: id,
                  meetingEnded: date,
                };
                console.log("connectData", connectData);
                res.send("Meeting ended");
              })
              .catch((error) => {
                console.log("expel error", error);
              });
          });
        })
        .catch((error) => {
          console.log("get participants details", error);
        });
    })
    .catch((error) => {
      console.log("get meeting details", error);
    });
});

app.post("/task-routing", async (req, res) => {
  console.log("body", req.body);
  const { password, deviceId, deviceSip } = req.body;
  deviceMainId = deviceId;
  const saAccessToken = await getAccessToken();
  const token = await getGuestToken("testuser", saAccessToken);
  console.log("deviceSip", deviceSip);
  console.log("accesstoken", saAccessToken);
  var hostMeetingLink =
    "?access_token=" +
    saAccessToken +
    "&destination=" +
    deviceSip +
    "&site=agent";
  console.log("meeting link", hostMeetingLink);
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/xml");
  if (process.env.FINESSE_SESSION_COOKIE) {
    myHeaders.append("Cookie", process.env.FINESSE_SESSION_COOKIE);
  }
  const raw = `<Task>
     <name>NewTaskName</name>
     <title>NewTaskTitle</title>
     <description>NewTaskdescription</description>
     <scriptSelector>CumulusTask</scriptSelector>
     <requeueOnRecovery>true</requeueOnRecovery>
     <tags>
        <tag>video_registration</tag>
     </tags>
     <variables>
      <variable>
        <name>cv_1</name>
        <value>@test</value>
      </variable>
      <variable>
        <name>cv_2</name>
        <value>test</value>
      </variable>
      <variable>
        <name>cv_3</name>
        <value>english</value>
      </variable>
   <variable>
           <name>user_user_videoDestination</name>
           <value>${deviceSip}</value>
        </variable>
        <variable>
           <name>user_user_videoToken</name>
           <value>${saAccessToken}</value>
        </variable>
     </variables>
  </Task>`;

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };
  fetch(process.env.FINESSE_URL, requestOptions)
    .then((response) => response.text())
    .then((result) => {
      res.send(hostMeetingLink);
      console.log(result);
    })
    .catch((error) => console.error(error));
});

// pages
app.get("/agent", (req, res) =>
  res.sendFile(path.join(__dirname, "agent.html"))
);
app.get("/client", (req, res) =>
  res.sendFile(path.join(__dirname, "client.html"))
);
app.get("/home", (req, res) =>
  res.sendFile(path.join(__dirname, "home.html"))
);
app.get("/clear", (req, res) =>
  res.sendFile(path.join(__dirname, "clear.html"))
);

// websocket
io.on("connection", (socket) => {
  console.log("A client connected");

  socket.on("register-client", () => {
    socketClient = socket;
    console.log("Client registered");
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    socketClient = null;
  });

  socket.on("envelope-status", ({ envelopeId, status }) => {
    console.log(`Envelope ${status}`);
  });
});

// docusign
app.post("/send-document", async (req, res) => {
  const saAccessToken = await getAccessToken();
  const { customerEmail, customerName } = req.body;
  try {
    const apiClient = new docusign.ApiClient();
    apiClient.setOAuthBasePath(process.env.DOCUSIGN_OAUTH_BASE_PATH);
    const privateKey = fs.readFileSync(process.env.DOCUSIGN_PRIVATE_KEY_PATH);

    const results = await apiClient.requestJWTUserToken(
      process.env.DOCUSIGN_CLIENT_ID,
      process.env.DOCUSIGN_USER_ID,
      ["signature", "impersonation"],
      privateKey,
      3600
    );
    const accessToken = results.body.access_token;
    apiClient.addDefaultHeader("Authorization", "Bearer " + accessToken);
    apiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH);

    const envelopesApi = new docusign.EnvelopesApi(apiClient);
    const pdfBytes = fs.readFileSync(
      path.join(__dirname, "sample_doc.pdf")
    );
    const base64Doc = Buffer.from(pdfBytes).toString("base64");

    const envelopeDefinition = {
      emailSubject: "Please sign this document",
      documents: [
        {
          documentBase64: base64Doc,
          name: "Sample Document",
          fileExtension: "pdf",
          documentId: "1",
        },
      ],
      recipients: {
        signers: [
          {
            email: customerEmail,
            name: customerName,
            recipientId: "1",
            routingOrder: "1",
            clientUserId: "1001",
            tabs: {
              signHereTabs: [
                {
                  anchorString: "**signature**",
                  anchorYOffset: "10",
                  anchorUnits: "pixels",
                  anchorXOffset: "20",
                },
              ],
            },
          },
        ],
      },
      status: "sent",
      eventNotification: {
        url: `${process.env.BASE_URL}/docusign-webhook`,
        loggingEnabled: true,
        requireAcknowledgment: true,
        useSoapInterface: false,
        includeCertificateWithSoap: false,
        includeDocuments: false,
        envelopeEvents: [
          { envelopeEventStatusCode: "completed", includeDocuments: false },
          { envelopeEventStatusCode: "declined", includeDocuments: false },
        ],
      },
    };

    const envelope = await envelopesApi.createEnvelope(
      process.env.DOCUSIGN_API_ACCOUNT_ID,
      { envelopeDefinition }
    );

    const viewRequest = {
      returnUrl: `${process.env.BASE_URL}/clear`,
      authenticationMethod: "none",
      email: customerEmail,
      userName: customerName,
      recipientId: "1",
      clientUserId: "1001",
    };

    const viewResult = await envelopesApi.createRecipientView(
      process.env.DOCUSIGN_API_ACCOUNT_ID,
      envelope.envelopeId,
      { recipientViewRequest: viewRequest }
    );

    let deviceData = {
      deviceId: deviceMainId,
      arguments: {
        Url:
          `${process.env.BASE_URL}/client?url=` +
          encodeURIComponent(viewResult.url),
        Mode: "Fullscreen",
        Title: "Docusign App",
      },
    };
    axios
      .post(
        `${process.env.WEBEX_API_URL}/xapi/command/UserInterface.WebView.Display`,
        deviceData,
        {
          headers: {
            Authorization: `Bearer ${saAccessToken}`,
            "Content-Type": "application/json",
          },
        }
      )
      .then((res) => {
        console.log("device send res", res);
      })
      .catch((err) => {
        console.log("device send err", err);
      });
    if (socketClient) {
      socketClient.emit("signing-url", viewResult.url);
    }

    res.json({ message: "Document sent!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error sending document" });
  }
});

app.post(
  "/docusign-webhook",
  express.text({ type: "*/*" }),
  async (req, res) => {
    const saAccessToken = await getAccessToken();
    const xml = req.body;

    parseString(xml, (err, result) => {
      if (err) {
        console.error("Failed to parse DocuSign XML:", err);
        return res.sendStatus(400);
      }

      const envelopeStatus =
        result.DocuSignEnvelopeInformation.EnvelopeStatus?.[0];
      if (!envelopeStatus) {
        console.error("Invalid webhook");
        return res.sendStatus(400);
      }

      const envelopeId = envelopeStatus.EnvelopeID?.[0];
      const status = envelopeStatus.Status?.[0];

      console.log(`Envelope ${envelopeId} changed to: ${status}`);

      if (status === "Completed" || status === "Declined") {
        if (socketClient) {
          console.log("socketClient", "present");
          socketClient.emit("envelope-status", {
            envelopeId,
            status,
          });
        }
        let deviceData = {
          deviceId: deviceMainId,
          arguments: {
            Target: "OSD",
          },
        };
        axios
          .post(
            `${process.env.WEBEX_API_URL}/xapi/command/UserInterface.WebView.Clear`,
            deviceData,
            {
              headers: {
                Authorization: `Bearer ${saAccessToken}`,
                "Content-Type": "application/json",
              },
            }
          )
          .then((res) => {
            console.log("device send res", res);
          })
          .catch((err) => {
            console.log("device send err", err);
          });
      }

      res.sendStatus(200);
    });
  }
);

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
