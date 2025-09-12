const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { ExpressPeerServer } = require('peer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const peerServer = ExpressPeerServer(server, { debug: true });
app.use('/peerjs', peerServer);

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.render('index');
});


const allUsers = new Set(); // Set of all connected sockets

function getRandomPartner(excludeSocket) {
  const candidates = Array.from(allUsers).filter(sock => sock !== excludeSocket && sock.connected && !sock.partner);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

io.on('connection', socket => {
  console.log('User connected:', socket.id);


  allUsers.add(socket);

  socket.on('register', (peerId) => {
    socket.peerId = peerId;
    // Try to pair with a random available partner
    const partner = getRandomPartner(socket);
    if (partner) {
      disconnectPartner(socket);
      disconnectPartner(partner);
      socket.partner = partner;
      partner.partner = socket;
      socket.emit('partner', partner.peerId);
      partner.emit('partner', peerId);
    }
    // If no partner, just wait (do nothing)
  });


  socket.on('next', () => {
    disconnectPartner(socket);
    socket.emit('waiting');
    // Try to pair with a random available partner
    const partner = getRandomPartner(socket);
    if (partner) {
      disconnectPartner(socket);
      disconnectPartner(partner);
      socket.partner = partner;
      partner.partner = socket;
      socket.emit('partner', partner.peerId);
      partner.emit('partner', socket.peerId);
    }
    // If no partner, just wait
  });


  socket.on('disconnect', () => {
    disconnectPartner(socket);
    allUsers.delete(socket);
  });

  function disconnectPartner(sock) {
    if (sock.partner) {
      // Notify partner and fully reset both sides
      if (sock.partner.partner === sock) {
        sock.partner.partner = null;
      }
      sock.partner.emit('partner-disconnected');
      sock.partner = null;
    }
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
