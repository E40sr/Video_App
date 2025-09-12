let socket, peer;
let localStream;
let currentCall;
let peerIdToCall = null;
let peerOpen = false;
let streamReady = false;

let myVideo, remoteVideo, nextBtn, statusMsg;

window.addEventListener('DOMContentLoaded', () => {
  statusMsg = document.getElementById('statusMsg');
  myVideo = document.getElementById('myVideo');
  remoteVideo = document.getElementById('remoteVideo');
  nextBtn = document.getElementById('nextBtn');

  main();
});

function setStatus(msg) {
  if (statusMsg) statusMsg.innerText = msg;
  console.log('[Status]', msg);
}

function main() {
  console.log('Client script loaded');
  socket = io();

  peer = new Peer(undefined, {
    path: '/peerjs',
    host: '/',
    port: location.port || (location.protocol === 'https:' ? 443 : 80),
  });

  // Get media
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
      console.log('Got local media stream');
      localStream = stream;
      myVideo.srcObject = stream;
      streamReady = true;
      tryToCallPartner();
    })
    .catch(err => {
      setStatus('Could not access camera/microphone.');
      console.error('getUserMedia error:', err);
    });

  peer.on('open', id => {
    console.log('PeerJS open, id:', id);
    socket.emit('register', id);
    peerOpen = true;
    setStatus('Waiting for partner...');
    tryToCallPartner();
  });

  peer.on('call', call => {
    console.log('Received call from:', call.peer, 'streamReady:', streamReady);
    if (streamReady) {
      call.answer(localStream);
      setupCall(call);
    } else {
      call.close();
    }
  });

  socket.on('partner', partnerId => {
    console.log('Received partner event, partnerId:', partnerId);
    setStatus('Partner found! Connecting...');
    peerIdToCall = partnerId;
    tryToCallPartner();
  });

  socket.on('partner-disconnected', () => {
    setStatus('Partner disconnected. Waiting for new partner...');
    if (currentCall) currentCall.close();
    remoteVideo.srcObject = null;
  });

  socket.on('waiting', () => {
    setStatus('Waiting for partner...');
    if (currentCall) currentCall.close();
    remoteVideo.srcObject = null;
  });

  nextBtn.onclick = () => {
    setStatus('Waiting for partner...');
    socket.emit('next');
    if (currentCall) currentCall.close();
    remoteVideo.srcObject = null;
  };

  peer.on('error', err => {
    console.error('PeerJS error:', err);
  });

  socket.on('connect_error', err => {
    console.error('Socket.IO error:', err);
  });
}

function tryToCallPartner() {
  console.log('tryToCallPartner called. peerOpen:', peerOpen, 'streamReady:', streamReady, 'peerIdToCall:', peerIdToCall);
  if (peerOpen && streamReady && peerIdToCall) {
    const call = peer.call(peerIdToCall, localStream);
    setupCall(call);
    peerIdToCall = null;
  }
}

function setupCall(call) {
  if (currentCall) currentCall.close();
  currentCall = call;
  setStatus('Connected!');
  console.log('Setting up call with:', call.peer);

  call.on('stream', stream => {
    console.log('Received remote stream from:', call.peer);
    remoteVideo.srcObject = stream;
  });

  call.on('close', () => {
    setStatus('Partner disconnected. Waiting for new partner...');
    remoteVideo.srcObject = null;
    console.log('Call closed with:', call.peer);
  });

  call.on('error', err => {
    setStatus('Connection error. Waiting for new partner...');
    console.error('PeerJS call error:', err);
    remoteVideo.srcObject = null;
  });
}
