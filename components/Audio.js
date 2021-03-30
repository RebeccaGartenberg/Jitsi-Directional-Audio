import React from 'react';
//https://stackoverflow.com/questions/14623947/web-audio-api-how-do-i-play-a-mono-source-in-only-left-or-right-channel
//https://stackoverflow.com/questions/60946825/adding-panner-spacial-audio-to-web-audio-context-from-a-webrtc-stream-not-work
export const Audio = ({ track, index }) => {
  //track.track.getSettings().channelCount = 2;
  //var newTrack = track
  //console.log("new track:")
  console.log(track.getParticipantId())
  console.log(track)
  //track.setEffect(undefined)
  //track.setEffect(1, PAN, LEFT_RIGHT, -100, 1, -100, 2)
  console.log(track.track.getCapabilities())
  //var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  var AudioContext = window.AudioContext || window.webkitAudioContext;
  var audioCtx = new AudioContext();
  var source = audioCtx.createMediaStreamSource(track.stream);
  console.log(source)
  var destination = audioCtx.createMediaStreamDestination()
  console.log(destination)
  //var panNode = audioCtx.createStereoPanner();
  var panNode = audioCtx.createPanner()
  source.connect(panNode);
  //panNode.connect(audioCtx.destination);
  panNode.connect(destination)
  //panNode.pan.value = 1;
  panNode.setPosition(10000,0,0);
  //var convolverNode = new ConvolverNode(audioCtx)
  console.log(panNode)

  if (track && track.isLocal())
    return null;
  return <audio autoPlay='1' ref={(ref) => ref && track.attach(ref)} />;
};
