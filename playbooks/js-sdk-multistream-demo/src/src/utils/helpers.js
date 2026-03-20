export function getUserId() {
  return Math.floor(Math.random() * 16);
}

export function loadSpaceWidget(ACCESS_TOKEN, SPACE_ID) {
  var widgetEl = document.getElementById("space-widget");
  window.webex.widget(widgetEl).spaceWidget({
    accessToken: ACCESS_TOKEN,
    destinationId: SPACE_ID,
    destinationType: "spaceId",
    spaceActivities: {
      files: false,
      meet: false,
      message: true,
      people: true,
    },
    initialActivity: "message",
    secondaryActivitiesFullWidth: false,
    composerActions: { attachFiles: true },
    disablePresence: false,
    disableFlags: false,
  });
}

export function moveToSession(groupName, groups) {
  return groups.filter((group) => group.groupName !== groupName);
}

export function updateTheLayout(
  activeSpeakerVideoElems,
  memberVideoElems,
  addLobbyUsers
) {
  const newUsersList = [];
  [...activeSpeakerVideoElems, ...memberVideoElems].forEach((videoElement) => {
    // Append all the video elements to the container element
    const userId = getUserId();
    newUsersList.push({ userId: `user-${userId}`, videoStream: videoElement });
  });
  addLobbyUsers(newUsersList);
}
