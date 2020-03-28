(function() {
  /** @type {SocketIOClient.Socket} */
  const socket = io.connect(window.location.origin);
  const localVideo = document.querySelector('.localVideo');
  let localStream;
  const remoteVideos = document.querySelector('.remoteVideos');
  const peerConnections = {};
  
  let room = !location.pathname.substring(1) ? 'home' : location.pathname.substring(1);
  let getUserMediaAttempts = 5;
  let gettingUserMedia = false;

  /** @type {RTCConfiguration} */
  const config = {
    'iceServers': [{
      'urls': ['stun:stun.l.google.com:19302']
    }]
  };

  /** @type {MediaStreamConstraints} */
  const constraints = {
    audio: true,
    video: { facingMode: "user" }
  };

  socket.on('full', function(room) {
    alert('Room ' + room + ' is full');
  });

  socket.on('bye', function(id) {
    handleRemoteHangup(id);
  });

  if (room && !!room) {
    socket.emit('join', room);
  }

  window.onunload = window.onbeforeunload = function() {
    socket.close();
  };

  socket.on('ready', function (id) {
    if (!(localVideo instanceof HTMLVideoElement) || !localVideo.srcObject) {
      return;
    }
    const peerConnection = new RTCPeerConnection(config);
    peerConnections[id] = peerConnection;
    if (localVideo instanceof HTMLVideoElement) {
      peerConnection.addStream(localVideo.srcObject);
    }
    peerConnection.createOffer()
    .then(sdp => peerConnection.setLocalDescription(sdp))
    .then(function () {
      socket.emit('offer', id, peerConnection.localDescription);
    });
    peerConnection.onaddstream = event => handleRemoteStreamAdded(event.stream, id);
    peerConnection.onicecandidate = function(event) {
      if (event.candidate) {
        socket.emit('candidate', id, event.candidate);
      }
    };
  });

  socket.on('offer', function(id, description) {
    const peerConnection = new RTCPeerConnection(config);
    peerConnections[id] = peerConnection;
    if (localVideo instanceof HTMLVideoElement) {
      peerConnection.addStream(localVideo.srcObject);
    }
    peerConnection.setRemoteDescription(description)
    .then(() => peerConnection.createAnswer())
    .then(sdp => peerConnection.setLocalDescription(sdp))
    .then(function () {
      socket.emit('answer', id, peerConnection.localDescription);
    });
    peerConnection.onaddstream = event => handleRemoteStreamAdded(event.stream, id);
    peerConnection.onicecandidate = function(event) {
      if (event.candidate) {
        socket.emit('candidate', id, event.candidate);
      }
    };
  });

  socket.on('candidate', function(id, candidate) {
    peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate))
    .catch(e => console.error(e));
  });

  socket.on('answer', function(id, description) {
    peerConnections[id].setRemoteDescription(description);
  });

  function getUserMediaSuccess(stream) {
    gettingUserMedia = false;
    localStream = stream;

    localStream.getAudioTracks()[0].onmute = function (e) {
      console.log('Muted', e);
    }
    if (localVideo instanceof HTMLVideoElement) {
      !localVideo.srcObject && (localVideo.srcObject = stream);
    }
    socket.emit('ready');
  }

  localVideo.addEventListener('click', function (e) {
    console.log(localStream.getAudioTracks());
    localStream.getAudioTracks()[0].enabled = !(localStream.getAudioTracks()[0].enabled) ;

  });

  function handleRemoteStreamAdded(stream, id) {
    const remoteVideo = document.createElement('video');
    remoteVideo.srcObject = stream;
    remoteVideo.setAttribute("id", id.replace(/[^a-zA-Z]+/g, "").toLowerCase());
    remoteVideo.setAttribute("playsinline", "true");
    remoteVideo.setAttribute("autoplay", "true");
    remoteVideo.setAttribute('controls', "true");

    remoteVideos.appendChild(remoteVideo);
    if (remoteVideos.querySelectorAll("video").length === 1) {
      remoteVideos.setAttribute("class", "one remoteVideos");
    } else {
      remoteVideos.setAttribute("class", "remoteVideos");
    }
    remoteVideo.addEventListener('click', function() {
        stream.getAudioTracks()[0].enabled = !(localStream.getAudioTracks()[0].enabled)
    });
  }

  function getUserMediaError(error) {
    console.error(error);
    gettingUserMedia = false;
    (--getUserMediaAttempts > 0) && setTimeout(getUserMediaDevices, 1000);
  }

  function getUserMediaDevices() {
    if (localVideo instanceof HTMLVideoElement) {
      if (localVideo.srcObject) {
        getUserMediaSuccess(localVideo.srcObject);
      } else if (!gettingUserMedia && !localVideo.srcObject) {
        gettingUserMedia = true;
        navigator.mediaDevices.getUserMedia(constraints)
        .then(getUserMediaSuccess)
        .catch(getUserMediaError);
      }
    }
  }

  function handleRemoteHangup(id) {
    peerConnections[id] && peerConnections[id].close();
    delete peerConnections[id];
    document.querySelector("#" + id.replace(/[^a-zA-Z]+/g, "").toLowerCase()).remove();
    if (remoteVideos.querySelectorAll("video").length === 1) {
      remoteVideos.setAttribute("class", "one remoteVideos");
    } else {
      remoteVideos.setAttribute("class", "remoteVideos");
    }
  }

  getUserMediaDevices();
})();

class component{

  getMuteState(obj) {
    return obj.stream.getAudioTracks()[0].enabled;
  }
  mute(obj) {
    obj.stream.getAudioTracks()[0].enabled = !(obj.stream.getAudioTracks()[0].enabled)
  }

  disableRemoteVideo() {
    
  }
}