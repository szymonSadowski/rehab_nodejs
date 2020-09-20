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
// get descriptions 
function getDescriptions() {
    let descriptions = [];
    let rawdata= fs.readFileSync('./assets/test.json');
    let description = JSON.parse(rawdata);
    description['description'].forEach(element => { 
        descriptions.push(element)
      }); 
      return descriptions
}
// get number Of outputs (to load model)
function getOutputs() {
    let outputs = [];
    let rawdata= fs.readFileSync('./assets/test.json');
    let output = JSON.parse(rawdata);
    output['output'].forEach(element => { 
        outputs.push(element)
      }); 
      return outputs
}

io.sockets.on('connection', (socket) => {
    // log info about new client
    console.log('Client connected: ' + socket.id)
    // send every connection updated list of names
    let names = [];
    let descriptions = [];
    let outputs = [];
    names = getNames();
    descriptions = getDescriptions();
    outputs = getOutputs();
    // emit to every client live list of names
    socket.emit('nameslist', names)
    // emit to every client live list of descriptions
    socket.emit('descriptionlist', descriptions)
    // emit to every client number of outputs needed to load.brain()
    socket.emit('numberofoutputs', outputs)
    socket.on('savedata', nameOfFile => {      
        try {    
            let rawdata= fs.readFileSync('./assets/test.json');
            let obj = JSON.parse(rawdata);
            obj.name.push(nameOfFile);
            console.log(obj)
            fs.writeFileSync('./assets/test.json', JSON.stringify(obj))
        } 
        catch (err) {
            console.error(err)
        }
    })
    socket.on('descriptiondata', descriptionOfFile => {
        try {    
            let rawdata= fs.readFileSync('./assets/test.json');
            let obj = JSON.parse(rawdata);
            obj.description.push(descriptionOfFile);
            fs.writeFileSync('./assets/test.json', JSON.stringify(obj))
        } 
        catch (err) {
            console.error(err)
        }
    })
    socket.on('numberofoutputs', numberOfOutputs => {
        try {    
            let rawdata= fs.readFileSync('./assets/test.json');
            let obj = JSON.parse(rawdata);
            obj.output.push(numberOfOutputs);
            fs.writeFileSync('./assets/test.json', JSON.stringify(obj))
        } 
        catch (err) {
            console.error(err)
        }
    })
    // if user disconnected log it
	socket.on('disconnect', () => console.log('Client has disconnected'))
})

server.listen('3000')