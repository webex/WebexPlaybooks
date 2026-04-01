import "./style.css";
require("dotenv").config();
const { enableDrag } = require("./selfview");
var socket = io();
const axios = require("axios");
console.log("socketio", socket);

const urlParams = new URLSearchParams(window.location.search);

const myAccessToken = urlParams.get("access_token");
const destination = urlParams.get("destination");
const site = urlParams.get("site");
if (!myAccessToken) {
  alert("Access token is missing. Please provide it in the URL.");
  throw new Error("Access token is missing. Please provide it in the URL.");
}

const Webex = require("webex");

const webex = Webex.init({
  credentials: {
    access_token: myAccessToken,
  },
});

webex.config.logger.level = "debug";

socket.on("app_msg", function (msg) {
  if (site == "client") {
    alert(msg);
  }

  console.log("Socket IO Message: " + msg);
});
webex.meetings
  .register()
  .then((r) => {
    console.log("Succesfully registered");
    console.log(destination);
    webex.meetings
      .create(destination)
      .then(async (meeting) => {
        console.log("Meeting successfully created");
        await bindMeetingEvents(meeting);
        await bindButtonEvents(meeting);
        await joinMeeting(meeting);
      })
      .catch((error) => {
        console.log(error);
      });
  })
  .catch((err) => {
    console.log(err);
    alert(err);
    throw err;
  });

async function bindButtonEvents(meeting) {
  const videoMuteOff = document.getElementById("video-mute-off");
  const videoMuteOn = document.getElementById("video-mute-on");
  const audioMuteOff = document.getElementById("audio-mute-off");
  const audioMuteOn = document.getElementById("audio-mute-on");
  const dropdownButton = document.getElementById("dropdown-button");
  const hideSelfView = document.getElementById("hide-self-view");
  const showSelfView = document.getElementById("show-self-view");
  const self = document.getElementById("self");
  const remoteView = document.getElementById("remote-view");
  const dropdown = document.getElementsByClassName("dropdown");

  const meetingDest = meeting.destination;

  document.getElementById("hangup").addEventListener("click", async () => {
    if (site == "supervisorMonitor") {
      meeting.leave();
    } else {
      console.log("hangup clicked");
      await meeting.endMeetingForAll();
      await meeting.getMembers().then((members) => {
        console.log("members", members);
      });
    }
  });
  videoMuteOff.addEventListener("click", () => {
    console.log("videmute off clicked");
    videoMuteOff.style.display = "none";
    videoMuteOn.style.display = "";
  });
  videoMuteOn.addEventListener("click", () => {
    console.log("video mute on clicked");
    videoMuteOff.style.display = "";
    videoMuteOn.style.display = "none";
  });
  audioMuteOff.addEventListener("click", () => {
    audioMuteOff.style.display = "none";
    audioMuteOn.style.display = "";
  });
  audioMuteOn.addEventListener("click", () => {
    audioMuteOff.style.display = "";
    audioMuteOn.style.display = "none";
  });
  hideSelfView.addEventListener("click", () => {
    self.style.display = "none";
    hideSelfView.style.display = "none";
    showSelfView.style.display = "";
  });
  showSelfView.addEventListener("click", () => {
    self.style.display = "";
    hideSelfView.style.display = "";
    showSelfView.style.display = "none";
  });

  dropdownButton.addEventListener("click", () => {
    Array.from(dropdown).forEach((drop) => {
      drop.classList.toggle("is-active");
    });
  });
  if (self) {
    enableDrag(self, remoteView);
  }
}

async function bindMeetingEvents(meeting) {
  const selfView = document.getElementById("self-view");
  const remoteViewVideo = document.getElementById("remote-view-video");
  const remoteViewAudio = document.getElementById("remote-view-audio");
  const buttonsContainer = document.getElementById("buttons-container");
  const loadingContainer = document.getElementById("loading-container");

  meeting.on("error", (error) => console.log(error, "Meeting Error"));

  meeting.on("media:ready", (media) => {
    if (!media) return;

    const element =
      media.type === "local"
        ? selfView
        : media.type === "remoteVideo"
        ? remoteViewVideo
        : media.type === "remoteAudio"
        ? remoteViewAudio
        : null;

    if (element) {
      element.srcObject = media.stream;
      buttonsContainer.style.display = "flex";
      loadingContainer.style.display = "none";
    }
  });

  meeting.on("media:stopped", (media) => {
    console.log("meeting stopped");
    webex.meetings.unregister();
    window.location.href = "/hangup";
    const element =
      media.type === "local"
        ? selfView
        : media.type === "remoteVideo"
        ? remoteViewVideo
        : media.type === "remoteAudio"
        ? remoteViewAudio
        : null;

    if (element) {
      element.srcObject = null;
      buttonsContainer.style.display = "none";
    }
  });
}

async function joinMeeting(meeting) {
  try {
    const { sendAudio, sendVideo } = await meeting.getSupportedDevices({
      sendAudio: true,
      sendVideo: true,
    });
    meeting.join().then(async () => {
      const mediaSettings = {
        receiveVideo: true,
        receiveAudio: true,
        receiveShare: false,
        sendShare: false,
        sendVideo,
        sendAudio,
      };
      meeting.getMediaStreams(mediaSettings).then((mediaStreams) => {
        const [localStream, localShare] = mediaStreams;
        meeting.addMedia({
          localShare,
          localStream,
          mediaSettings,
        });
      });
    });
  } catch (error) {
    console.log(error, "Join Meeting Error");
    throw error;
  }
}
