let socket;
let video;
let poseNet;
let pose;
let skeleton;
let brain;
let state = 'waiting';
let stateOfTraining = 'training';
let targetLabel;
let poseLabel = "";
let collectLabel ="";
let numberOfOutputsList = [];
let descriptionsList = [];
let nameOfSave = "";
let namesList = [];
let nameSelected; 
let pathToModel = "";
let pathToMetaData = "";
let pathToWeights = "";
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
socket = io.connect('http://localhost:3000')
    
socket.on('nameslist', names => {
    console.log(names);
    // adding options (from json loaded on serverside) to select on client side
    names.forEach((element, idx) => {
        var sel = document.getElementById('exerciseSelect');
        var opt = document.createElement('option');
        opt.appendChild( document.createTextNode(element));
        // set value of the select option as it's index in array
        opt.value = [idx]; 
        sel.appendChild(opt); 
        namesList.push(element);
    });
})
socket.on('descriptionlist', descriptions => {
  console.log(descriptions);
  descriptionsList = descriptions;
  // after selected name show description of exercise
})
socket.on('numberofoutputs', numberOfOutputs => {
  console.log(numberOfOutputs);
  numberOfOutputsList = numberOfOutputs;
  // after selected name get numberOfOutputs
})
if(socket) {
function setup() {
    createCanvas(640, 480);
    video = createCapture(VIDEO);
    video.hide();
    poseNet = ml5.poseNet(video, modelLoaded);
    poseNet.on('pose', gotPoses);
  
    // get buttons 
    const collectData = select('#collectData')
    const trainModel = select('#trainModel')
    const createModel = select('#createModel')
    const saveClick = select('#saveClick')
    const stopTraining = select('#stopTrainModel')
    // other elements
    const nameBox = select('#nameBox')
    const descriptionBox = select('#descriptionBox')

    collectData.mousePressed(() => {
      collectClick();
    });
    
    trainModel.mousePressed(() => {
        stateOfTraining = "training"
        trainModelFromFile();
    });
  
    createModel.mousePressed(() => {
        createModelFromFile();
    });

    stopTraining.mousePressed(() => {
        stateOfTraining = "stop";
        poseLabel = "";
    });

    changeAction = function(select){
      idx = document.getElementById("exerciseSelect").action = select.value;
      document.getElementById('exerciseDescription').value = descriptionsList[idx];
      nameSelected = namesList[idx];
      pathToModel = pathToModel.concat('models/', nameSelected, '/model.json');
      pathToMetaData = pathToMetaData.concat('models/', nameSelected, '/model_meta.json');
      pathToWeights = pathToWeights.concat('models/', nameSelected, '/model.weights.bin');
      numberOfOutputs = numberOfOutputsList[idx];
      console.log(numberOfOutputs, " numberOfOutputs")
      let options = {
        inputs: 34,
        outputs: numberOfOutputs,
        task: 'classification',
        debug: true
      }
      console.log(numberOfOutputs, "tutaj drukujemy numberOfOutputs przed loadingiem ćwiczenia")
      brain = ml5.neuralNetwork(options);
      // pathToModel = ('./models/test/model.json');
      // pathToMetaData  = ('./models/test/model_meta.json');
      // pathToWeights = ('./models/test/model.weights.bin')
   }
    
    saveClick.mousePressed(() => {
      console.log(nameBox.value());
      console.log(descriptionBox.value());
      nameOfFile = nameBox.value();
      descriptionOfFile = descriptionBox.value();
      nameOfSave = nameOfSave.concat('data/', nameOfFile, '.json');
      numberOfOutputs = document.getElementById("numberOfParts").value
      console.log(numberOfOutputs, "to emitujemy na socketa")
      console.log(numberOfOutputs, " numberOfOutputs")
      if(nameOfFile.length && descriptionOfFile.length){
        console.log(namesList, " namesList")
        if(namesList.includes(nameOfFile)) {
          alert("Ta nazwa jest już zajęta")
        }
        else {
          brain.saveData(nameBox.value());
          socket.emit('savedata', nameOfFile);
          socket.emit('descriptiondata', descriptionOfFile);
          sendOutputs = numberOfOutputs.toString();
          socket.emit('numberofoutputs', sendOutputs);
          document.getElementById('nameBox').value = '';
          document.getElementById('descriptionBox').value = '';
        }
      }
      else {
        console.log("Name of file is needed")
      }
    })
    let options = {
      inputs: 34,
      outputs: numberOfOutputs,
      task: 'classification',
      debug: true
    }
    brain = ml5.neuralNetwork(options);
  }
}

async function collectClick(){
  idx = document.getElementById('numberOfParts').value;
  console.log("collecting", idx);
  collectLabel = "prepere your postion";
  await delay(3000);
  for(i=1; i<=idx; i++) {
    // collectLabel = "press key";
    iAsString =  i.toString()
    targetLabel = iAsString;
    console.log(targetLabel, " targetLabel");
    await delay(3000);
    collectLabel = i + "-part of exercise";
    await delay(3000);
    collectLabel = "collecting";
    state = 'collecting';
    await delay(8000);
    console.log('not collecting');
    state = 'waiting';
  }
  collectLabel = "";
}

function trainModelFromFile() {
  console.log(pathToModel, " pathToModel", pathToMetaData, " pathToMetaData", pathToWeights, " pathToWeights")
  const modelInfo = {
    model: pathToModel,
    metadata: pathToMetaData,
    weights: pathToWeights
  };
  brain.load(modelInfo, brainLoaded);
}

function classifyPose() {
  if (pose) {
    let inputs = [];
    for (let i = 0; i < pose.keypoints.length; i++) {
      let x = pose.keypoints[i].position.x;
      let y = pose.keypoints[i].position.y;
      inputs.push(x);
      inputs.push(y);
    }
    brain.classify(inputs, gotResult);
  } else {
    setTimeout(classifyPose, 100);
  }
}

function gotResult(error, results) {
  if(stateOfTraining == 'training') {
    if (results[0].confidence > 0.70) {
      poseLabel = results[0].label.toUpperCase();
    }
    else {
      poseLabel = "Zle ulozenie";
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
    console.log(nameOfSave)
    brain.loadData(nameOfSave, dataReady);
    // brain.loadData('data/modelTestowy.json', dataReady);
}

function dataReady(){
  console.log("dataReady")
  brain.normalizeData()
  brain.train({epochs: 100}, finished);
}

function finished(){
  console.log('model trained')
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
      let inputs = [];
      // this loop goes thorugh every keypoint and it's placing location into array 
      for (let i = 0; i < pose.keypoints.length; i++) {
        let x = pose.keypoints[i].position.x;
        let y = pose.keypoints[i].position.y;
        inputs.push(x);
        inputs.push(y);
      }
      let target = [targetLabel];
      brain.addData(inputs, target)
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
      let a = skeleton[i][0];
      let b = skeleton[i][1];
      strokeWeight(2);
      stroke(0);
      line(a.position.x, a.position.y, b.position.x, b.position.y);
    }
    for (let i = 0; i < pose.keypoints.length; i++) {
      let x = pose.keypoints[i].position.x;
      let y = pose.keypoints[i].position.y;
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
