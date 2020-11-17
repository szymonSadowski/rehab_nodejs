/* eslint-disable valid-jsdoc */
/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
let socket;
let video;
let poseNet;
let pose;
let skeleton;
let brain;
// const state = 'waiting';
let stateOfTraining = 'stop';
// let targetLabel;
let poseLabel = '';
// const collectLabel ='';
let numberOfOutputsList = [];
let descriptionsList = [];
// const nameOfSave = '';
const namesList = [];
let nameSelected;
let pathToModel = '';
let pathToMetaData = '';
let pathToWeights = '';
let numberOfOutputs;
// let partOfExercise;
// let tempInput = [];
// let poseCheck = [];
// let check = false;
let receivePartsGlobal = [];
// let numberOfPartsLoaded;
let indexImg = 1;
/**
 * * Utilities
 */
function delay(time) {
  return new Promise((resolve, reject) => {
    if (isNaN(time)) {
      reject(new Error('delay requires a valid number.'));
    } else {
      setTimeout(resolve, time);
    }
  });
}
/**
 * * Server Connection
 * TODO CHANGE TO REST API ?
 */

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

/**
 * * SetUp Functions
 */
if (socket) {
  // eslint-disable-next-line no-unused-vars
  function setup() {
    setImage();
    const canvasExercsie = createCanvas(640, 480);
    video = createCapture(VIDEO);
    video.hide();
    poseNet = ml5.poseNet(video, modelLoaded);
    poseNet.on('pose', gotPoses);
    canvasExercsie.parent('canvasexercise');
    // get buttons
    const trainModel = select('#trainModel');
    const stopTraining = select('#stopTrainModel');
    const nextImg = select('#nextImg');
    const previousImg = select('#previousImg');
    const playImg = select('#playImg');

    trainModel.mousePressed(() => {
      /**
    * ! trainModel.mousePressed(()) 
    */
      socket.emit('sendparts', nameSelected);
      socket.on('receiveparts', (receiveparts) => {
        console.log(receiveparts);
        receivePartsGlobal = receiveparts;
      });
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
      showImage();
      const options = {
        inputs: 34,
        outputs: numberOfOutputs,
        task: 'classification',
        debug: true,
      };
      console.log(numberOfOutputs, 'tutaj drukujemy numberOfOutputs przed loadingiem ćwiczenia');
      brain = ml5.neuralNetwork(options);
    };
    nextImg.mousePressed(() => {
      nextImage();
    });

    previousImg.mousePressed(() => {
      previousImage();
    });

    playImg.mousePressed(() => {
      playImage();
    });
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

function setImage() {
  let path;
  path = './images/rehabilitation.png';
  document.getElementById('exercsiepreview').style.display='block';
  document.getElementById('exercsiepreview').src = path;
}

function showImage() {
  let path;
  path = './data/' + 'images/' + nameSelected + '/' + indexImg + '.png';
  console.log(path, 'nextImage');
  document.getElementById('exercsiepreview').src = path;
}

function nextImage() {
  if (indexImg <= numberOfOutputs - 1) {
    let path;
    indexImg++;
    path = './data/' + 'images/' + nameSelected + '/' + indexImg + '.png';
    console.log(path, 'nextImage');
    document.getElementById('exercsiepreview').src = path;
  }
}

function previousImage() {
  if (indexImg > 1) {
    let path;
    indexImg--;
    path = './data/' + 'images/' + nameSelected + '/' + indexImg + '.png';
    console.log(path, 'previous');
    document.getElementById('exercsiepreview').src = path;
  }
}
async function playImage() {
  indexImg = 1;
  /**
  * TODO DELAY DODAĆ PRZY TWORZENIU ĆWICZENIA !
  */
  while (indexImg <= numberOfOutputs - 1) {
    await delay(2000);
    let path;
    indexImg++;
    path = './data/' + 'images/' + nameSelected + '/' + indexImg + '.png';
    console.log(path, 'nextImage');
    document.getElementById('exercsiepreview').src = path;
  }
}
/**
 * * PoseEstimation part
 */
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
      poseLabel = results[0].label.toUpperCase();
    } else {
      poseLabel = 'Zle ulozenie';
    }
    classifyPose();
  }
}

function brainLoaded() {
  console.log('pose classification ready!');
  classifyPose();
}

function gotPoses(poses) {
  if (poses.length > 0) {
    pose = poses[0].pose;
    skeleton = poses[0].skeleton;
  }
}

function modelLoaded() {
  console.log('poseNet ready');
}

function objectManagment(keyPoint, x, y) {
  let xLoaded;
  let yLoaded;
  let xMin;
  let xMax;
  let yMin;
  let yMax;
  range = false;
  xMin = x*0.7;
  xMax = x + x * 0.3;
  yMin = y*0.7;
  yMax = y + y *0.3;

  if (poseLabel == '1') {
    xLoaded = receivePartsGlobal[keyPoint*2];
    yLoaded = receivePartsGlobal[keyPoint*2+1];
    console.log(xLoaded, yLoaded, 'xLoaded', xLoaded/2, yLoaded/2, 'xLoaded/2');
  }
  if (poseLabel == '2') {
    xLoaded = receivePartsGlobal[keyPoint*2+32];
    yLoaded = receivePartsGlobal[keyPoint*2+33];
  }
  if (poseLabel == 'Zle ulozenie') {
    return;
  }
  // checkig if posX and posY are in range
  // && xLoaded >= xMin && yLoaded <= yMin && yLoaded >= yMax)
  if (xLoaded <= xMax && xLoaded >= xMin && yLoaded <= yMax && yLoaded >= yMin) {
    range = true;
    // console.log(range, 'x jest w zasięgu');
  }
  // console.log(x, 'x', y, 'y', keyPoint, 'keyPoint', poseLabel, 'poseLabel', range, 'range',
  //     xLoaded, xMin, xMax, 'xLoaded', yLoaded, yMin, yMax, 'yLoaded');
  return range;
  // console.log(numberOfPartsLoaded, 'numberOfPartsLoaded,');
}
/**
 * * Drawing
 */

function draw() {
  push();
  // MAKING CAMERA "MIRROR" VIEW FOR BETTER INTERACTION
  translate(video.width, 0);
  scale(-1, 1);
  image(video, 0, 0, video.width, video.height);

  if (pose) {
    if (stateOfTraining == 'training') {
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
        // must skip 2 i
        if (objectManagment(i, x, y) == true) {
          fill(0, 255, 0);
          ellipse(x, y, 16, 16);
          stroke(255);
        } else {
          fill(255, 0, 0);
          ellipse(x, y, 16, 16);
          stroke(255);
        }
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
  if (poseLabel == 'Zle ulozenie') {
    text(poseLabel, width -0.25 * width, height - 0.9*height);
  } else {
    text(poseLabel, width -0.1 * width, height - 0.9*height);
  }
}
