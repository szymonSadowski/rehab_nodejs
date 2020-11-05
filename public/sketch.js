/* eslint-disable max-len */
/* eslint-disable prefer-const */
/* eslint-disable require-jsdoc */
let socket;
let video;
let poseNet;
let pose;
let skeleton;
let brain;
let state = 'waiting';
let stateOfTraining = 'stop';
let stateOfExercise = '';
let targetLabel;
let poseLabel = '';
let collectLabel ='';
let numberOfOutputsList = [];
let descriptionsList = [];
let nameOfSave = '';
const namesList = [];
let nameSelected;
let pathToModel = '';
let pathToMetaData = '';
let pathToWeights = '';
let numberOfOutputs;
let partOfExercise;
let tempInput = [];
const poseCheck = [];
let check = false;
let receivePartsGlobal = [];
let numberOfPartsLoaded;
function delay(time) {
  return new Promise((resolve, reject) => {
    if (isNaN(time)) {
      reject(new Error('delay requires a valid number.'));
    } else {
      setTimeout(resolve, time);
    }
  });
}

// Start the socket connection
socket = io.connect('http://localhost:3000');

socket.on('nameslist', (names) => {
  console.log(names);
  // adding options (from json loaded on serverside) to select on client side
  names.forEach((element, idx) => {
    const sel = document.getElementById('exerciseSelect');
    const opt = document.createElement('option');
    opt.appendChild( document.createTextNode(element));
    // set value of the select option as it's index in array
    opt.value = [idx];
    sel.appendChild(opt);
    namesList.push(element);
  });
});
socket.on('descriptionlist', (descriptions) => {
  console.log(descriptions);
  descriptionsList = descriptions;
  // after selected name show description of exercise
});
socket.on('numberofoutputs', (numberOfOutputs) => {
  console.log(numberOfOutputs);
  numberOfOutputsList = numberOfOutputs;
  // after selected name get numberOfOutputs
});

if (socket) {
  function setup() {
    createCanvas(640, 480);
    video = createCapture(VIDEO);
    video.hide();
    poseNet = ml5.poseNet(video, modelLoaded);
    poseNet.on('pose', gotPoses);

    // get buttons
    const collectData = select('#collectData');
    const trainModel = select('#trainModel');
    const createModel = select('#createModel');
    const saveClick = select('#saveClick');
    const stopTraining = select('#stopTrainModel');
    // other elements
    const nameBox = select('#nameBox');
    const descriptionBox = select('#descriptionBox');

    collectData.mousePressed(() => {
      collectClick();
    });

    trainModel.mousePressed(() => {
      // let tempParts = [];
      /**
      * ! trainModel.mousePressed(()) 
      */
      socket.emit('sendparts', nameSelected);
      socket.on('receiveparts', (receiveparts) => {
        console.log(receiveparts);
        receivePartsGlobal = receiveparts;
        numberOfPartsLoaded = receiveparts.length / 34;
      });
      stateOfTraining = 'training';
      trainModelFromFile();
    });

    createModel.mousePressed(() => {
      createModelFromFile();
    });

    stopTraining.mousePressed(() => {
      stateOfTraining = 'stop';
      poseLabel = '';
    });

    changeAction = function(select) {
      idx = document.getElementById('exerciseSelect').action = select.value;
      document.getElementById('exerciseDescription').value = descriptionsList[idx];
      nameSelected = namesList[idx];
      pathToModel = pathToModel.concat('models/', nameSelected, '/model.json');
      pathToMetaData = pathToMetaData.concat('models/', nameSelected, '/model_meta.json');
      pathToWeights = pathToWeights.concat('models/', nameSelected, '/model.weights.bin');
      numberOfOutputs = numberOfOutputsList[idx];
      console.log(numberOfOutputs, ' numberOfOutputs');
      const options = {
        inputs: 34,
        outputs: numberOfOutputs,
        task: 'classification',
        debug: true,
      };
      console.log(numberOfOutputs, 'tutaj drukujemy numberOfOutputs przed loadingiem ćwiczenia');
      brain = ml5.neuralNetwork(options);
    };

    saveClick.mousePressed(() => {
      console.log(nameBox.value());
      console.log(descriptionBox.value());
      nameOfFile = nameBox.value();
      descriptionOfFile = descriptionBox.value();
      nameOfSave = nameOfSave.concat('data/', nameOfFile, '.json');
      numberOfOutputs = document.getElementById('numberOfParts').value;
      console.log(numberOfOutputs, 'to emitujemy na socketa');
      console.log(numberOfOutputs, ' numberOfOutputs');
      if (nameOfFile.length && descriptionOfFile.length) {
        console.log(namesList, ' namesList');
        if (namesList.includes(nameOfFile)) {
          alert('Ta nazwa jest już zajęta');
        } else {
          brain.saveData(nameBox.value());
          socket.emit('savedata', nameOfFile);
          socket.emit('descriptiondata', descriptionOfFile);
          sendOutputs = numberOfOutputs.toString();
          socket.emit('numberofoutputs', sendOutputs);
          document.getElementById('nameBox').value = '';
          document.getElementById('descriptionBox').value = '';
          console.log(tempInput, 'tempInput');
          socket.emit('tempinput', tempInput, nameOfFile);
          tempInput = [];
        }
      } else {
        console.log('Name of file is needed');
      }
    });
    const options = {
      inputs: 34,
      outputs: numberOfOutputs,
      task: 'classification',
      debug: true,
    };
    brain = ml5.neuralNetwork(options);
  }
}

