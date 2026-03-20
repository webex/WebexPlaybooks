import { ACCESS_TOKEN, SIP_URL } from "./utils/constant";
import { updateTheLayout } from "./utils/helpers";

let webex = null;
let meeting = null;

// Step 1: Initialization and registering the SDK
export async function initWebexAndRegisterDevice() {
  if (!ACCESS_TOKEN) {
    alert("Set REACT_APP_WEBEX_ACCESS_TOKEN in .env.local (see env.template)");
    return;
  }
  try {
    //  Use the access token to initialize the SDK
    webex = window.Webex.init({
      credentials: {
        access_token: ACCESS_TOKEN,
      },
    });
    return webex;
  } catch (error) {
    console.error("initWebexAndRegisterDevice#register() :: webex init failed");
  }
}

// Step 2: Register with meetings
export function registerWithMeeting(webex) {
  return webex.meetings.register();
}

// Step 3: Create the meeting object
export async function createMeeting() {
  // Using SIP URL to create the meeting
  meeting = await webex.meetings.create(SIP_URL);
  return meeting;
}

// Step 4: Setup local media streams
export async function getLocalStreams() {
  // Create a microphone
  const microphoneStream =
    await webex.meetings.mediaHelpers.createMicrophoneStream({});

  // Create a camera
  const cameraStream = await webex.meetings.mediaHelpers.createCameraStream({});

  return {
    microphone: microphoneStream,
    camera: cameraStream,
  };
}

// Step 5: Setup remote media Stream
export async function setupRemoteMedia(addLobbyUsers) {
  if (!meeting) {
    console.error("Meeting object is not available");
    return;
  }
  const activeSpeakerVideoElems = [];
  const memberVideoElems = [];

  // Listen for remote audio stream's changes
  await meeting.on("media:remoteAudio:created", (audioMediaGroup) => {
    audioMediaGroup.getRemoteMedia().forEach((media, index) => {
      // Add stream to audio element's srcObject
      document.getElementsByClassName("multistream-remote-audio")[
        index
      ].srcObject = media.stream;
    });
  });

  // Listen for remote video stream's changes
  await meeting.on(
    "media:remoteVideo:layoutChanged",
    ({
      layoutId, // All equal, 1Plus5
      activeSpeakerVideoPanes,
      memberVideoPanes,
      screenShareVideo,
    }) => {
      for (const [groupId, group] of Object.entries(activeSpeakerVideoPanes)) {
        // Setup the source updates for the streams
        group.getRemoteMedia().forEach((remoteMedia) => {
          //  Add listeners to receive the latest states of the streams
          remoteMedia.on("sourceUpdate", (data) => {
            if (data.state === "live") {
              //  Videos is live
              activeSpeakerVideoElems.push(remoteMedia.stream);
            }
            if (data.state === "no source") {
              //  No video is available
            }
            if (data.state === "avatar") {
              // Video is muted
            }
            if (data.state === "bandwidth disabled") {
              // Insufficient bandwidth to show the video
            }
            updateTheLayout(
              activeSpeakerVideoElems,
              memberVideoElems,
              addLobbyUsers
            );
          });
        });
      }
      //  Used to add the videos on the UI
      updateTheLayout(activeSpeakerVideoElems, memberVideoElems, addLobbyUsers);
    }
  );
}

// Step 6: Join the meeting (JoinOptions, AddMediaOptions)
export function joinWithMedia(meetingsObject, camera, microphone) {
  const mediaOptions = {
    localStreams: {
      microphone: microphone,
      camera: camera,
    },
    audioEnabled: true,
    videoEnabled: true,
    allowMediaInLobby: true,
  };

  const joinOptions = {
    enableMultistream: true,
  };

  meetingsObject.joinWithMedia({ mediaOptions, joinOptions });
}
