(function(){
//popup part
    var btn_popup = document.getElementById("btn_popup");
    var popup = document.getElementById("popup");
    var popup_bar = document.getElementById("popup_bar");
    var btn_close = document.getElementById("btn_close");
    
    var btnCall = document.getElementById("btnCall");
    var btnHangUp = document.getElementById("btnHangUp");

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
        popup.style.top = Math.round($(window).height() * 50 / 100) + "px";
        popup.style.left = Math.round($(window).width() * 70 / 100) + "px";
        popup.style.width = "200px";
        popup.style.height = "180px";
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
var audioRemote;
var bFullScreen = false;
var oNotifICall;
var bDisableVideo = false;
var viewVideoLocal, viewVideoRemote, viewLocalScreencast; // <video> (webrtc) or <div> (webrtc4all)
var oConfigCall;
var oReadyStateTimer;

var txtDisplayName = "103";
var txtPrivateIdentity = "103";
var txtPublicIdentity = "sip:103@192.168.0.105";
var txtPassword = "103pas";
var txtRealm = "192.168.0.105";
var txtPhoneNumber = "101"; //кому звоним

window.onload = function () {
    if(window.console) {
        window.console.info("location=" + window.location);
    }
    audioRemote = document.getElementById("audio_remote");

    // set debug level
    SIPml.setDebugLevel((window.localStorage && window.localStorage.getItem('org.doubango.expert.disable_debug') == "true") ? "error" : "info");

    //loadCredentials();
    //loadCallOptions();

    // Initialize call button
    //uiBtnCallSetText("Call");

    var getPVal = function (PName) {
        var query = window.location.search.substring(1);
        console.log("lol");
        console.log(query);
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

function postInit() {
    // check webrtc4all version
    if (SIPml.isWebRtc4AllSupported() && SIPml.isWebRtc4AllPluginOutdated()) {  //  TODO
        if (confirm("Your WebRtc4all extension is outdated (" + SIPml.getWebRtc4AllVersion() + "). A new version with critical bug fix is available. Do you want to install it?\nIMPORTANT: You must restart your browser after the installation.")) {
            window.location = 'http://code.google.com/p/webrtc4all/downloads/list';
            return;
        }
    }

    // check for WebRTC support
    if (!SIPml.isWebRtcSupported()) {
        // is it chrome?
        if (SIPml.getNavigatorFriendlyName() == 'chrome') {
            if (confirm("You're using an old Chrome version or WebRTC is not enabled.\nDo you want to see how to enable WebRTC?")) {
                window.location = 'http://www.webrtc.org/running-the-demos';
            } else {
                window.location = "index.html";
            }
            return;
        }

        // for now the plugins (WebRTC4all only works on Windows)
        if (SIPml.getSystemFriendlyName() == 'windows') {
            // Internet explorer
            if (SIPml.getNavigatorFriendlyName() == 'ie') {
                // Check for IE version 
                if (parseFloat(SIPml.getNavigatorVersion()) < 9.0) {
                    if (confirm("You are using an old IE version. You need at least version 9. Would you like to update IE?")) {
                        window.location = 'http://windows.microsoft.com/en-us/internet-explorer/products/ie/home';
                    } else {
                        window.location = "index.html";
                    }
                }

                // check for WebRTC4all extension
                if (!SIPml.isWebRtc4AllSupported()) {
                    if (confirm("webrtc4all extension is not installed. Do you want to install it?\nIMPORTANT: You must restart your browser after the installation.")) {
                        window.location = 'http://code.google.com/p/webrtc4all/downloads/list';
                    } else {
                        // Must do nothing: give the user the chance to accept the extension
                        // window.location = "index.html";
                    }
                }
                // break page loading ('window.location' won't stop JS execution)
                if (!SIPml.isWebRtc4AllSupported()) {
                    return;
                }
            } else if (SIPml.getNavigatorFriendlyName() == "safari" || SIPml.getNavigatorFriendlyName() == "firefox" || SIPml.getNavigatorFriendlyName() == "opera") {
                if (confirm("Your browser don't support WebRTC.\nDo you want to install WebRTC4all extension to enjoy audio/video calls?\nIMPORTANT: You must restart your browser after the installation.")) {
                    window.location = 'http://code.google.com/p/webrtc4all/downloads/list';
                } else {
                    window.location = "index.html";
                }
                return;
            }
        }
        // OSX, Unix, Android, iOS...
        else {
            if (confirm('WebRTC not supported on your browser.\nDo you want to download a WebRTC-capable browser?')) {
                window.location = 'https://www.google.com/intl/en/chrome/browser/';
            } else {
                window.location = "index.html";
            }
            return;
        }
    }

    // checks for WebSocket support
    if (!SIPml.isWebSocketSupported() && !SIPml.isWebRtc4AllSupported()) {
        if (confirm('Your browser don\'t support WebSockets.\nDo you want to download a WebSocket-capable browser?')) {
            window.location = 'https://www.google.com/intl/en/chrome/browser/';
        } else {
            window.location = "index.html";
        }
        return;
    }

    // FIXME: displays must be per session

    // attachs video displays
    if (SIPml.isWebRtc4AllSupported()) {
        viewVideoLocal = document.getElementById("divVideoLocal");
        viewVideoRemote = document.getElementById("divVideoRemote");
        viewLocalScreencast = document.getElementById("divScreencastLocal");
        WebRtc4all_SetDisplays(viewVideoLocal, viewVideoRemote, viewLocalScreencast); // FIXME: move to SIPml.* API
    } else {
        viewVideoLocal = videoLocal;
        viewVideoRemote = videoRemote;
    }

    if (!SIPml.isWebRtc4AllSupported() && !SIPml.isWebRtcSupported()) {
        if (confirm('Your browser don\'t support WebRTC.\naudio/video calls will be disabled.\nDo you want to download a WebRTC-capable browser?')) {
            window.location = 'https://www.google.com/intl/en/chrome/browser/';
        }
    }

    btnRegister.disabled = false;
    document.body.style.cursor = 'default';
    oConfigCall = {
        audio_remote: audioRemote,
        video_local: viewVideoLocal,
        video_remote: viewVideoRemote,
        screencast_window_id: 0x00000000, // entire desktop
        bandwidth: {audio: undefined, video: undefined},
        video_size: {minWidth: undefined, minHeight: undefined, maxWidth: undefined, maxHeight: undefined},
        events_listener: {events: '*', listener: onSipEventSession},
        sip_caps: [
            {name: '+g.oma.sip-im'},
            {name: 'language', value: '\"en,fr\"'}
        ]
    };
}

// TODO: load from vtiger
function loadCredentials() {    // TODO: org.doubango.identity.... replace with vtiger
    if (window.localStorage) {
        // IE retuns 'null' if not defined
        var s_value;
        if ((s_value = window.localStorage.getItem('org.doubango.identity.display_name')))
            //txtDisplayName.value = s_value;
            txtDisplayName = "";
            window.console.log(s_value);
        if ((s_value = window.localStorage.getItem('org.doubango.identity.impi')))
            //txtPrivateIdentity.value = s_value;
            txtPrivateIdentity = "";
        if ((s_value = window.localStorage.getItem('org.doubango.identity.impu')))
            //txtPublicIdentity.value = s_value;
            txtPublicIdentity = "";
        if ((s_value = window.localStorage.getItem('org.doubango.identity.password')))
            //txtPassword.value = s_value;
            txtPassword = "";
        if ((s_value = window.localStorage.getItem('org.doubango.identity.realm')))
            //txtRealm.value = s_value;
            txtRealm = "";
    } else {
        // FIXME
//        txtDisplayName.value = "005";
//        txtPrivateIdentity.value = "005";
//        txtPublicIdentity.value = "sip:005@sip2sip.info";
//        txtPassword.value = "005";
//        txtRealm.value = "sip2sip.info";
//        txtPhoneNumber.value = "701020";
    }
};

function loadCallOptions() {    // TODO: org.doubango..... replace with vtiger
    if (window.localStorage) {
        var s_value;
        if ((s_value = window.localStorage.getItem('org.doubango.call.phone_number')))
            //txtPhoneNumber.value = s_value;
            txtPhoneNumber = "";
        bDisableVideo = (window.localStorage.getItem('org.doubango.expert.disable_video') == "true");

        txtCallStatus.innerHTML = '<i>Video ' + (bDisableVideo ? 'disabled' : 'enabled') + '</i>';
    }
}

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

