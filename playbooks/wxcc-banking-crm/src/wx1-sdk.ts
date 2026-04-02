/**
 * Webex Contact Center SDK Component1
 * LitElement-based web component for Webex CC agent functionality
 */
import { LitElement, html, css } from "lit";
import { customElement, property, query, state } from "lit/decorators.js"
import Webex, { type ITask } from '@webex/contact-center'
import ringtoneUrl from './ringtone.wav'

// Unique logging prefix for easy console filtering
const LOG_PREFIX = '[WX1-SDK]';

// Logging utility with unique keys for filtering - matches crm-app.js pattern1
const Logger = {
    info: (key: string, message: string, data: any = null) => {
        const timestamp = new Date().toISOString();
        console.log(`${LOG_PREFIX}[INFO][${key}] ${timestamp} - ${message}`, data || '');
    },
    warn: (key: string, message: string, data: any = null) => {
        const timestamp = new Date().toISOString();
        console.warn(`${LOG_PREFIX}[WARN][${key}] ${timestamp} - ${message}`, data || '');
    },
    error: (key: string, message: string, error: any = null) => {
        const timestamp = new Date().toISOString();
        console.error(`${LOG_PREFIX}[ERROR][${key}] ${timestamp} - ${message}`, error || '');
    },
    debug: (key: string, message: string, data: any = null) => {
        const timestamp = new Date().toISOString();
        console.log(`${LOG_PREFIX}[DEBUG][${key}] ${timestamp} - ${message}`, data || '');
    },
    webex: (key: string, action: string, data: any = null) => {
        const timestamp = new Date().toISOString();
        console.log(`${LOG_PREFIX}[WEBEX][${key}] ${timestamp} - ${action}`, data || '');
    }
};

@customElement("wx1-sdk")
export class Wx1Sdk extends LitElement {
    @state() loggingIn: boolean = false;
    // Public properties
    @property({ reflect: true }) accesstoken = ""
    
    // Component state
    @state() teams = []
    @state() agentName = ""
    @state() ani = ""
    @state() voiceOptions = []
    @state() idleCodes = []
    @state() wrapupCodes = []
    @state() agentLogin = { dialNumber: '', teamId: '', loginOption: 'BROWSER' }
    @state() profile: any
    @state() station: any
    @state() loggedIn: boolean = false
    @state() task: any
    @state() tControls: any
    @state() cad: any
    @state() isMuted: boolean = false
    @state() isOutboundCall: boolean = false // Track if current call is outbound
    
