const axios = require("axios");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
function getGuestToken(name, access_token) {
  console.log("got inside get guest token");
  const guestData = {
    subject: "ExternalGuestIdentifier",
    displayName: name,
  };
  const guestConfig = {
    method: "post",
    url: `${process.env.WEBEX_API_URL}/guests/token`,
    headers: {
      "Content-type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
    data: guestData,
  };
  return axios
    .request(guestConfig)
    .then((response) => {
      console.log("guestresp", response.data);
      return response.data.accessToken;
    })
    .catch((error) => {
      console.log(error);
    });
}

module.exports = getGuestToken;
