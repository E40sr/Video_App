const socket = io();
const peer = new Peer();
let localStream;
let currentCall;
const myVideo = document.getElementById('myVideo');
const remoteVideo = document.getElementById('remoteVideo');
const nextBtn = document.getElementById('nextBtn');

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    myVideo.srcObject = stream;
  });

peer.on('open', id => {
  socket.emit('register', id);
});

socket.on('partner', partnerId => {
  const call = peer.call(partnerId, localStream);
  setupCall(call);
});

peer.on('call', call => {
  call.answer(localStream);
  setupCall(call);
});

socket.on('partner-disconnected', () => {
  if (currentCall) currentCall.close();
  remoteVideo.srcObject = null;
});

socket.on('waiting', () => {
  remoteVideo.srcObject = null;
  if (currentCall) currentCall.close();
});

nextBtn.onclick = () => {
  socket.emit('next');
};

function setupCall(call) {
  if (currentCall) currentCall.close();
  currentCall = call;
  call.on('stream', stream => {
    remoteVideo.srcObject = stream;
  });
  call.on('close', () => {
    remoteVideo.srcObject = null;
  });
        }