    // DOM references
    @query('#selectIdleCode') idleCode: any
    private webex: any;
    private ringAudio: HTMLAudioElement;
    static styles = [
        css`
    :host {
        display: block;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        padding: 20px;
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        border: 1px solid #e1e5e9;
        border-radius: 12px;
        max-width: 450px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        margin: 10px;
    }

    .status {
        color: #0078d4;
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 8px;
    }

    label {
        display: block;
        font-weight: 500;
        color: #2c3e50;
        margin-bottom: 5px;
        margin-top: 12px;
        font-size: 13px;
    }

    input, select {
        width: 100%;
        padding: 10px 12px;
        border: 2px solid #e1e5e9;
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;
        transition: all 0.3s ease;
        margin-bottom: 8px;
        box-sizing: border-box;
    }

    input:focus, select:focus {
        outline: none;
        border-color: #0078d4;
        box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.1);
    }

    button {
        background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%);
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        margin: 5px 5px 5px 0;
        box-shadow: 0 2px 8px rgba(0, 120, 212, 0.2);
    }

    button:hover {
        background: linear-gradient(135deg, #106ebe 0%, #005a9e 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 120, 212, 0.3);
    }

    button:active {
        transform: translateY(0);
        box-shadow: 0 2px 6px rgba(0, 120, 212, 0.2);
    }

    /* Logout button styling */
    button[onclick*="stationLogout"] {
        background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
        box-shadow: 0 2px 8px rgba(220, 53, 69, 0.2);
    }

    button[onclick*="stationLogout"]:hover {
        background: linear-gradient(135deg, #c82333 0%, #a71e2a 100%);
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
    }

    /* Task control buttons */
    button[onclick*="hold"] {
        background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%);
        color: #212529;
        box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2);
    }

    button[onclick*="resume"] {
        background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
        box-shadow: 0 2px 8px rgba(40, 167, 69, 0.2);
    }

    button[onclick*="end"] {
        background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
        box-shadow: 0 2px 8px rgba(220, 53, 69, 0.2);
    }

    /* Mute/Unmute buttons - using attribute selectors for action type */
    button[onclick*="mute"] {
        background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
        box-shadow: 0 2px 8px rgba(108, 117, 125, 0.2);
    }

    button[onclick*="unmute"] {
        background: linear-gradient(135deg, #fd7e14 0%, #e8590c 100%);
        box-shadow: 0 2px 8px rgba(253, 126, 20, 0.2);
    }

    p {
        margin: 8px 0;
        color: #2c3e50;
        line-height: 1.5;
    }

    p strong {
        color: #0078d4;
        font-weight: 600;
    }

    br {
        line-height: 1.8;
    }

    /* Welcome message styling */
    p:has(strong) {
        background: rgba(0, 120, 212, 0.1);
        padding: 12px;
        border-radius: 6px;
        border-left: 4px solid #0078d4;
        font-weight: 500;
    }

    /* CAD (Call Associated Details) styling */
    div:last-child p {
        background: #f8f9fa;
        padding: 8px 12px;
        border-radius: 4px;
        margin: 4px 0;
        font-size: 13px;
        border-left: 3px solid #0078d4;
    }

    /* Loading states */
    :host([loading]) {
        opacity: 0.7;
        pointer-events: none;
    }

    /* Responsive design */
    @media (max-width: 480px) {
        :host {
            max-width: 100%;
            margin: 5px;
            padding: 15px;
        }
        
        button {
            width: 100%;
            margin: 5px 0;
        }
        
        input, select {
            font-size: 16px; /* Prevents zoom on iOS */
        }
    }
        `
    ];

    constructor() {
        super();
        // Initialize audio element for incoming call notifications
        this.ringAudio = new Audio(ringtoneUrl);
        this.ringAudio.loop = true;
        this.ringAudio.volume = 0.7;
        Logger.debug('AUDIO-INIT', 'Ring audio element initialized');

        // Minimal unload hooks with user prompt to allow async logout to start
        window.addEventListener('beforeunload', this._handleBeforeUnload);
        window.addEventListener('pagehide', this._handlePageHide);
    }

