var finesse = finesse || {};
finesse.gadget = finesse.gadget || {};
finesse.container = finesse.container || {};
clientLogs = finesse.cslogger.ClientLogger || {};  // for logging
var reasonCodes = {}
var labels = {"dnd":"Webex DND",
              "meeting": "Webex Meeting",
              "call": "Webex Call",
              "unavailable": "Webex Unavailable"}


function customLog(msg, args){
    let logName = "presence-gadget-logger:"
    if(args){
        console.log(logName+ msg, args);  
    } else {
        console.log(logName, msg);
    }
    clientLogs.log(msg);
}

let circleSvg = "M16 2.5A13.5 13.5 0 1 0 29.5 16 13.515 13.515 0 0 0 16 2.5";
let dndSvg = "M16 29.5c7.456 0 13.5-6.044 13.5-13.5S23.456 2.5 16 2.5 2.5 8.544 2.5 16 8.544 29.5 16 29.5M10 15h12a1 1 0 1 1 0 2H10a1 1 0 1 1 0-2";
let cameraSvg = "M28.789 9.724a1.5 1.5 0 0 0-1.505-.04l-3.782 2.404v-2.087a4.505 4.505 0 0 0-4.5-4.5h-12a4.505 4.505 0 0 0-4.5 4.5v12a4.505 4.505 0 0 0 4.5 4.5h12a4.505 4.505 0 0 0 4.5-4.5v-2.09l3.827 2.43c.208.105.438.16.672.16A1.504 1.504 0 0 0 29.5 21V11a1.49 1.49 0 0 0-.711-1.276";
let phoneSvg = "M27.806 21.744 25 18.938a3.035 3.035 0 0 0-4.286.003s-1.502 1.527-1.808 1.85a7.57 7.57 0 0 1-5.492-2.23 7.86 7.86 0 0 1-2.276-5.43c.37-.37 1.895-1.87 1.898-1.873a3.027 3.027 0 0 0 0-4.284L10.23 4.17a3.115 3.115 0 0 0-4.301 0l-1.5 1.5c-1.116 1.114-1.438 3.536-.824 6.17.548 2.355 2.085 6.043 6.286 10.245s7.89 5.738 10.244 6.287a11.3 11.3 0 0 0 2.544.306 5.16 5.16 0 0 0 3.627-1.13l1.5-1.5a3.04 3.04 0 0 0 0-4.303";
let shareSvg = "M25 5.5H7A4.505 4.505 0 0 0 2.5 10v11.784A4.72 4.72 0 0 0 7.216 26.5h17.568a4.72 4.72 0 0 0 4.716-4.716V10A4.505 4.505 0 0 0 25 5.5m-4.293 11.207a1 1 0 0 1-1.414 0L17 14.414V20a1 1 0 0 1-2 0v-5.587l-2.293 2.293a1 1 0 0 1-1.414-1.414l4-4a1 1 0 0 1 1.414 0l4 4a1 1 0 0 1 0 1.414";

function buildContainer(name, wrap, color, path, text){
    let containerDiv = $('<div class="container-div">');
    try{
        containerDiv.append($(`<div id="${name}-div" class="md-avatar-presence-icon-wrapper ${wrap}-wrap">`)
            .append($(`<svg id="${name}-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0, 0, 32, 32" class="${color}">`)
                .html(`<path d="${path}"></path>`)
            )
        );
        containerDiv.append($('<div class="font-div">')
            .append($(`<span id="${name}-span" class="custom-font">`)
                .text(text)
            )
        );
    }catch(e){
        customLog("buildContainer error:");
        customLog(e);
    }
    return containerDiv;
}

function updateContainer(name, wrap, color, path, text){
    try{
        $(`#${name}-div`).removeClass("circle-wrap");
        $(`#${name}-div`).removeClass("square-wrap");
        $(`#${name}-div`).addClass(`${wrap}-wrap`);
        $(`#${name}-svg`).removeClass("green");
        $(`#${name}-svg`).removeClass("red");
        $(`#${name}-svg`).removeClass("orange");
        $(`#${name}-svg`).addClass(color);
        $(`#${name}-svg`).html(`<path d="${path}"></path>`);
        $(`#${name}-span`).text(text);
    }catch(e){
        customLog("updateContainer error:");
        customLog(e);
    }
}

