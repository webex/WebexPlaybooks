/**
 * This sample code shows how to use the PKCE Code Grant Flow
 * 
 * Note: This is an insecure example because it exposes the client secret to the end user.
 *       This should be used for demonstration purposes only.
 *       Client secrets should never be exposed at the end user level.
 * 
 * This application relies on the CryptoJS library to be loaded via:
 * <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9-1/crypto-js.min.js"></script>
 */

const storageKeyCodeVerifier = "login-with-webex-code-challenge-verifier";
const storageKeyCodeChallenge = "login-with-webex-code-challenge";
const storageKeyClientID = "login-with-webex-client-id";
const storageKeyClientSecret = "login-with-webex-client-secret";

const btnClientID = document.getElementById("btnClientID");
const btnClientSecret = document.getElementById("btnClientSecret");
const btnAuth = document.getElementById("btnAuth");
const btnToken = document.getElementById("btnToken");
const btnCodeVerifier = document.getElementById("btnCodeVerifier");
const btnCodeChallenge = document.getElementById("btnCodeChallenge");
const btnUserInfo = document.getElementById("btnUserInfo");
const inputClientID = document.getElementById("client_id");
const inputClientSecret = document.getElementById("client_secret");
const inputCodeVerifier = document.getElementById("code_verifier");
const inputCodeChallenge = document.getElementById("code_challenge");
const inputAuthCode = document.getElementById("auth_code");
const inputAccessToken = document.getElementById("access_token");
const inputAccessTokenResponse = document.getElementById("access_token_response");
const inputUserInfo = document.getElementById("user_info");

// Helper Functions
function parseJwt(token) {
  var base64Url = token.split(".")[1];
  var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  var jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
  );

  return JSON.parse(jsonPayload);
}

function parseQueryParams() {
  let params = new URLSearchParams(window.location.search);
  let code = params.get("code");
  if (code) {
    console.log("Auth code discovered in query params: " + code);
    inputAuthCode.value = code;
  }
}

function handleSaveClientID() {
  const clientIDValue = inputClientID.value;
  if (!inputClientID) {
    window.alert("Client ID Required");
    return;
  }
  window.localStorage.setItem(storageKeyClientID, clientIDValue);
}

function handleSaveClientSecret() {
  const clientSecretValue = inputClientSecret.value;
  if (!inputClientSecret) {
    window.alert("Client Secret Required");
    return;
  }
  window.localStorage.setItem(storageKeyClientSecret, clientSecretValue);
}

// STEP 1: Generate a PKCE Code Verifier and Challenge
// PKCE Generation Code via https://github.com/tonyxu-io/pkce-generator
function generateRandomString(length) {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function generateCodeVerifier() {
  var code_verifier = generateRandomString(128);
  document.getElementById("code_verifier").value = code_verifier;
}

function base64URL(string) {
  return string
    .toString(CryptoJS.enc.Base64)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function generateCodeChallenge() {
  const code_verifier = document.getElementById("code_verifier").value;
  const code_challenge = base64URL(CryptoJS.SHA256(code_verifier));
  document.getElementById("code_challenge").value = code_challenge;
  return code_challenge;
}

// STEP 2: Generate Authorization Code with PKCE Code Challenge
function getAuthorizationCode() {
  let callback = window.location.origin + window.location.pathname;
  let codeChallenge = inputCodeChallenge.value;
  let codeVerifier = inputCodeVerifier.value;
  let clientID = inputClientID.value;

  if (!codeChallenge || !codeVerifier) {
    window.alert(
      "Code Challenge and Verifier are required to generate Authorization Code"
    );
    return;
  }

  if (!clientID) {
    window.alert("Client ID required to generate Authorization Code");
  }

  const authURL =
    "https://webexapis.com/v1/authorize?" +
    "response_type=code" +
    "&client_id=" +
    clientID +
    "&redirect_uri=" +
    callback +
    "&scope=openid%20email" +
    "&code_challenge=" +
    codeChallenge +
    "&code_challenge_method=S256" +
    "&state=" +
    Math.random() +
    "&nonce=" +
    Math.random();

  window.sessionStorage.setItem(storageKeyCodeVerifier, codeVerifier);
  window.sessionStorage.setItem(storageKeyCodeChallenge, codeChallenge);

  console.log("Navigating to: ");
  console.log(authURL);

  // Open OAuth Code Flow
  window.location.href = authURL;
}

// STEP 3: Convert the authorization code to an access token with the stored PKCE Code Verifier
function getAccessToken() {
  let callback = window.location.origin + window.location.pathname;
  const codeVerifier = inputCodeVerifier.value;
  const clientID = inputClientID.value;
  const clientSecret = inputClientSecret.value;
  const authCode = inputAuthCode.value;
  const tokenURL = "https://webexapis.com/v1/access_token";

  var urlencoded = new URLSearchParams();
  urlencoded.append("grant_type", "authorization_code");
  urlencoded.append("client_id", clientID);
  urlencoded.append("client_secret", clientSecret);
  urlencoded.append("code", authCode);
  urlencoded.append("code_verifier", codeVerifier);
  urlencoded.append("redirect_uri", callback);

  var requestOptions = {
    method: "POST",
    body: urlencoded,
    redirect: "follow",
  };

  fetch(tokenURL, requestOptions)
    .then((response) => response.json())
    .then((result) => {
      inputAccessToken.value = result["access_token"];
      inputAccessTokenResponse.value = JSON.stringify(result, undefined, 4);
    })
    .catch((error) => console.log("error", error));
}

// STEP 4: Fetch UserInfo with Access Token
function getUserInfo() {
  let myHeaders = new Headers();
  myHeaders.append("Authorization", `Bearer ${inputAccessToken.value}`);

  const requestOptions = {
    method: 'GET',
    headers: myHeaders,
    redirect: 'follow'
  };

  fetch("https://webexapis.com/v1/userinfo", requestOptions)
    .then(response => response.json())
    .then(result => inputUserInfo.value = JSON.stringify(result, undefined, 4))
    .catch(error => console.log('error', error));
}

function init() {
  // Check for returned OAuth Values
  parseQueryParams();

  btnAuth.onclick = getAuthorizationCode;
  btnToken.onclick = getAccessToken;
  btnCodeVerifier.onclick = generateCodeVerifier;
  btnCodeChallenge.onclick = generateCodeChallenge;
  btnClientID.onclick = handleSaveClientID;
  btnClientSecret.onclick = handleSaveClientSecret;
  btnUserInfo.onclick = getUserInfo;

  // Load Client Info from Storage (if availble)
  const clientID = window.localStorage.getItem(storageKeyClientID);
  inputClientID.value = clientID;
  const clientSecret = window.localStorage.getItem(storageKeyClientSecret);
  inputClientSecret.value = clientSecret;

  // Load PKCE Codes from Storage
  const codeVerifier = window.sessionStorage.getItem(storageKeyCodeVerifier);
  inputCodeVerifier.value = codeVerifier;
  const codeChallenge = window.sessionStorage.getItem(storageKeyCodeChallenge);
  inputCodeChallenge.value = codeChallenge;
}