    // Attempt logout on refresh/close with clear logs
    private _handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (this.loggedIn) {
            Logger.info('UNLOAD', 'beforeunload: attempting stationLogout');
            try { this.webex?.cc?.stationLogout({ logoutReason: 'Page closing' }); } catch (err) {
                Logger.error('UNLOAD', 'beforeunload: stationLogout error', err);
            }
            // Show confirm dialog to give the SDK a moment to process
            e.preventDefault();
            e.returnValue = '';
        } else {
            Logger.debug('UNLOAD', 'beforeunload: not logged in, skipping logout');
        }
    }

    private _handlePageHide = (ev: PageTransitionEvent) => {
        Logger.info('UNLOAD', `pagehide: persisted=${ev?.persisted}`);
        if (this.loggedIn) {
            try { this.webex?.cc?.stationLogout({ logoutReason: 'Page hide' }); } catch (err) {
                Logger.error('UNLOAD', 'pagehide: stationLogout error', err);
            }
        }
    }

    disconnectedCallback(): void {
        window.removeEventListener('beforeunload', this._handleBeforeUnload);
        window.removeEventListener('pagehide', this._handlePageHide);
        super.disconnectedCallback();
    }

    /**
     * Play incoming call audio notification
     */
    playIncomingCallAudio() {
        try {
            Logger.debug('AUDIO-PLAY', 'Starting incoming call audio notification');
            this.ringAudio.currentTime = 0; // Reset to beginning
            const playPromise = this.ringAudio.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    Logger.info('AUDIO-PLAY', 'Ring audio started successfully');
                }).catch(error => {
                    Logger.error('AUDIO-PLAY', 'Failed to play ring audio', error);
                });
            }
        } catch (error) {
            Logger.error('AUDIO-PLAY', 'Error playing incoming call audio', error);
        }
    }

    /**
     * Stop incoming call audio notification
     */
    stopIncomingCallAudio() {
        try {
            if (!this.ringAudio.paused) {
                this.ringAudio.pause();
                this.ringAudio.currentTime = 0;
                Logger.debug('AUDIO-STOP', 'Ring audio stopped');
            }
        } catch (error) {
            Logger.error('AUDIO-STOP', 'Error stopping incoming call audio', error);
        }
    }


    /**
     * Initialize Webex SDK connection with access token [SHOW 1]
     */
    async startConnection() {
        this.loggingIn = true;
        try {
            this.webex = new Webex({
                credentials: {
                    access_token: this.accesstoken,
                },
            });
            await new Promise((resolve) => {
                this.webex.once('ready', async () => {
                    Logger.info('SDK-INIT', 'Webex SDK initialized with OAuth token');
                    this.profile = await this.webex.cc.register()
                    Logger.debug('AGENT-LOGIN-STATUS', 'Agent login status check', { isAgentLoggedIn: this.profile.isAgentLoggedIn });
                    if (this.profile.isAgentLoggedIn) {
                        Logger.debug('AGENT-LOGIN', 'Agent already logged in from previous session - restoring state');
                        this.loggedIn = true;
                    }
                    this.getOptions()
                    resolve(null);
                });
            });
        } finally {
            this.loggingIn = false;
        }
    }

    /**
     * Setup agent options and event listeners after registration [show 2]
     */
    getOptions() {
        
        this.voiceOptions = this.profile.loginVoiceOptions.map((item: any) => html`<option value=${item}>${item}</option>`)
        this.teams = this.profile.teams.map((item: any) => html`<option value=${item.id}>${item.name}</option>`)
        this.agentName = this.profile.agentName
        this.idleCodes = this.profile.idleCodes.filter((item: any) => !item.isSystem).map((item: any) => html`<option value=${item.id}>${item.name}</option>`)
        this.wrapupCodes = this.profile.wrapupCodes.filter((item: any) => !item.isSystem).map((item: any) => html`<option value=${item.id}>${item.name}</option>`)
       
        this.webex.cc.on("agent:stateChangeSuccess", (event: any) => {
            Logger.debug('AGENT-STATE', 'AgentStateChangeSuccess event', event);
            if (this.idleCode) {
                this.idleCode.value = event.auxCodeId;
            } else {
                Logger.warn('AGENT-STATE', 'IdleCode element not available, skipping value update', { auxCodeId: event.auxCodeId });
            }
        });

        // Agent receives incoming call.
        this.webex.cc.on("task:incoming", (task: ITask) => {

            Logger.webex('TASK-INCOMING', 'New incoming task received', { 
                taskUuid: (task as any).uuid, 
                ani: (task.data as any)?.interaction?.callAssociatedDetails?.ani 
            });
            this.task = task
            // Extract and display Call Associated Details (CAD)
            this.cad = Object.entries(this.task.data.interaction.callAssociatedDetails).map(([key, value]) => { return html`<p>${key}: ${value}</p>` })
            // Extract ANI from task data
            this.ani = this.task.data.interaction.callAssociatedDetails.ani
            Logger.debug('ANI-EXTRACT', 'Extracted ANI from task', { ani: this.ani });
            
            // Play incoming call audio notification
            this.playIncomingCallAudio();
            
            // Check if this is an outbound call we initiated - skip CRM search for outbound calls
            Logger.debug('OUTBOUND-FLAG', 'Checking isOutboundCall flag in task:incoming', { isOutboundCall: this.isOutboundCall });
            
            if (!this.isOutboundCall) {
                // Only search CRM for inbound calls
                Logger.info('CRM-SEARCH', 'Inbound call detected - performing CRM search');
                this.callCrmSearch(this.ani);
            } else {
                Logger.info('CRM-SEARCH', 'Outbound call detected - skipping CRM search');
            }
            
            // Check if browser login is selected to show answer/decline buttons
            const isBrowserLogin = this.agentLogin.loginOption === 'BROWSER';
            Logger.debug('LOGIN-OPTION', 'Checking login option for task controls', { 
                loginOption: this.agentLogin.loginOption, 
                isBrowserLogin: isBrowserLogin 
            });
            
            if (isBrowserLogin) {
                // Show answer/decline buttons for browser login
                this.tControls = html`
                    <button @click=${this.actionTask.bind(this, 'answer')}>Answer</button>
                    <button @click=${this.actionTask.bind(this, 'decline')}>Decline</button>
                `
                Logger.info('TASK-CONTROLS', 'Browser login detected - showing answer/decline buttons');
            } else {
                // For non-browser login (phone/desk phone), show incoming call message only
                this.tControls = html`<p>📞 Incoming call from ${this.ani} - Please answer on your phone</p>`
                Logger.info('TASK-CONTROLS', 'Non-browser login detected - showing incoming call message');
            }
            this.task.once("task:end", (task: ITask) => {
                this.stopIncomingCallAudio();
                Logger.webex('TASK-END', 'Task ended', { taskUuid: (task as any).uuid });
                // Show wrap-up dropdown if required
                if(task.data.wrapUpRequired){
                      this.stopIncomingCallAudio();
                this.tControls = html`<select @change=${(e: any) => this.handleWrapupSelection(e)}>
                    <option value="">Select wrap-up reason...</option>
                    ${this.task.wrapupData.wrapUpProps.wrapUpReasonList.map((i:any)=>{return html`<option value=${i.id} data-name=${i.name}>${i.name}</option>`})}
                </select>`
                } else {
                    this.loggedIn = true;
                }
                // if empty redirect to wrapup screen
              
            })
            
            // Listen for when call is assigned/answered - this is when we show call controls
            this.task.on("task:assigned", () => {
                Logger.webex('TASK-ASSIGNED', 'Task assigned - call is now active');
                // Show call control buttons based on login type
                // Stop incoming call audio when task ends (For non webRTC calls)
                this.stopIncomingCallAudio();
                Logger.debug('update-controls', 'Updating call controls on task assigned');
                this.updateCallControls();
            })

            // Listen for media tracks (audio) for browser-based calls
            this.task.on("task:media", (track: any) => {
                Logger.webex('TASK-MEDIA', 'Media track received', { track });
                this.handleTaskMedia(track);
            })

            // This is a workaround untill task supports outbound events
            this.webex.cc.once("AgentOutboundFailed", (event: any) => {
                Logger.error('OUTBOUND-FAILED', 'AgentOutboundFailed event received', event);
                this.stopIncomingCallAudio();
                this.tControls = html`<select @change=${(e: any) => this.handleWrapupSelection(e)}>
                    <option value="">Select wrap-up reason...</option>
                    ${this.task.wrapupData.wrapUpProps.wrapUpReasonList.map((i:any)=>{return html`<option value=${i.id} data-name=${i.name}>${i.name}</option>`})}
                </select>`

                this.webex.cc.once("AgentWrappedUp", (event: any) => {
                    Logger.webex('WRAPUP-COMPLETE', 'wrappedup event received after outbound failure', event);
                    alert("wrapped up from outdial click ok")
                // Stop incoming call audio when task is wrapped up
                this.stopIncomingCallAudio();
                
                this.task = null
                this.tControls = null
                this.cad = null
                this.isMuted = false // Reset mute state
                this.isOutboundCall = false // Reset outbound call flag
                this.webex.cc.off("AgentWrappedUp");
                this.webex.cc.off("AgentOutboundFailed");
                });
            });

            this.task.once("task:wrappedup", (task: ITask) => {
                alert("wrapped up click ok")
                // Stop incoming call audio when task is wrapped up
                this.stopIncomingCallAudio();
                this.task = null
                this.tControls = null
                this.cad = null
                this.isMuted = false // Reset mute state
                this.isOutboundCall = false // Reset outbound call flag
                
            })

        })

    }

    /**
     * Handle task actions (hold, resume, end, wrapup) [show 3]
     */
    async actionTask(action: string, aux1:string, aux2:string) {
        Logger.webex('TASK-ACTION', `Task action triggered: ${action}`, { action, aux1, aux2 });
        switch (action) {
            case "answer": {
                try {
                    // Stop incoming call audio
                    this.stopIncomingCallAudio();
                    
                    await this.task.accept(this.task.data.interactionId);
                    Logger.webex('TASK-ANSWER', 'Call answered successfully');
                    // Note: tControls will be updated by the task:assigned event listener
                } catch (error) {
                    Logger.error('TASK-ANSWER', 'Failed to answer call', error);
                }
                break
            }
            case "decline": {
                try {
                    // Stop incoming call audio
                    this.stopIncomingCallAudio();
                    
                    await this.task.decline(this.task.data.interactionId);
                    Logger.webex('TASK-DECLINE', 'Call declined successfully');
                    // Clear task and controls
                    this.task = null;
                    this.tControls = null;
                    this.cad = null;
                    this.isMuted = false; // Reset mute state
                    this.isOutboundCall = false; // Reset outbound call flag
                } catch (error) {
                    Logger.error('TASK-DECLINE', 'Failed to decline call', error);
                }
                break
            }
            case "end": {
                // Stop incoming call audio
                this.stopIncomingCallAudio();
                
                this.task.end()
                break
            }
            case "hold": {
                this.task.hold()
                break
            }
            case "resume": {
                this.task.resume()
                break
            }
            case "wrapup":{
                this.task.wrapup({
                    wrapUpReason:`${aux2}`,
                    auxCodeId: `${aux1}`
                })
                break
            }
            case "mute": {
                try {
                    if (this.task) {
                        await this.task.toggleMute();
                        this.isMuted = true;
                        Logger.webex('TASK-MUTE', 'Call muted successfully using SDK toggleMute');
                        
                        // Update controls to show current mute state
                        this.updateCallControls();
                    }
                } catch (error) {
                    Logger.error('TASK-MUTE', 'Failed to mute call', error);
                }
                break
            }
            case "unmute": {
                try {
                    if (this.task) {
                        await this.task.toggleMute();
                        this.isMuted = false;
                        Logger.webex('TASK-UNMUTE', 'Call unmuted successfully using SDK toggleMute');
                        
                        // Update controls to show current mute state
                        this.updateCallControls();
                    }
                } catch (error) {
                    Logger.error('TASK-UNMUTE', 'Failed to unmute call', error);
                }
                break
            }
        }
    }

    /**
     * Update call control buttons based on login type and call state
     */
    updateCallControls() {
        const isBrowserLogin = this.agentLogin.loginOption === 'BROWSER';
        
        if (isBrowserLogin) {
            // Browser login: show all controls including mute/unmute
            const muteButton = this.isMuted 
                ? html`<button @click=${this.actionTask.bind(this, 'unmute')}>🔊 Unmute</button>`
                : html`<button @click=${this.actionTask.bind(this, 'mute')}>🔇 Mute</button>`;
                
            this.tControls = html`
                <button @click=${this.actionTask.bind(this, 'hold')}>Hold</button>
                <button @click=${this.actionTask.bind(this, 'resume')}>Resume</button>
                ${muteButton}
                <button @click=${this.actionTask.bind(this, 'end')}>End</button>
            `;
        } else {
            // Non-browser login: show basic controls only
            this.tControls = html`
                <button @click=${this.actionTask.bind(this, 'hold')}>Hold</button>
                <button @click=${this.actionTask.bind(this, 'resume')}>Resume</button>
                <button @click=${this.actionTask.bind(this, 'end')}>End</button>
            `;
        }
    }


    /**
     * Place an outbound click-to-dial call to the specified phone number [show 4]
     * @param phone - Phone number to dial (E164 format recommended)
     */
    async placeClicktoDialcall(phone: string) {
        Logger.webex('CALL-DIAL', 'Placing click-to-dial call', { phone });
        
        try {
            // Validate that agent is logged in
            if (!this.loggedIn || !this.webex) {
                Logger.error('CALL-DIAL', 'Agent not logged in or Webex not initialized');
                alert('Please login first before making calls');
                return;
            }

            // Validate phone number
            if (!phone || phone.trim() === '') {
                Logger.error('CALL-DIAL', 'Invalid phone number provided');
                alert('Invalid phone number provided');
                return;
            }

            // Clean phone number (remove non-digits except +)
            const cleanedPhone = phone.replace(/[^\d+]/g, '');
            Logger.debug('CALL-DIAL', 'Cleaned phone number', { original: phone, cleaned: cleanedPhone });

            // Check if agent is already on a call
            if (this.task) {
                Logger.warn('CALL-DIAL', 'Agent already has an active task');
                alert('Cannot place outbound call - agent already has an active task');
                return;
            }

            Logger.info('CALL-DIAL', 'Starting outbound call using startOutdial', { phoneNumber: cleanedPhone });
            
            // Set flag to indicate this will be an outbound call
            this.isOutboundCall = true;
            Logger.debug('OUTBOUND-FLAG', 'Set isOutboundCall flag to true before placing call', { isOutboundCall: this.isOutboundCall });
            
            // Use the Webex Contact Center SDK to start outbound call
            await this.webex.cc.startOutdial(cleanedPhone); // E164 is an International Standard of Telephone numbers
            
            Logger.webex('CALL-DIAL', 'Outbound call initiated successfully', { phoneNumber: cleanedPhone });
            alert(`Outbound call initiated to ${cleanedPhone} - CLICK ANSWER`);
            
        } catch (error) {
            Logger.error('CALL-DIAL', 'Failed to place outbound call', error);
            alert(`Failed to place call: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Handle media tracks (audio) for browser-based calls
     */
    handleTaskMedia(track: any) {
        Logger.webex('TASK-MEDIA', 'Media track received for active call', {
            trackKind: track?.kind,
            taskId: (this.task as any)?.uuid
        });
        
        // Find or create remote audio element for playback
        let remoteAudio = document.getElementById('remote-audio') as HTMLAudioElement;
        if (!remoteAudio) {
            // Create audio element if it doesn't exist
            remoteAudio = document.createElement('audio');
            remoteAudio.id = 'remote-audio';
            remoteAudio.autoplay = true;
            remoteAudio.style.display = 'none'; // Hidden audio element
            document.body.appendChild(remoteAudio);
            Logger.debug('TASK-MEDIA', 'Created remote audio element');
        }
        
        // Set the media stream for audio playback
        remoteAudio.srcObject = new MediaStream([track]);
        Logger.info('TASK-MEDIA', 'Audio stream connected for call playback');
    }

    handleWrapupSelection(e: any) {
        const selectedValue = e.target.value;
        const selectedOption = e.target.selectedOptions[0];
        
        if (selectedValue && selectedOption) {
            const wrapupName = selectedOption.dataset.name || selectedOption.textContent;
            Logger.webex('WRAPUP-SELECT', 'Wrap-up code selected', { 
                wrapupId: selectedValue, 
                wrapupName: wrapupName 
            });
            this.actionTask("wrapup", selectedValue, wrapupName);
        }
    }

    /**
     * Search CRM for customer data using incoming call ANI
     */
    callCrmSearch(searchTerm: string) {
        try {
            // Try to access the parent window's CRM functions
            const parentWindow = window.parent as any;
            const currentWindow = window as any;
            
            // Try to access and call the searchCustomers function from crm-app.js
            if (parentWindow && parentWindow.searchCustomers && typeof parentWindow.searchCustomers === 'function') {
                Logger.info('CRM-INTEGRATION', 'Found parent window searchCustomers function');
                // Set the search input value in the parent window
                const searchInput = parentWindow.document.getElementById('search-input');
                if (searchInput) {
                    (searchInput as HTMLInputElement).value = searchTerm;
                    // Call the searchCustomers function
                    parentWindow.searchCustomers();
                    Logger.webex('CRM-SEARCH', 'Called parent window searchCustomers function', { searchTerm });
                    
                    // After calling search, get the customer data and show popup
                    setTimeout(() => {
                        Logger.debug('CRM-POPUP', 'Attempting to show customer data from CRM');
                        this.showCustomerDataFromCrm(parentWindow, searchTerm);
                    }, 500); // Wait for search to complete
                }
            } 
        } catch (error) {
            Logger.error('CRM-SEARCH', 'Error calling CRM search', error);
        }
    }

    showCustomerDataFromCrm(windowContext: any, searchTerm: string) {
        try {
            // Try multiple ways to access the customers data from the CRM
            let customers = {};
            
            // Method 1: Direct access from window
            if (windowContext.customers) {
                Logger.debug('CRM-DATA', 'Method 1: Found customers in windowContext');
                customers = windowContext.customers;
            }
            else {
                Logger.debug('CRM-DATA', 'No customers found in windowContext');
            }
            
            Logger.debug('CRM-DATA', 'Found customers in CRM', { 
                customerCount: Object.keys(customers).length 
            });

            // Find customer matching the search term
            let foundCustomer = null;
            for (const customerId in customers) {
                const customer = customers[customerId];
                Logger.debug('CRM-SEARCH', 'Checking customer', { 
                    customerId, 
                    customerName: customer?.firstName + ' ' + customer?.lastName 
                });
                if (customer && customer.firstName && customer.lastName &&
                    (customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (customer.phone && customer.phone.includes(searchTerm)) ||
                    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())))) {
                    foundCustomer = customer;
                    Logger.info('CRM-MATCH', 'Found matching customer', { 
                        customerName: foundCustomer.firstName + ' ' + foundCustomer.lastName,
                        searchTerm 
                    });
                    break;
                }
            }
            
            if (foundCustomer) {
                this.createCustomerPopup(foundCustomer, 'Customer Found in CRM');
            } else {
                Logger.warn('CRM-NO-MATCH', 'No matching customer found', { 
                    searchTerm,
                    availableCustomers: Object.keys(customers)
                });
            }
        } catch (error) {
            Logger.error('CRM-DATA', 'Error accessing CRM customer data', error);
        }
    }

    /**
     * Display customer information popup when match found
     */
    createCustomerPopup(customer: any, title: string) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.3);
            z-index: 1000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        // Create popup content
        const popup = document.createElement('div');
        popup.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        popup.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #2c3e50;">📞 ${title}</h2>
                <button id="close-popup-btn"
                        style="background: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer;">
                    ✕ Close
                </button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 15px; line-height: 1.6;">
                <div><strong>Customer ID:</strong></div>
                <div>${customer.id}</div>
                
                <div><strong>Name:</strong></div>
                <div>${customer.firstName} ${customer.lastName}</div>
                
                <div><strong>Phone:</strong></div>
                <div style="color: #007bff; font-weight: bold;">${customer.phone}</div>
                
                <div><strong>Email:</strong></div>
                <div>${customer.email}</div>
                
                <div><strong>Address:</strong></div>
                <div>${customer.address}</div>
                
                <div><strong>Date of Birth:</strong></div>
                <div>${customer.dob}</div>
                
                <div><strong>Member Since:</strong></div>
                <div>${customer.memberSince}</div>
                
                <div><strong>Notes:</strong></div>
                <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; border-left: 4px solid #007bff;">
                    ${customer.notes}
                </div>
            </div>
            
        `;
        
        overlay.className = 'popup-overlay';
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        
        Logger.info('CRM-POPUP', 'Customer popup displayed', { 
            customerName: customer.firstName + ' ' + customer.lastName 
        });
        
        // Function to close popup
        const closePopup = () => {
            if (overlay.parentNode) {
                overlay.remove();
                Logger.debug('CRM-POPUP', 'Customer popup closed');
            }
        };
        
        // Close button event listener
        const closeBtn = popup.querySelector('#close-popup-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closePopup();
            });
        }
        
        // Close popup when clicking overlay (but not the popup content)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closePopup();
            }
        });
        
        // Prevent popup content clicks from closing the modal
        popup.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Auto-close after 15 seconds
        setTimeout(() => {
            closePopup();
        }, 15000);
    }

    /**
     * Login agent to Webex Contact Center station
     */
    async stationLogin() {
        this.loggingIn = true;
        
        try {
            Logger.info('STATION-LOGIN', 'Attempting station login', this.agentLogin);
            this.webex.cc.on('agent:stationLoginSuccess', (eventData: any) => {
                Logger.info('STATION-LOGIN', 'Station login successful via event', eventData);
            })
            this.station = await this.webex.cc.stationLogin(this.agentLogin)
            this.loggedIn = true
            Logger.info('STATION-LOGIN', 'Station login completed successfully');
        } catch (error) {
            Logger.error('STATION-LOGIN', 'Station login failed', error);
            this.loggedIn = false;
            throw error; // Re-throw error for caller to handle
        } finally {
            this.loggingIn = false;
        }
    }
    /**
     * Logout agent and cleanup session
     */
    async stationLogout() {
        try {
            await this.webex.cc.stationLogout({ logoutReason: 'End of shift' })
            Logger.info('STATION-LOGOUT', 'Logged out successfully');
            this.loggedIn = false
           // await this.webex.cc.deregister()
            this.profile = null
            this.webex.cc.off("AgentWrappedUp");
            this.webex.cc.off("AgentOutboundFailed");
        } catch (error) {
            Logger.error('STATION-LOGOUT', 'Logout failed', error);
        }
    }
    
    /**
     * Change agent availability status (Available/Idle)
     */
    async changeStatus(e: any) {
        try {
            // Validate event and target
            if (!e || !e.target) {
                Logger.error('AGENT-STATE', 'Invalid event object - missing target', { event: e });
                return;
            }

            const auxCodeId = e.target.value;
            if (auxCodeId === undefined || auxCodeId === null) {
                Logger.error('AGENT-STATE', 'Invalid auxCodeId value', { auxCodeId });
                return;
            }

            let targetState = auxCodeId !== "0" ? "Idle" : "Available";
            
            Logger.debug('AGENT-STATE', 'Attempting to change agent state', { 
                targetState, 
                auxCodeId 
            });

            const response = await this.webex.cc.setAgentState({
                state: targetState,
                auxCodeId: auxCodeId,
                lastStateChangeReason: 'User Initiated'
            });
            
            Logger.info('AGENT-STATE', 'State set successfully', { 
                targetState, 
                auxCodeId 
            });
            
            return response;
        } catch (error) {
            Logger.error('AGENT-STATE', 'Failed to set state', error);
            throw error;
        }
    }


    /* main landing page for the whole UI operations */
    render() {
        return html`
            <div>
                <!-- Login -->
                ${!this.profile ? html`
                    <label>Access Token: </label><input @change=${(e: any) => this.accesstoken = e.target.value} id="token" aria-label="Token"><br>
                    <button @click=${this.startConnection} ?disabled=${this.loggingIn}>Login</button>
                    ${this.loggingIn ? html`<span style="color:#0078d4;font-weight:500;">Logging in...</span>` : ''}
                ` : html``}

                <!-- select station options -->
                ${this.profile && !this.loggedIn ? html`
                    <p>Welcome ${this.profile.agentName}</p>
                    <label>Handle calls using</label>
                    <select @change=${(e: any) => this.agentLogin = { ...this.agentLogin, loginOption: e.target.selectedOptions[0].value }} id="selectVoiceOption">
                        <option></option>
                        ${this.voiceOptions}
                    </select><br>
                    <label>Your team</label>
                    <select @change=${(e: any) => this.agentLogin.teamId = e.target.selectedOptions[0].value} id="selectTeam">
                        <option></option>
                        ${this.teams}
                    </select><br>
                    ${this.agentLogin.loginOption != 'BROWSER' ? html`<label>${this.agentLogin.loginOption}: </label><input @change=${(e: any) => this.agentLogin.dialNumber = e.target.value}><br>` : html``}
                    <button @click=${this.stationLogin} ?disabled=${this.loggingIn}>Station Login</button>
                    ${this.loggingIn ? html`<span style="color:#0078d4;font-weight:500;">Logging in...</span>` : ''}
                ` : html``}

                <!-- logged in  -->
                ${this.loggedIn ? html`
                    <p>Logged in as: <strong>${this.agentName}</strong></p>
                    <button @click=${this.stationLogout}>Logout</button>
                    <select id="selectIdleCode" @change=${this.changeStatus}>
                        ${this.idleCodes}
                    </select>
                    ${this.cad}<br>
                    ${this.tControls}
                ` : html``}
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "wx1-sdk": Wx1Sdk;
    }
}
