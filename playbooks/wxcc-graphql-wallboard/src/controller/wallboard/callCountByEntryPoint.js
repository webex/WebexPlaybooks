import fetch from "node-fetch";
import { decide } from "../decide.js";
import { wxccSearchEndpoint, wallboardQueryTimeRange } from "../wxccApi.js";

export async function callCountByEntryPoint() {
  let info = await decide();
  let org_id = info.org_id;
  let token = await info.fetchToken;
  // console.log(token);

  try {
    const { from, to } = wallboardQueryTimeRange();
    // graphQL Query
    const query = `
		 {
				#TOTAL CALLS BY Entry Point
		
				task(
					from: ${from}
					to: ${to}
					timeComparator: createdTime
					filter: {
						and: [
							{ direction: { equals: "inbound" } }
							{ channelType: { equals: telephony } }
						]
					}
					aggregations: {
						field: "id"
						type: count
						name: "Total Contacts by Entry Point"
					}
				) {
					tasks {
						lastEntryPoint {
							name
							id
						}
						aggregation {
							name
							value
						}
					}
					pageInfo {
						hasNextPage
						endCursor
					}
				}
			}
			`;
    const posts = await fetch(wxccSearchEndpoint(org_id), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        query
      })
    });
    const response = await posts.json();
    let results = await response.data.task.tasks;

    return results;
  } catch (error) {
    // console.log(`network issue ${error}`);
  }
}
