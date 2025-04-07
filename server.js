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

let waitingUsers = [];

io.on('connection', socket => {
  console.log('User connected:', socket.id);

  socket.on('register', (peerId) => {
    socket.peerId = peerId;

    // Try to pair with someone
    if (waitingUsers.length > 0) {
      const partner = waitingUsers.shift();
      if (partner.connected) {
        socket.partner = partner;
        partner.partner = socket;

        socket.emit('partner', partner.peerId);
        partner.emit('partner', peerId);
      }
    } else {
      waitingUsers.push(socket);
    }
  });

  socket.on('next', () => {
    disconnectPartner(socket);
    socket.emit('waiting');
    waitingUsers.push(socket);
  });

  socket.on('disconnect', () => {
    disconnectPartner(socket);
    waitingUsers = waitingUsers.filter(u => u !== socket);
  });

  function disconnectPartner(sock) {
    if (sock.partner) {
      sock.partner.emit('partner-disconnected');
      sock.partner.partner = null;
      sock.partner = null;
    }
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