/** @namespace */
finesse.modules = finesse.modules || {};
finesse.modules.WebexPresenceConnector = (function ($) {
    var user, dialogs, clientlogs,

    /**
     * Handler for the onLoad of a User object. This occurs when the User object is initially read
     * from the Finesse server. Any once only initialization should be done within this function.
     */
    handleNotReadyReasonCodesSuccess = function (event) {
        customLog("handleNotReadyReasonCodesSuccess:");
        customLog(event);
        for(let code of event){
            reasonCodes[code.label] = code;
        }
    }

    handleNotReadyReasonCodesError = function (event) {
        customLog("handleNotReadyReasonCodesError:");
        customLog(event);
        updateContainer("connection", "circle", "red", circleSvg, "Reason Code Retrieval Error");
    }

    handleUserLoad = function (userevent) {
        customLog("handleUserLoad()");
        
        // Set the text on the gadget to be something default
        //$("#mainBody").text("Running9...");

        gadgets.window.adjustHeight();
        // setInterval(async function(){
        //     customLog("Repeat")
        // },5000);

        try{
            let state = user.getState();
            customLog(state);
            let reasonCode = user.getReasonCode();
            customLog(reasonCode);
            // let callReason = {
            //     "category": "NOT_READY",
            //     "code": "11",
            //     "forAll": "true",
            //     "id": "42",
            //     "label": "Webex Call",
            //     "uri": "/finesse/api/ReasonCode/42",
            //     "systemCode": "false"
            // }
            // user.setState("NOT_READY", callReason);

            user.getNotReadyReasonCodes({
                success: handleNotReadyReasonCodesSuccess,
                error: handleNotReadyReasonCodesError
            });
        }catch(ex){
            customLog('something went wrong:');
            customLog(ex);
        }
    },
      
    /**
     *  Handler for all User updates
     */
    handleUserChange = function(userevent) {
        customLog("handleUserChange()");
    };

    /** @scope finesse.modules.WebexPresenceConnector */
    return {
        /**
         * Performs all initialization for this gadget
         */
        init : function () {
            customLog("Hello World");
            customLog("HOSTNAME", HOSTNAME)

            var gadgetBody = $('<div id="mainBody"></div>');
            $('#embeddedPresenceGadget').append(gadgetBody);

            let connectionContainer = buildContainer("connection","circle","",circleSvg,"Loading");
            $('#mainBody').append(connectionContainer);
            let statusContainer = buildContainer("status","circle","",circleSvg,"Unknown");
            $('#mainBody').append(statusContainer);

            var cfg = finesse.gadget.Config;
            _util = finesse.utilities.Utilities;

            clientLogs = finesse.cslogger.ClientLogger;  // declare clientLogs
            // Initiate the ClientServices and load the user object. ClientServices are
            // initialized with a reference to the current configuration.
            finesse.clientservices.ClientServices.init(cfg, false);

            // Initiate the ClientLogs. The gadget id will be logged as a part of the message
            clientLogs.init(gadgets.Hub, "WebexPresenceConnector");

            // Create a user object for this user (Call GET User)
            user = new finesse.restservices.User({
                id: cfg.id, 
                onLoad : handleUserLoad,
                onChange : handleUserChange
            });

            customLog("user:");
            customLog(user);
            customLog(user._id);
            
            
            customLog("loading socket.io");
            let socketIOScript = document.createElement('script');
            socketIOScript.src = "https://cdn.socket.io/4.7.2/socket.io.min.js";
            socketIOScript.onload = function(){
                customLog("loaded socket.io.min.js");
                var socket = io(HOSTNAME,{
                    withCredentials: true,
                    // extraHeaders: {
                    //   "my-custom-header": "abcd"
                    // }
                  });

                  
                  socket.on('connect', (msg) => {
                    customLog("socket connected!");
                    updateContainer("connection", "circle", "green", circleSvg, "Connected");
                    socket.emit("message", {id:user._id})
                  });

                  socket.on('disconnect', (msg) => {
                    customLog("socket disconnected!");
                    updateContainer("connection", "circle", "red", circleSvg, "Disconnected");
                  });

                  socket.on('message', (msg) => {
                    customLog("socket message:");
                    customLog(msg);
                    if(msg.status === "dnd"){
                        updateContainer("status", "circle", "red", dndSvg, "Do Not Disturb");
                        try{
                            user.setState("NOT_READY", reasonCodes[labels["dnd"]]);
                        } catch(ex){
                            customLog("Could not set NOT_READY to dnd:");
                            customLog(ex);
                        }
                    } else if(msg.status === "call"){
                        updateContainer("status", "square", "orange", phoneSvg, "Call");
                        try{
                            user.setState("NOT_READY", reasonCodes[labels["call"]]);
                        } catch(ex){
                            customLog("Could not set NOT_READY to call:");
                            customLog(ex);
                        }
                    } else if(msg.status === "meeting" && msg.meetingType === "online"){
                        updateContainer("status", "square", "orange", cameraSvg, "Meeting");
                        try{
                            user.setState("NOT_READY", reasonCodes[labels["meeting"]]);
                        } catch(ex){
                            customLog("Could not set NOT_READY to meeting:");
                            customLog(ex);
                        }
                    } else if(msg.status === "presenting" && msg.meetingType === "online"){
                        updateContainer("status", "square", "red", shareSvg, "Presenting");
                        try{
                            user.setState("NOT_READY", reasonCodes[labels["meeting"]]);
                        } catch(ex){
                            customLog("Could not set NOT_READY to meeting:");
                            customLog(ex);
                        }
                    } else if(msg.status === "unknown" && msg.category === "unknown"){
                        updateContainer("status", "circle", "orange", circleSvg, "Unavailable");
                        try{
                            user.setState("NOT_READY", reasonCodes[labels["unavailable"]]);
                        } catch(ex){
                            customLog("Could not set NOT_READY to unavailable:");
                            customLog(ex);
                        }
                    } else {
                        updateContainer("status", "circle", "green", circleSvg, "Ready");
                        try{
                            user.setState("READY");
                        } catch(ex){
                            customLog("Could not set READY:");
                            customLog(ex);
                        }
                    }
                  });
                customLog("finished loading socket.io")
            }
            document.body.append(socketIOScript);

            // Initiate the ContainerServices and add a handler for when the tab is visible
            // to adjust the height of this gadget in case the tab was not visible
            // when the html was rendered (adjustHeight only works when tab is visible)
            containerServices = finesse.containerservices.ContainerServices.init();
            containerServices.addHandler(finesse.containerservices.ContainerServices.Topics.ACTIVE_TAB, function() {
                customLog("Gadget is now visible");  // log to Finesse logger
                // Automatically adjust the height of the gadget to show the html
                gadgets.window.adjustHeight();
            });
            containerServices.makeActiveTabReq();
        }
    };
}(jQuery));