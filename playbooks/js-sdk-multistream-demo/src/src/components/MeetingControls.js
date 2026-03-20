import React, { useState } from "react";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";
import "../App.css";

const MeetingControls = ({ onMuteToggle, onVideoToggle }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);

  const toggleMute = () => {
    setIsMuted((prevMuted) => !prevMuted);
    if (onMuteToggle) {
      onMuteToggle(!isMuted);
    }
  };

  const toggleVideo = () => {
    setIsVideoOn((prevVideoOn) => !prevVideoOn);
    if (onVideoToggle) {
      onVideoToggle(!isVideoOn);
    }
  };

  return (
    <div className="meeting-controls">
      <button
        className={`btn-control`}
        style={{ background: "#198a19" }}
        onClick={toggleMute}
      >
        {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
      </button>

      <button
        className={`btn-control`}
        style={{ background: "#198a19" }}
        onClick={toggleVideo}
      >
        {isVideoOn ? <FaVideo /> : <FaVideoSlash />}
      </button>

      <button
        className="btn-control leave-btn"
        style={{ background: "#b8260d" }}
      >
        Leave
      </button>
    </div>
  );
};

export default MeetingControls;
