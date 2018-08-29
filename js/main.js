try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    window.audioContext = new AudioContext();
} catch (e) {
alert('Web Audio API not supported.');
}

// Put variables in global scope to make them available to the browser console.
const constraints = window.constraints = {
audio: {channelCount: 1},
video: false
};

var shouldSave = false;

var startTime = 0;
var recentTime = 0;

var recordRTC;
var recordedChunks = [];

function handleSuccess(stream) {
    // Put variables in global scope to make them available to the
    // browser console.
    window.stream = stream;
    startRecording();

    var script = window.audioContext.createScriptProcessor(2048, 1, 1);
    script.onaudioprocess = onAudio;

    var mic = window.audioContext.createMediaStreamSource(stream);
    mic.connect(script);
    // necessary to make sample run, but should not be.
    script.connect(window.audioContext.destination);
  }
  
  function handleError(error) {
    console.log('navigator.getUserMedia error: ', error);
  }

function startRecording() {
    recordRTC = RecordRTC(stream, { recorderType: StereoAudioRecorder, numberOfAudioChannels: 1, type: 'audio/wav', sampleRate: 44100});
    stopped = false;
    startTime = new Date().getTime();
    recordedChunks = [];
    shouldSave = false;
    recordRTC.startRecording();
}

function onAudio(event) {
    const input = event.inputBuffer.getChannelData(0);
    let i;
    let max = 0;
    for (i = 0; i < input.length; ++i) {
      if(max < input[i])
        max = input[i];
    }


    if(max < 0.2) {
      let currentTime = new Date().getTime();
      if(recordRTC.state == 'recording' && ((!shouldSave && currentTime - startTime >= 3000) || 
        (shouldSave && currentTime - recentTime >= 3000))) {
        recordRTC.stopRecording(onFinishRecord);
      }
    }
    else {
      shouldSave = true;
      recentTime = new Date().getTime();
    }
}

function onFinishRecord(audioURL) {
    console.log("finish")
    if(shouldSave) {
        console.log("save")
      console.log(audioURL);
      var reader = new FileReader();
      reader.readAsDataURL(recordRTC.getBlob()); 
      reader.onloadend = function() {
        //console.log(reader.result)
        $.ajax({
          type: "POST",
          url: "https://speech.googleapis.com/v1p1beta1/speech:recognize?key=AIzaSyCXLjwSN8kpjr86r_NG3mj1tIhONMICEbo",
          data: JSON.stringify({
            "audio": {
              "content": reader.result.split(",")[1]
            },
            "config": {
              "enableAutomaticPunctuation": true,
              "encoding":"LINEAR16",
              "sampleRateHertz": 44100,
              "languageCode":"en-US",
              "model": "default"
            }
          }),
          success: function(data) {
            $('#chats').append('<div class="chat suggestion">' + data.results[0].alternatives[0].transcript + '</div>')
          },
          contentType: "application/json",
          dataType: "json"
        });
      }
    }
    startRecording();
  }

navigator.mediaDevices.getUserMedia(constraints).then(handleSuccess).catch(handleError);