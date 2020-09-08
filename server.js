const http = require('http')
const express = require('express')
const app = express()
app.use(express.static('public'))
app.set('port', '3000')

const server = http.createServer(app)
server.on('listening', () => {
 console.log('Listening on port 3000')
})

const fs = require('fs');
const io = require('socket.io')(server);

// get names of exercsices from json 
function getNames() {
    let names = [];
    let rawdata= fs.readFileSync('./assets/test.json');
    let name = JSON.parse(rawdata);
    name['name'].forEach(element => { 
        names.push(element)
      }); 
      return names
}
io.sockets.on('connection', (socket) => {
    // log info about new client
    console.log('Client connected: ' + socket.id)
    // send every connection updated list of names
    let names = [];
    names = getNames()
    // emit to every client live list of names
    socket.emit('nameslist', names)
    // if user disconnected log it
	socket.on('disconnect', () => console.log('Client has disconnected'))
})

server.listen('3000')