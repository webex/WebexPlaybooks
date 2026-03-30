import { tokenFromDB } from "./secured/tokenFromDB.js";
import { tokenFromDev } from "./secured/tokenFromDev.js";

// Decider of mongoDB tokens or just copy/paste token from dev portal
export async function decide() {
  const tokenDB = tokenFromDB;
  const tokenDev = tokenFromDev;
  const info = getENVs();
  const org_id = info.org_id;
  const fetchToken = info.environment === "production" ? tokenDB() : tokenDev();
  return {
    fetchToken,
    org_id
  };
}

function getENVs() {
  return {
    environment: process.env.ENVIRONMENT,
    org_id: process.env.ORG_ID
  };
}
