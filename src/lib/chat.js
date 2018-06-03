'use strict';
const net = require('net');
const EventEmitter = require('events');
const uuid = require('uuid/v4');
const PORT = process.env.PORT || 5000;
const server = net.createServer();
const eventEmitter = new EventEmitter;
const clientPool = {};

let User = function(socket){
  let id = uuid();
  this.id = id;
  this.nickName = `user-${id}`;
  this.socket = socket;
};
server.on('connection',(socket)=>{
  let user = new User(socket);
  for(let connection in clientPool){
    var users = clientPool[connection];
    users.socket.write(`${user.nickName} joined and now available on this chat server\n`);
  }
  clientPool[user.id] = user;
  socket.on('data',(buffer)=>{
    dispatchAction(user.id, buffer);
  });
  
});
let parse = (buffer) => {
  let text = buffer.toString().trim();
  if ( !text.startsWith('@') ) { return null; }
  let [command,payload] = text.split(/\s+(.*)/);
  let [target,message] = payload ? payload.split(/\s+(.*)/) : [];
  return {command,payload,target,message};
};
let dispatchAction = (userId,buffer)=>{
  let entry = parse(buffer);
  console.log(entry);
  entry && eventEmitter.emit(entry.command, entry, userId);
};

eventEmitter.on('@all', (data, userId) => {
  for( let connection in clientPool ) {
    let user = clientPool[connection];
    user.socket.write(`<${clientPool[userId].nickName}>: ${data.payload}\n`);
  }
});

eventEmitter.on('@nickname', (data, userId) => {
  let user = clientPool[userId];
  clientPool[userId].nickName = data.target;
  user.socket.write(`your nick name is now ${clientPool[userId].nickName}\n`);
});

eventEmitter.on('@dm', (data, userId) => {
  for(let connection in clientPool){
    if(clientPool[connection].nickName === data.target){
      var sendTouser = clientPool[connection];
    }
  }
  let currentUser = clientPool[userId];
  currentUser.socket.write(`<${clientPool[userId].nickName}>: ${data.message}\n`);
  sendTouser.socket.write(`<${clientPool[userId].nickName}>: ${data.message}\n`);
});
eventEmitter.on('@list', (data,userId) => {
  for( let connection in clientPool ) {
    let user = clientPool[userId];
    user.socket.write(`User ID: ${connection} Nick-Name: ${clientPool[connection].nickName}\n`);
  }
});
eventEmitter.on('@quit', (data,userId) => {
  let user = clientPool[userId];
  user.socket.write('closing connection..');
  user.socket.end();
  delete clientPool[userId];
});

server.listen(PORT, ()=>{
  console.log(`listening on ${PORT}`);
});