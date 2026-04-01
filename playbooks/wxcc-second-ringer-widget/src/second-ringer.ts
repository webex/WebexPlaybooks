/**
 * second-ringer.ts — Webex Contact Center Header Widget
 *
 * WHAT IT DOES:
 *   Renders a header widget inside Webex Agent Desktop (WxCC) that plays a
 *   configurable ringtone on a secondary audio output device (e.g. computer
 *   speaker) when the agent receives an inbound call or consult request. This
 *   is useful when the agent is not wearing their headset.
 *
 * WHAT IT DOES NOT DO:
 *   - Not production-hardened; no error recovery or retry logic beyond basic
 *     console logging.
 *   - Does not persist the selected audio device across page reloads.
 *   - Does not support custom ringtone upload; ring.mp3 must be hosted alongside
 *     the built widget (see env.template for WIDGET_HOST_URL).
 *
 * ENVIRONMENT / HOSTING:
 *   No runtime secrets or API keys are required — this widget runs entirely in
 *   the browser within Agent Desktop. After building with `npm run build`, host
 *   the dist/ folder contents on a publicly accessible static web server and
 *   reference the JS URL in a WxCC Agent Desktop layout JSON (headerActions).
 *   See env.template for the WIDGET_HOST_URL variable used during deployment.
 *
 * REQUIRED SETUP:
 *   1. Place this widget in the `headerActions` section of a WxCC desktop layout.
 *   2. Assign the layout to the appropriate agent team in Control Hub.
 *   3. Agents must grant microphone permission so the browser can enumerate
 *      audio output devices.
 *
 * AUDIO FILE:
 *   ring.mp3 — "Model 500 Telephone British ring" by CianMcCann
 *   Source: https://commons.wikimedia.org/wiki/File:Model_500_Telephone_British_ring.ogg
 *   License: Creative Commons Attribution-Share Alike 3.0 Unported (CC BY-SA 3.0)
 *   https://creativecommons.org/licenses/by-sa/3.0/
 */
import { LitElement, html, css } from "lit";
import { customElement, query, state } from "lit/decorators.js"
import ringMp3 from "./assets/ring.mp3"
// import "@wxcc-desktop/sdk"
@customElement("second-ringer")
export class SecondRinger extends LitElement {
    @state() audioDevices1: any = []
    @state() hideMe = true
    @state() isActive = false
    @query("#ring") hmm!: HTMLAudioElement
    static styles = [
        css`
            :host {
                display: block;
                               
            }
            .watermark {
                position: absolute; /* Positions the watermark relative to the .container */
                top: 0%;
                left: 10%;
                /* transform: translate(-50%, -50%) rotate(-45deg); Centers and rotates the text */
                font-size: 3em; /* Adjust as needed */
                color: rgba(255, 0, 0, 0.5); /* Semi-transparent black */
                pointer-events: none; /* Prevents interaction with the watermark */
                user-select: none; /* Prevents text selection */
                z-index: 50; /* Ensures it's behind the main content */
                white-space: nowrap; /* Prevents text from wrapping */
                
            }
            .container{
                position: relative;
                border: solid black;
                border-radius: 12px;
                overflow:hidden;
                z-index:99;
                background-color: rgba(5, 5, 5, 0.5)

            }
            .hidden{
                display:none;
            }
            .bump{
                margin-top:12%;
            }

        `
    ];
    async connectedCallback() {
        super.connectedCallback()
        this.populateAudio()
        window.AGENTX_SERVICE.aqm.contact.eAgentOfferContact.listen(this.testEm.bind(this))
        window.AGENTX_SERVICE.aqm.contact.eAgentOfferConsult.listen(this.testEm.bind(this))
        window.AGENTX_SERVICE.aqm.contact.eAgentContactAssigned.listen(this.stopEm.bind(this))
        window.AGENTX_SERVICE.aqm.contact.eAgentContactEnded.listen(this.stopEm.bind(this))
        window.AGENTX_SERVICE.aqm.contact.eAgentOfferContactRona.listen(this.stopEm.bind(this))
        window.AGENTX_SERVICE.aqm.contact.eAgentConsulting.listen(this.stopEm.bind(this))

    }

    populateAudio() {
        navigator.mediaDevices.getUserMedia({ audio: true })
        this.listAudioDevices()
    }

    _handleSelect(event: any) {
        this.hmm.setSinkId(event.target.value)

    }
    testEm() {
        console.log("Ring Ring Ring")
        if (this.isActive) {
            this.hmm.play()
        }
    }
    stopEm() {
        this.hmm.load()
    }
    async listAudioDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioDevices = devices.filter(device => device.kind === 'audiooutput');
            this.audioDevices1 = audioDevices.map((d: any) => html`<option value=${d.deviceId}>${d.label}</option>`)

            if (audioDevices.length > 0) {
                console.log('Available audio devices:');
                audioDevices.forEach(device => {
                    console.log(`  - Label: ${device.label || 'Unknown Device'}`);
                    console.log(`    Kind: ${device.kind}`);
                    console.log(`    Device ID: ${device.deviceId}`);
                    console.log(`    Group ID: ${device.groupId}`);
                });
            } else {
                console.log('No audio devices found.');
                this.populateAudio()
            }
        } catch (error) {
            console.error('Error enumerating devices:', error);
        }
    }
    render() {
        return html`
        <div class=${(this.hideMe ? "" : "bump")}>
            <button style="float: right;" @click=${() => this.hideMe = !this.hideMe}>Second Ringer</button>
            <div class=${"container" + (this.hideMe ? " hidden" : "")}>
            <audio id="ring" src="${ringMp3}" type="audio/mp3" controls loop></audio>
            <button @click=${() => this.isActive = !this.isActive}>${(this.isActive) ? "Enabled" : "Disabled"}</button>
            <br>
            <select @change=${this._handleSelect}>
                ${this.audioDevices1}
            </select>
            <button @click="${this.listAudioDevices}">Load</button>
            <br>
            <!-- <button @click="${this.testEm}">Test IT</button> 
            <button @click="${this.stopEm}">Stop IT</button> -->
            <div class="watermark">Demo Only</div>
            </div>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "second-ringer": SecondRinger;
    }
}
