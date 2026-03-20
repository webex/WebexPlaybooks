import React, { useEffect, useState } from "react";
import Participant from "./Participant";
import placeholderImage from "../images/goku.png";
import { useDragDrop } from "../context/DragDropContext";
import "./Group.css";

export default function Group(props) {
  const { id, groupData, moveToSession, updateGroup } = props;
  const [users, setUsers] = useState(groupData.users);

  useEffect(() => {
    setUsers(groupData.users);
  }, [groupData.users]);

  const addUser = (user) => {
    setUsers((prevUsers) => {
      updateGroup(groupData.groupName, [...prevUsers, user]);
      return [...prevUsers, user];
    });
  };
  const removeUser = (user) => {
    setUsers((prevUsers) => {
      const updatedUsers = prevUsers.filter((u) => u !== user);
      updateGroup(groupData.groupName, updatedUsers);
      return updatedUsers;
    });
  };

  const { draggedItem, onDrop, onDragOver } = useDragDrop();

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
    onDragOver(id);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const addedTo = onDrop(id);
    if (addedTo === id) {
      addUser(draggedItem);
    }
  };

  return (
    <div
      id={`Group-${id}`}
      className="group dropZone"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "space-around",
        }}
      >
        <h2 contentEditable>{groupData.groupName}</h2>
        {moveToSession && (
          <button
            style={{ all: "unset", cursor: "pointer" }}
            className="remove-group-btn"
            onClick={() => moveToSession(groupData.groupName)}
          >
            X
          </button>
        )}
      </div>
      <div className="participant-container">
        {users.slice(0, 4).map((user, index) => (
          <Participant
            key={index}
            id={user.id}
            groupId={id}
            name={`User ${user.id}`}
            avatarUrl={placeholderImage}
            videoStream={user.videoStream}
            removeFromOriginalGroup={() => removeUser(user)}
          />
        ))}
      </div>
      {moveToSession && (
        <button
          className={`btn-control leave-btn move-to-session-btn`}
          onClick={() => moveToSession(groupData.groupName)}
        >
          Move to session
        </button>
      )}
    </div>
  );
}
