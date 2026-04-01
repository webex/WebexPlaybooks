
export function enableDrag(self, remoteView) {
  function onMouseDrag({ movementX, movementY }) {
    let getContainerStyle = window.getComputedStyle(self);
    let leftValue = parseInt(getContainerStyle.left);
    let topValue = parseInt(getContainerStyle.top);
    // let rightValue = parseInt(getContainerStyle.right);
    // let bottomValue = parseInt(getContainerStyle.bottom);
    // if (
    //   leftValue + movementX > 0 &&
    //   topValue + movementY > 0 &&
    //   rightValue > 0 &&
    //   bottomValue > 0
    // ) {
    //   self.style.left = `${leftValue + movementX}px`;
    //   self.style.top = `${topValue + movementY}px`;
    // } else {
    //   self.style.left = `${0}px`;
    //   self.style.top = `${0}px`;
    // }
    self.style.left = `${leftValue + movementX}px`;
    self.style.top = `${topValue + movementY}px`;
    // console.log("Mouse Move", movementX, movementY);
  }

  function determineQuadrant(mouseX, mouseY, viewportWidth, viewportHeight) {
    const isLeft = mouseX < viewportWidth / 2;
    const isTop = mouseY < viewportHeight / 2;

    if (isLeft && isTop) return "top-left";
    if (!isLeft && isTop) return "top-right";
    if (isLeft && !isTop) return "bottom-left";
    if (!isLeft && !isTop) return "bottom-right";
  }

  function positionElementInQuadrant(element, quadrant) {
    switch (quadrant) {
      case "top-left":
        element.style.left = "0px";
        element.style.top = "0px";
        console.log("Top Left", element.style.left, element.style.top);
        break;
      case "top-right":
        element.style.left = `${
          remoteView.offsetWidth - (element.offsetWidth + 20)
        }px`;
        element.style.top = "0px";
        console.log("Top Right", element.style.left, element.style.top);
        break;
      case "bottom-left":
        element.style.left = "0px";
        element.style.top = `${
          remoteView.offsetHeight - (element.offsetHeight + 20)
        }px`;
        console.log("Bottom Left", element.style.left, element.style.top);
        break;
      case "bottom-right":
        element.style.left = `${
          remoteView.offsetWidth - (element.offsetWidth + 20)
        }px`;
        element.style.top = `${
          remoteView.offsetHeight - (element.offsetHeight + 20)
        }px`;
        console.log("Bottom Right", element.style.left, element.style.top);
        break;
    }
  }

  self.addEventListener("mousedown", () => {
    self.addEventListener("mousemove", onMouseDrag);
  });

  self.addEventListener("mouseup", (event) => {
    self.removeEventListener("mousemove", onMouseDrag);
    var offsets = remoteView.getBoundingClientRect();
    console.log("Offsets", offsets.left, offsets.top);
    const mouseX = event.clientX - offsets.left;
    const mouseY = event.clientY - offsets.top;
    console.log("Mouse Up", mouseX, mouseY);
    // const viewportWidth = window.innerWidth;
    // const viewportHeight = window.innerHeight;
    const viewportWidth = remoteView.offsetWidth;
    const viewportHeight = remoteView.offsetHeight;
    console.log("Viewport", viewportWidth, viewportHeight);
    console.log("self", self.offsetWidth, self.offsetHeight);

    const quadrant = determineQuadrant(
      mouseX,
      mouseY,
      viewportWidth,
      viewportHeight
    );
    console.log("Quadrant", quadrant);
    positionElementInQuadrant(self, quadrant);
  });
}
