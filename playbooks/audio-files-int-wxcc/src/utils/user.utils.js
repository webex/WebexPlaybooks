import dotenv from 'dotenv'
import axios from 'axios'
import jwt from 'jsonwebtoken'

dotenv.config();

const trustedIssuers = [
    "https://idbroker-b-us.webex.com/idb"
];

export const getUserInfo = async function (accessToken) {
    try {
        const response = await axios.get('https://webexapis.com/v1/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching user info:', error);
        throw error;
    }
}

async function verifyJwt(token) {
    const decodedToken = jwt.decode(token, { complete: true });

    //if token is not valid, throw an error
    if (!decodedToken) {
        throw new Error('Token decode failed, syntax error.');
    }

    //verify if token issuer is trusted
    if (!trustedIssuers.includes(decodedToken.payload.iss)) {
        throw new Error('The token issuer is not trusted');
    }

    const url = decodedToken.payload.iss + "/oauth2/v2/keys/verification";

    const issResponse = await axios(url);
    const expire = issResponse.data.key_valid_time;

    let new_verification_key = `-----BEGIN PUBLIC KEY-----\n${issResponse.data.new_verification_key}\n-----END PUBLIC KEY-----`;

    // Return a promise that resolves when jwt.verify completes
    return new Promise((resolve, reject) => {
        jwt.verify(token, new_verification_key, { algorithms: ["RS256"] }, (err, decoded) => {
            if (err) {
                return reject(new Error(err));
            }
            resolve(decoded); // Resolve the promise with the decoded value
        });
    });
}

export const getTokens = async function (code) {

    const payload = {
        grant_type: 'authorization_code',
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code: code,
        redirect_uri: process.env.REDIRECT_URI,
    };

    const response = await axios.post(
        'https://webexapis.com/v1/access_token',
        payload,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (response.status != 200) {
        return {
            success: false,
            message: error.message || 'An error occurred when accessing tokens.',
            code: error.code || 'AUTHORIZATION_CODE_ERROR'
        };
      }

      const idtoken = response.data.id_token;

      try {
        await verifyJwt(idtoken);
      } catch (error) {
        return {
            success: false,
            message: error.message || 'An error occurred during JWT verification.',
            code: error.code || 'JWT_VERIFICATION_ERROR'
        };
      }

      //return response.data;
      return {
        success: true,
        data: response.data,
    };
}


