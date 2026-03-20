import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import "./App.css";
import Group from "./components/Group";
import groupsData from "./utils/groups.json";
import { DragDropProvider } from "./context/DragDropContext";
import {
  initWebexAndRegisterDevice,
  getLocalStreams,
  setupRemoteMedia,
  createMeeting,
  joinWithMedia,
  registerWithMeeting,
} from "./multistream";
import MeetingControls from "./components/MeetingControls";
import { loadSpaceWidget, moveToSession } from "./utils/helpers";
import { ACCESS_TOKEN, SPACE_ID } from "./utils/constant";
function App() {
  const [groups, setGroups] = useState(groupsData.group);
  const [lobbyUsers, addLobbyUsers] = useState([]);
  const [localStreams, setLocalStreams] = useState(null);
  const [meeting, setMeeting] = useState(null);
  const [showSpaceWidget, setShowSpaceWidget] = useState(true);
  const localVideoRef = useRef(null);

  const handleMuteToggle = async (isMuted) => {
    if (localStreams) {
      if (!isMuted) {
        if (!localStreams.microphone || !localStreams.microphone.outputStream) {
          try {
            const { microphone } = await getLocalStreams();
            localStreams.microphone = microphone;
          } catch (error) {
            console.error("Error creating microphone stream: ", error);
            return;
          }
        }
      } else {
        localStreams.microphone.outputStream
          .getTracks()
          .forEach((track) => track.stop());
        localStreams.microphone.outputStream = null;
      }
    }
  };

  const handleVideoToggle = async (isVideoOn) => {
    if (localStreams) {
      if (isVideoOn) {
        if (!localStreams.camera || !localStreams.camera.outputStream) {
          try {
            const { camera } = await getLocalStreams();
            localStreams.camera = camera;
          } catch (error) {
            console.error("Error creating camera stream: ", error);
            return;
          }
        }
        if (localVideoRef && localVideoRef.current) {
          localVideoRef.current.srcObject = localStreams.camera.outputStream;
        }
      } else {
        localStreams.camera.outputStream
          .getTracks()
          .forEach((track) => track.stop());
        if (localVideoRef && localVideoRef.current) {
          localVideoRef.current.srcObject = null;
          localStreams.camera.outputStream = null;
        }
      }
    }
  };

  function addingLobbyUsers(user) {
    addLobbyUsers(user);
  }

  function addGroup() {
    setGroups([
      ...groups,
      { groupName: `Group-${groups.length + 2}`, users: [] },
    ]);
  }

  function moveGroupToSession(groupName) {
    setGroups(moveToSession(groupName, groups));
  }

  function updateGroup(groupName, users) {
    const updatedGroups = groups.map((group) => {
      if (group.groupName === groupName) {
        return { ...group, users };
      }
      return group;
    });
    setGroups(updatedGroups);
  }

  useEffect(() => {
    if (localStreams && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreams.camera.outputStream;
    }
  }, [localStreams, localVideoRef]);

  useLayoutEffect(() => {
    loadSpaceWidget(ACCESS_TOKEN, SPACE_ID);
  });

  useEffect(() => {
    const init = async () => {
      const webex = await initWebexAndRegisterDevice();
      webex.once("ready", (event) => {
        registerWithMeeting(webex)
          .then(async () => {
            if (!meeting) {
              const createdMeeting = await createMeeting();
              setMeeting(createdMeeting);
            }
          })
          .catch((error) => {
            console.error(
              "initWebexAndRegisterDevice#register() :: error registering",
              error
            );
          });
      });
      const streams = await getLocalStreams();
      setLocalStreams(streams);
    };
    init();
  }, []);

  useEffect(() => {
    const getRemoteStreams = async () => {
      if (meeting) {
        await setupRemoteMedia(addingLobbyUsers);
      }
    };
    getRemoteStreams();
  }, [meeting]);

  return (
    <div className="App">
      <DragDropProvider>
        <h1
          style={{
            position: "relative",
            left: "31%",
            fontSize: "2rem",
            width: "20rem",
          }}
        >
          Floods War Room
        </h1>

        <main className="main-container">
          {/* Left side section */}
          <section className="section-left">
            <div className="group-container">
              {groups.map((group, index) => (
                <Group
                  key={index}
                  id={index + 1}
                  groupData={group}
                  moveToSession={moveGroupToSession}
                  updateGroup={updateGroup}
                />
              ))}
            </div>
          </section>
          <div>
            {/* render video only when localStreams are available */}
            {localStreams && (
              <div className="local-video">
                <Group
                  id="stage"
                  groupData={{
                    users: [
                      {
                        id: "host",
                        videoStream: localStreams.camera.outputStream,
                      },
                    ],
                  }}
                  updateGroup={updateGroup}
                />
                {/* Meeting Controls (Mute/Unmute, Video On/Off) */}
                <MeetingControls
                  onMuteToggle={handleMuteToggle}
                  onVideoToggle={handleVideoToggle}
                />
              </div>
            )}
          </div>
          <div>
            <audio
              id="multistream-remote-audio-0"
              className="multistream-remote-audio"
              autoPlay
            ></audio>
            <audio
              id="multistream-remote-audio-1"
              className="multistream-remote-audio"
              autoPlay
            ></audio>
            <audio
              id="multistream-remote-audio-2"
              className="multistream-remote-audio"
              autoPlay
            ></audio>
          </div>
          <div class="vertical-line"></div>
          {/* Right side section */}
          <section className="section-right">
            {meeting && (
              <button
                className="btn-primary"
                onClick={() => {
                  joinWithMedia(
                    meeting,
                    localStreams.camera,
                    localStreams.microphone
                  );
                }}
              >
                Join Meeting
              </button>
            )}
            <br />
            <button className="btn-primary">Medical Session</button>
            <button className="btn-primary">Judicial Session</button>

            <br />
            <button className="btn-primary" onClick={addGroup}>
              Create a group
            </button>
            <Group
              id="lobby"
              groupData={{ groupName: "Lobby", users: lobbyUsers }}
              updateGroup={updateGroup}
              style={{ position: "relative" }}
            />
          </section>
          <section className="chat-container">
            <div
              className="space-widget-header"
              onClick={() => setShowSpaceWidget(!showSpaceWidget)}
            >
              Chat
            </div>

            <div
              id="space-widget"
              className="space-widget"
              style={{ display: showSpaceWidget ? "block" : "none" }}
            >
              Chat box
            </div>
          </section>
        </main>
      </DragDropProvider>
    </div>
  );
}

export default App;