async function collectClick() {
  idx = document.getElementById('numberOfParts').value;
  partsOfExercise = idx;
  console.log('collecting', idx);
  collectLabel = 'prepere your postion';
  await delay(3000);

  for (i=1; i<=idx; i++) {
    // collectLabel = "press key";
    partOfExercise = i;
    print(partOfExercise, 'partOfExercise');
    iAsString = i.toString();
    targetLabel = iAsString;
    console.log(targetLabel, ' targetLabel');
    await delay(3000);
    collectLabel = i + '-part of exercise';
    await delay(3000);
    collectLabel = 'collecting';
    check = true;
    state = 'collecting';
    await delay(8000);
    console.log('not collecting');
    state = 'waiting';
    // avg(tempInput);
  }
  collectLabel = '';
  // avg(tempInput);
}

function trainModelFromFile() {
  console.log(pathToModel, ' pathToModel', pathToMetaData,
      ' pathToMetaData', pathToWeights, ' pathToWeights');
  const modelInfo = {
    model: pathToModel,
    metadata: pathToMetaData,
    weights: pathToWeights,
  };
  brain.load(modelInfo, brainLoaded);
}

function classifyPose() {
  if (pose) {
    const inputs = [];
    for (let i = 0; i < pose.keypoints.length; i++) {
      const x = pose.keypoints[i].position.x;
      const y = pose.keypoints[i].position.y;
      inputs.push(x);
      inputs.push(y);
    }
    brain.classify(inputs, gotResult);
  } else {
    setTimeout(classifyPose, 100);
  }
}

function gotResult(error, results) {
  if (stateOfTraining == 'training') {
    if (results[0].confidence > 0.70) {
      // stateOfExercise is part of the exercise
      // stateOfExercise == results[0].label;
      poseLabel = results[0].label.toUpperCase();
      // console.log(poseLabel, 'stateOfExercise');
    } else {
      poseLabel = 'Zle ulozenie';
    }
    // console.log(results[0].confidence);
    classifyPose();
  }
}

function brainLoaded() {
  console.log('pose classification ready!');
  classifyPose();
}
function createModelFromFile() {
  console.log(nameOfSave);
  brain.loadData(nameOfSave, dataReady);
  // brain.loadData('data/testModel1.json', dataReady);
}

function dataReady() {
  console.log('dataReady');
  brain.normalizeData();
  brain.train({epochs: 100}, finished);
}

function finished() {
  console.log('model trained');
  brain.save();
}

// function stopTraining() {

