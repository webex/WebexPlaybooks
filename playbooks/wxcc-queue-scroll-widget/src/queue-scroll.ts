/**
 * queue-scroll.ts — WxCC Queue Scroll Widget
 *
 * A Lit web component that displays a continuously scrolling ticker of real-time
 * Webex Contact Center queue statistics in the Agent Desktop advancedHeader.
 *
 * WHAT THIS COMPONENT DOES:
 *   - On mount, fetches all queues the logged-in agent is eligible to receive
 *     interactions from (agent-based, skill-based, and team-linked queues).
 *   - Polls the WxCC Search GraphQL API every 30 seconds for active parked task
 *     counts and oldest wait times per queue.
 *   - Renders the results as a CSS marquee (horizontally scrolling ticker).
 *
 * WHAT IT DOES NOT DO:
 *   - Does not manage token refresh (handled by the Agent Desktop).
 *   - Does not implement retry logic or surface errors to the agent UI.
 *   - Is not production-hardened; treat as a starting point.
 *   - Only targets api.wxcc-us1.cisco.com (US-1 datacenter).
 *
 * REQUIRED ATTRIBUTES (set by Agent Desktop via $STORE.* bindings in production,
 * or manually in index.html for local standalone testing):
 *   orgId    — Webex Contact Center organization ID   ($STORE.agent.orgId)
 *   agentId  — Agent database ID                      ($STORE.agent.agentDbId)
 *   teamId   — Team ID the agent is logged into       ($STORE.agent.teamId)
 *   token    — Bearer token for API authorization     ($STORE.auth.accessToken)
 */
import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js"

@customElement("queue-scroll")
export class QueueScroll extends LitElement {
    @property() teamId?: string // $STORE.agent.teamId
    @property() agentId?: string // $STORE.agent.agentDbId
    @property() token?: string  // $STORE.auth.accessToken
    @property() orgId?: string  // $STORE.agent.orgId
    // @state() refreshTime: number = 10
    @state() queueFilter: object[] = []
    @state() queueStats = []
    @state() _timerInterval?: any
    @state() queueData?: any
    @state() _mapUpdate?: any
    static styles = [
        css`
            :host {
            display: flex;
            }
            .marquee-container {
            width: 30vw;
            height: 50px; /* Set a fixed height for the container */
            overflow: hidden; 
            border:solid;
            border-radius:25px;
            }

            .marquee {
            list-style: none; /* Remove default list styles */
            display:flex;
            padding: 0;
            margin: 0;
            height:100%;
            width:max-content;
            animation: scroll linear infinite;
            animation-duration: 10s;
            align-items:center;
            }
            .marquee li {
            display:flex;
            align-self:center;
            align-items:center;
            justify-content:center;
            flex-shrink:0;
            font-size:2rem;
            white-space:nowrap;
            padding: 0 1rem 0 1rem;
            }
            .marquee:hover{
            animation-play-state: paused;
  
            }

            @keyframes scroll {
            0% {
                transform: translateX(0); /* Start position */
            }
            100% {
                transform: translateX(-50%); /* End position (fully scrolled) */
            }
            }
        `
    ];
    connectedCallback() {
        super.connectedCallback()
        this.getQueues()
        this._timerInterval = setInterval(() => this.getStats(), 30000);
        this._mapUpdate = setInterval(() => this.updateTemplate(), 1000);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        clearInterval(this._timerInterval);
        clearInterval(this._mapUpdate);
    }
    async getStats() {
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("Accept", "application/json");
        myHeaders.append("Authorization", `Bearer ${this.token}`);

        const raw = JSON.stringify({
            "query": "query queueStats($from:Long! $to:Long! $timeComparator:QueryTimeType $filter:TaskFilters $aggregations:[TaskV2Aggregation]){task(from:$from to:$to timeComparator:$timeComparator filter:$filter aggregations:$aggregations){tasks{lastQueue{name}aggregation{name value}}}}",
            "variables": {
                "from": `${Date.now() - 86400000}`,
                "to": `${Date.now()}`,
                "timeComparator": "createdTime",
                "filter": {
                    "and": [
                        {
                            "isActive": {
                                "equals": true
                            }
                        },
                        {
                            "status": {
                                "equals": "parked"
                            }
                        },
                        {
                            "or": this.queueFilter

                        }
                    ]
                },
                "aggregations": [
                    {
                        "field": "id",
                        "type": "count",
                        "name": "contacts"
                    },
                    {
                        "field": "createdTime",
                        "type": "min",
                        "name": "oldestStart"
                    }
                ]
            }
        });

        const requestOptions: object = {
            method: "POST",
            headers: myHeaders,
            body: raw,
            redirect: "follow"
        };

        try {
            const response = await fetch("https://api.wxcc-us1.cisco.com/search", requestOptions);
            const result = await response.json();
            this.queueData = await result.data.task.tasks
            // this.queueStats = await result.data.task.tasks.map((item: any) => {return  html`<li> | Queue: ${item.lastQueue.name} Contacts: ${item.aggregation[1].value} Wait: ${new Date(Date.now() - item.aggregation[0].value).toISOString().slice(11, -5)} |</li>` })
            console.log(result)
        } catch (error) {
            console.error(error);
        };
    }


    async getQueues() {
        const myHeaders = new Headers();
        myHeaders.append("Authorization", `Bearer ${this.token}`)
        myHeaders.append("Accept", "*/*");
        const paths = [`/v2/contact-service-queue/by-user-id/${this.agentId}/agent-based-queues`, `/v2/contact-service-queue/by-user-id/${this.agentId}/skill-based-queues`, `/team/${this.teamId}/incoming-references`]
        this.queueFilter = []
        const requestOptions: object = {
            method: "GET",
            headers: myHeaders,
            redirect: "follow"
        };

        paths.forEach(async (path, i) => {
            try {
                const response = await fetch(`https://api.wxcc-us1.cisco.com/organization/${this.orgId}${path}`, requestOptions);
                const result = await response.json();
                result.data.forEach((q: any) => this.queueFilter.push({ lastQueue: { id: { equals: q.id } } }))
            } catch (error) {
                console.error(error);
            };
            if (i >= paths.length - 1) {
                console.log("done")
                this.getStats()
            }
        })

    }
    updateTemplate() {
        this.queueStats = this.queueData.map((item: any) => { return html`<li> | Queue: ${item.lastQueue.name} Contacts: ${item.aggregation[1].value} Wait: ${new Date(Date.now() - item.aggregation[0].value).toISOString().slice(11, -5)} |</li>` })
    }

    render() {
        return html`
        <!-- <button @click=${this.getQueues}>test</button>      -->
         <div class="marquee-container" >
            <ul class="marquee" style="animation-duration: ${this.queueStats.length * 10}s">
                ${this.queueStats}
                ${this.queueStats}
            </ul>
        </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "queue-scroll": QueueScroll;
    }
}