import React, { createContext, useState, useContext } from "react";

// Create a Context
const DragDropContext = createContext();

// Create a custom hook to use the DragDropContext
export const useDragDrop = () => useContext(DragDropContext);

// Create a provider component
export const DragDropProvider = ({ children }) => {
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropzoneId, setDropzoneId] = useState(null);
  const [startingDropZone, setStartingDropzone] = useState(null);

  const onDragStart = (item, groupId) => {
    // When we start dragging we are saving all the props for that participant
    setStartingDropzone(groupId);
    setDraggedItem(item);
  };

  const onDrop = (dropzoneId) => {
    // When we drop an element we are just returning the id of the group where we dropped the element
    // in the group component we will check if the group id is the same as the one we are dropping to
    // if the ID is same then we add the user and all its props to the group
    if (!draggedItem) return false;
    setDropzoneId(dropzoneId);
    return dropzoneId;
  };

  const onDragOver = (dropzoneId) => {
    if (dropzoneId === startingDropZone) return;
    const group = document.getElementById(`Group-${dropzoneId}`);
    if (group) {
      group.style.border = "2px dashed rgb(12, 154, 12)";
    }
  };

  const onDragEnd = () => {
    const draggableElements = document.querySelectorAll(".group");
    draggableElements.forEach((element) => {
      element.style.border = "none";
    });
  };

  const getDroppedZoneId = () => {
    const prevDropzoneId = dropzoneId;
    setDropzoneId(null);
    return prevDropzoneId;
  };

  return (
    <DragDropContext.Provider
      value={{
        draggedItem,
        onDragStart,
        onDrop,
        getDroppedZoneId,
        onDragOver,
        onDragEnd,
      }}
    >
      {children}
    </DragDropContext.Provider>
  );
};