// }
// let part = 1;
// let counter = 0;
function gotPoses(poses) {
  if (poses.length > 0) {
    pose = poses[0].pose;
    skeleton = poses[0].skeleton;
    if (state == 'collecting') {
      // inputs = 17 x,y pairs
      const inputs = [];
      // this loop goes thorugh every keypoint and it's placing location into array
      for (let i = 0; i < pose.keypoints.length; i++) {
        const x = pose.keypoints[i].position.x;
        const y = pose.keypoints[i].position.y;
        inputs.push(x);
        inputs.push(y);
        if (check == true) {
          tempObj = [];
          // tempObj= [i, partOfExercise, x, y];
          // tempInput.push(tempObj);
          tempInput.push(x);
          tempInput.push(y);
          // tempInput.push(tempObj);
        }
      }
      check = false;
      const target = [targetLabel];
      brain.addData(inputs, target);
    }
  }
}

function modelLoaded() {
  console.log('poseNet ready');
}

/**
 * TODO: objectManagment bierze id, zwraca odpowiednie
 * TODO: punkty z pobranej tablicy do funkcji draw tam
 * TODO: rysowane sa na czerwono
*/

function objectManagment(keyPoint) {
  let x;
  let y;
  let start;
  let stop;
  // for (let i=1; i<=numberOfPartsLoaded; i++) {
  //   if (poseLabel == i.toString()) {
  //     start = 1 + 17 * (i-1);
  //     stop = 32*i;
  //   }
  if (poseLabel == '1') {
    x = receivePartsGlobal[keyPoint*2];
    y = receivePartsGlobal[keyPoint*2+1];
  }
  if (poseLabel == '2') {
    x = receivePartsGlobal[keyPoint*2+32];
    y = receivePartsGlobal[keyPoint*2+33];
  }
  console.log(x, 'x', y, 'y', keyPoint, 'keyPoint', poseLabel, 'poseLabel');
  // console.log(numberOfPartsLoaded, 'numberOfPartsLoaded,');
}

function draw() {
  push();
  // MAKING CAMERA "MIRROR" VIEW FOR BETTER INTERACTION
  translate(video.width, 0);
  scale(-1, 1);
  image(video, 0, 0, video.width, video.height);

  if (pose) {
    if (stateOfTraining == 'training') {
      // console.log(receivePartsGlobal[1][1], 'aaa');
      // console.log(receivePartsGlobal[1][3], 'receivePartsGlobal byczq333');
      // console.log(receivePartsGlobal[1][3]," wyjebie sei")
      for (let i = 0; i < skeleton.length; i++) {
        const a = skeleton[i][0];
        const b = skeleton[i][1];
        // const x = receivePartsGlobal[i][0];
        // const y = receivePartsGlobal[i][1];
        // console.log(x, y, 'aaaaaa');
        strokeWeight(2);
        stroke(0);
        line(a.position.x, a.position.y, b.position.x, b.position.y);
      }
      for (let i = 0; i < pose.keypoints.length; i++) {
        const x = pose.keypoints[i].position.x;
        const y = pose.keypoints[i].position.y;
        // must skip 2 i
        objectManagment(i);
        // console.log(poseLabel, 'poseLabel');
        // let x1 = receivePartsGlobal[i];
        // let y1 = receivePartsGlobal[i+1];
        // console.log(x1, y1, 'X1 i Y1');
        // if (x != x1) {
        //   // console.log('Złe położenie x');
        //   fill(255, 0, 0);
        //   stroke(255);
        //   ellipse(x, y, 16, 16);
        // } else {
        //   fill(0);
        //   stroke(255);
        //   ellipse(x, y, 16, 16);
        // }
        fill(0);
        stroke(255);
        ellipse(x, y, 16, 16);
      }
    } else {
      for (let i = 0; i < skeleton.length; i++) {
        const a = skeleton[i][0];
        const b = skeleton[i][1];
        strokeWeight(2);
        stroke(0);
        line(a.position.x, a.position.y, b.position.x, b.position.y);
      }
      for (let i = 0; i < pose.keypoints.length; i++) {
        const x = pose.keypoints[i].position.x;
        const y = pose.keypoints[i].position.y;
        fill(0);
        stroke(255);
        ellipse(x, y, 16, 16);
      }
    }
  }
  pop();
  fill(255, 0, 255);
  noStroke();
  textSize(50);
  textAlign(CENTER, CENTER);
  text(poseLabel, width / 2, height / 2);
  text(collectLabel, width / 2, height / 2);
}
