/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
let socket;
let video;
let poseNet;
let pose;
let skeleton;
let brain;
const state = 'waiting';
let stateOfTraining = 'training';
let targetLabel;
let poseLabel = '';
const collectLabel ='';
let numberOfOutputsList = [];
let descriptionsList = [];
const nameOfSave = '';
const namesList = [];
let nameSelected;
let pathToModel = '';
let pathToMetaData = '';
let pathToWeights = '';
let numberOfOutputs;

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
    const trainModel = select('#trainModel');
    const stopTraining = select('#stopTrainModel');


    trainModel.mousePressed(() => {
      stateOfTraining = 'training';
      trainModelFromFile();
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

    const options = {
      inputs: 34,
      outputs: numberOfOutputs,
      task: 'classification',
      debug: true,
    };
    brain = ml5.neuralNetwork(options);
  }
}

function trainModelFromFile() {
  console.log(pathToModel, ' pathToModel', pathToMetaData, ' pathToMetaData', pathToWeights, ' pathToWeights');
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
    console.log(inputs, 'CO TO TE INPUTY');
  } else {
    setTimeout(classifyPose, 100);
  }
}

function gotResult(error, results) {
  if (stateOfTraining == 'training') {
    if (results[0].confidence > 0.70) {
      console.log(results, 'drukujemy resulta');
      console.log(results[0], 'drukujemy  PIERWSZEGO resulta');
      poseLabel = results[0].label.toUpperCase();
    } else {
      poseLabel = 'Zle ulozenie';
    }
    console.log(results[0].confidence);
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
  // brain.loadData('data/modelTestowy.json', dataReady);
}

// function dataReady(){
//   console.log("dataReady")
//   brain.normalizeData()
//   brain.train({epochs: 100}, finished);
// }

function finished() {
  console.log('model trained');
  brain.save();
}

function stopTraining() {

}

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
      }
      const target = [targetLabel];
      brain.addData(inputs, target);
    }
  }
}

function modelLoaded() {
  console.log('poseNet ready');
}

function draw() {
  push();
  // MAKING CAMERA "MIRROR" VIEW FOR BETTER INTERACTION
  translate(video.width, 0);
  scale(-1, 1);
  image(video, 0, 0, video.width, video.height);

  if (pose) {
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
  pop();
  fill(255, 0, 255);
  noStroke();
  textSize(50);
  textAlign(CENTER, CENTER);
  text(poseLabel, width / 2, height / 2);
  text(collectLabel, width / 2, height / 2);
}
