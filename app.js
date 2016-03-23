(function(){
//popup part
    var btn_popup = document.getElementById("btn_popup");
    var popup = document.getElementById("popup");
    var popup_bar = document.getElementById("popup_bar");
    var btn_close = document.getElementById("btn_close");
    
    var btn_call = document.getElementById("btn_call");
    var btn_hangUp = document.getElementById("btn_hangUp");

    var offset = {x: 0, y: 0};

    popup_bar.addEventListener('mousedown', mouseDown, false);
    window.addEventListener('mouseup', mouseUp, false);

    function mouseUp()
    {
        window.removeEventListener('mousemove', popupMove, true);
    }

    function mouseDown(e) {
        offset.x = e.clientX - popup.offsetLeft;
        offset.y = e.clientY - popup.offsetTop;
        window.addEventListener('mousemove', popupMove, true);
    }

    function popupMove(e) {
        popup.style.position = 'fixed';
        var top = e.clientY - offset.y;
        var left = e.clientX - offset.x;
        popup.style.top = top + 'px';
        popup.style.left = left + 'px';
    }

    window.onkeydown = function (e) {
        if (e.keyCode == 27) { // if ESC key pressed
            btn_close.click(e);
        }
    }

    btn_popup.onclick = function (e) {
        // reset div position
        popup.style.top = Math.round($(window).height() * 7 / 10) + "px";
        popup.style.left = Math.round($(window).width() * 7 / 10) + "px";
        popup.style.width = "200px";
        popup.style.height = "130px";
        popup.style.display = "block";
        // register
        //register();
    }

    btn_close.onclick = function (e) {
        popup.style.display = "none";
    }

}());


//sipml5 part
var sTransferNumber;
var oRingTone, oRingbackTone;
var oSipStack, oSipSessionRegister, oSipSessionCall, oSipSessionTransferCall;
var videoRemote, videoLocal, audioRemote;
var bFullScreen = false;
var oNotifICall;
var bDisableVideo = false;
var viewVideoLocal, viewVideoRemote, viewLocalScreencast; // <video> (webrtc) or <div> (webrtc4all)
var oConfigCall;
var oReadyStateTimer;

window.onload = function () {
    if(window.console) {
        window.console.info("location=" + window.location);
    }
    audioRemote = document.getElementById("audio_remote");

    divCallCtrl.onmousemove = onDivCallCtrlMouseMove;

    // set debug level
    SIPml.setDebugLevel((window.localStorage && window.localStorage.getItem('org.doubango.expert.disable_debug') == "true") ? "error" : "info");

    loadCredentials();
    loadCallOptions();

    // Initialize call button
    uiBtnCallSetText("Call");

    var getPVal = function (PName) {
        var query = window.location.search.substring(1);
        var vars = query.split('&');
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=');
            if (decodeURIComponent(pair[0]) === PName) {
                return decodeURIComponent(pair[1]);
            }
        }
        return null;
    }

    var preInit = function() {
        // set default webrtc type (before initialization)
        var s_webrtc_type = getPVal("wt");
        var s_fps = getPVal("fps");
        var s_mvs = getPVal("mvs"); // maxVideoSize
        var s_mbwu = getPVal("mbwu"); // maxBandwidthUp (kbps)
        var s_mbwd = getPVal("mbwd"); // maxBandwidthUp (kbps)
        var s_za = getPVal("za"); // ZeroArtifacts
        var s_ndb = getPVal("ndb"); // NativeDebug

        if (s_webrtc_type) SIPml.setWebRtcType(s_webrtc_type);

        // initialize SIPML5
        SIPml.init(postInit);

        // set other options after initialization
        if (s_fps) SIPml.setFps(parseFloat(s_fps));
        if (s_mvs) SIPml.setMaxVideoSize(s_mvs);
        if (s_mbwu) SIPml.setMaxBandwidthUp(parseFloat(s_mbwu));
        if (s_mbwd) SIPml.setMaxBandwidthDown(parseFloat(s_mbwd));
        if (s_za) SIPml.setZeroArtifacts(s_za === "true");
        if (s_ndb == "true") SIPml.startNativeDebug();

        //var rinningApps = SIPml.getRunningApps();
        //var _rinningApps = Base64.decode(rinningApps);
        //tsk_utils_log_info(_rinningApps);
    }

    oReadyStateTimer = setInterval(function () {
        if (document.readyState === "complete") {
            clearInterval(oReadyStateTimer);
            // initialize SIPML5
            preInit();
        }
    },
    500);
};

// register sipml5
function register()
{
    SIPml.init(
        function (e) {
            var stack = new SIPml.Stack({realm: 'example.org', impi: 'bob', impu: 'sip:bob@example.org', password: 'mysecret',
                events_listener: {events: 'started', listener: function (e) {
                        var callSession = stack.newSession('call-audiovideo', {
                            video_local: document.getElementById('video-local'),
                            video_remote: document.getElementById('video-remote'),
                            audio_remote: document.getElementById('audio-remote')
                        });
                        callSession.call('alice');
                    }
                }
            });
            stack.start();
        }
    );
}

