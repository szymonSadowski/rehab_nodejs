/* eslint-disable require-jsdoc */
const http = require('http');
const express = require('express');
const app = express();
app.use(express.static('public'));
app.set('port', '3000');

const server = http.createServer(app);
server.on('listening', () => {
  console.log('Listening on port 3000');
});

const fs = require('fs');
const io = require('socket.io')(server);

let nameOfFileToSave = '';
let pathToFile = '';
let sendParts = false;
let nameOfExercise = '';
// get names of exercsices from json

function resetVars() {
  nameOfFileToSave = '';
  pathToFile = '';
  sendParts = false;
  nameOfExercise = '';
}


function getNames() {
  const names = [];
  const rawdata = fs.readFileSync('./assets/test.json');
  const name = JSON.parse(rawdata);
  name['name'].forEach((element) => {
    names.push(element);
  });
  return names;
}
// get descriptions
function getDescriptions() {
  const descriptions = [];
  const rawdata = fs.readFileSync('./assets/test.json');
  const description = JSON.parse(rawdata);
  description['description'].forEach((element) => {
    descriptions.push(element);
  });
  return descriptions;
}
// get number Of outputs (to load model)
function getOutputs() {
  const outputs = [];
  const rawdata = fs.readFileSync('./assets/test.json');
  const output = JSON.parse(rawdata);
  output['output'].forEach((element) => {
    outputs.push(element);
  });
  return outputs;
}
// get positions
function getPositions(name) {
  const positions = [];
  pathToFile = pathToFile.concat('./assets/', name, '.json');
  const rawdata = fs.readFileSync(pathToFile);
  const position = JSON.parse(rawdata);
  position.forEach((element) => {
    // console.log(element)
    positions.push(element);
  });
  return positions;
}
io.sockets.on('connection', (socket) => {
  // log info about new client
  console.log('Client connected: ' + socket.id);
  // send every connection updated list of names
  let names = [];
  let descriptions = [];
  let outputs = [];
  names = getNames();
  descriptions = getDescriptions();
  outputs = getOutputs();
  // emit to every client live list of names
  socket.emit('nameslist', names);
  // emit to every client live list of descriptions
  socket.emit('descriptionlist', descriptions);
  // emit to every client number of outputs needed to load.brain()
  socket.emit('numberofoutputs', outputs);
  socket.on('savedata', (nameOfFile) => {
    try {
      nameOfFileToSave = nameOfFile;
      const rawdata = fs.readFileSync('./assets/test.json');
      const obj = JSON.parse(rawdata);
      obj.name.push(nameOfFile);
      console.log(obj);
      fs.writeFileSync('./assets/test.json', JSON.stringify(obj));
    } catch (err) {
      resetVars();
      console.error(err);
    }
  });
  socket.on('descriptiondata', (descriptionOfFile) => {
    try {
      const rawdata = fs.readFileSync('./assets/test.json');
      const obj = JSON.parse(rawdata);
      obj.description.push(descriptionOfFile);
      fs.writeFileSync('./assets/test.json', JSON.stringify(obj));
    } catch (err) {
      resetVars();
      console.error(err);
    }
  });
  socket.on('numberofoutputs', (numberOfOutputs) => {
    try {
      const rawdata = fs.readFileSync('./assets/test.json');
      const obj = JSON.parse(rawdata);
      obj.output.push(numberOfOutputs);
      fs.writeFileSync('./assets/test.json', JSON.stringify(obj));
    } catch (err) {
      console.error(err);
    }
  });
  socket.on('tempinput', (tempInput) => {
    try {
      console.log(nameOfFileToSave);
      pathToFile = pathToFile.concat('./assets/', nameOfFileToSave, '.json');
      const fileStream = fs.createWriteStream(pathToFile);
      // let rawdata= fs.readFileSync(pathToFile);
      // let obj = JSON.parse(rawdata);
      // obj.output.push(tempInput);
      // fs.writeFileSync(pathToFile, JSON.stringify(obj))
      tempInput = JSON.stringify(tempInput);
      fileStream.write(tempInput);
      fileStream.end();
    } catch (err) {
      console.error(err);
    }
  });
  // get the name of exercise that user what to perform
  socket.on('sendparts', (name) => {
    try {
      nameOfExercise = name;
      console.log(nameOfExercise, 'Name of exercise that we fetch data');
      sendParts = true;
    } catch (err) {
      resetVars();
      console.error(err);
    }
    // get the positions of the exercise
    // and send them from json file to client side
    if (sendParts = true) {
      // console.log("SEND PARTS ARE TURE !!!");
      // positions = getPositions(name);
      // console.log(positions)
      try {
        positions = [];
        positions = getPositions(name);
        console.log(positions);
        socket.emit('receiveparts', positions);
        // reset  variables not to stack names
        resetVars();
      } catch (err) {
        resetVars();
        console.error(err);
      }
    }
  });
  // if user disconnected log it
  socket.on('disconnect', () => console.log('Client has disconnected'));
});

server.listen('3000');
