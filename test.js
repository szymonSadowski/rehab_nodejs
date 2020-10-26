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