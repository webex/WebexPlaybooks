const axios = require("axios");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
function getAccessToken() {
  let data = {
    grant_type: "refresh_token",
    refresh_token: process.env.REFRESH_TOKEN,
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
  };

  let config = {
    method: "post",
    url: `${process.env.WEBEX_API_URL || "https://webexapis.com/v1"}/access_token`,
    headers: {
      "Content-type": "application/x-www-form-urlencoded",
    },
    data: data,
  };

  return axios
    .request(config)
    .then((response) => {
      var redata = JSON.stringify(response.data);
      console.log(redata);
      console.log(response.data.access_token);
      return response.data.access_token;
    })
    .catch((error) => {
      console.log(error);
    });
}
module.exports = getAccessToken;
