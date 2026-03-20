import React, { useLayoutEffect } from "react";

import "./Participant.css";
import { useDragDrop } from "../context/DragDropContext";

const defaultDimension = { width: "6rem", height: "6rem" };

export default function Participant(props) {
  const {
    id,
    groupId,
    name,
    avatarUrl,
    videoStream,
    dimension,
    removeFromOriginalGroup,
  } = props;
  const { width, height } = dimension || {};
  const { onDragStart, getDroppedZoneId, onDragEnd } = useDragDrop();
  const videoStreamRef = React.useRef(null);
  if (id === "host") {
  }

  useLayoutEffect(() => {
    if (videoStream) {
      videoStreamRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  const handleDragStart = (e) => {
    e.dataTransfer.setData("text/plain", id);
    // Here we can add props like video, name and dimensions.
    onDragStart(props, groupId);
  };

  const handleDrop = (e) => {
    // On drop we are removing the user from the original group
    // only if the dropzone id is valid
    const dropzoneId = getDroppedZoneId();
    if (dropzoneId) {
      removeFromOriginalGroup();
    }
    onDragEnd();
  };

  return (
    <figure
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDrop}
      className={`draggable figure ${
        id === "host" && groupId === "stage" ? `host` : ``
      }`}
      style={{
        width: width || defaultDimension.width,
        height: height || defaultDimension.height,
        overflow: "hidden",
      }}
    >
      {videoStream ? (
        <video
          ref={videoStreamRef}
          className="participant-video"
          autoPlay
          playsInline
          muted
        />
      ) : (
        avatarUrl && <img className="participant-image" src={avatarUrl} />
      )}
      <figcaption
        className="figcaption"
        style={{ width: width || defaultDimension.width }}
      >
        {name}
      </figcaption>
    </figure>
  );
}
