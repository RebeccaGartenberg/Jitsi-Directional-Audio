/*global
  $, JitsiMeetJS, config */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import './App.css';
import $ from 'jquery';
import { Seat } from './components/Seat';
import { ConnectForm } from './components/ConnectForm';
import { Audio } from './components/Audio';
import useWindowSize from './hooks/useWindowSize';
import qs from 'qs'

window.$  = $

// Stage 3
const connect = async ({ domain, room, config }) => {
  const connectionConfig = Object.assign({}, config);
  let serviceUrl = connectionConfig.websocket || connectionConfig.bosh;

  // URL stuff going on here
  serviceUrl += `?room=${room}`;
  if(serviceUrl.indexOf('//') === 0){
    serviceUrl = `https:${serviceUrl}`
  }
  connectionConfig.serviceUrl = connectionConfig.bosh = serviceUrl;

  return new Promise((resolve, reject) => {
    const connection = new JitsiMeetJS.JitsiConnection(null, undefined, connectionConfig, null);
    console.log('JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED', JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED)
    connection.addEventListener(
        JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
        () => resolve(connection));
    connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, reject);
    console.log("Event Listener added")
    connection.connect();
  })
}

const join = async ({ connection, room }) => {
  const conference = connection.initJitsiConference(room, {openBridgeChannel:true});

  return new Promise(resolve => {
    conference.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, () => resolve(conference));
    conference.join();
  })
}

// Stage 2
const connectandJoin = async ({ domain, room, config }) => {

  console.log("In connect and join now")
  const connection = await connect({ domain, room, config })
  const localTracks = await JitsiMeetJS.createLocalTracks({ devices: ['video', 'audio'], facingMode: 'user'}, true);

  const conference = await join({ connection, room })
  const localTrack = localTracks.find(track => track.getType() === 'video')
  conference.addTrack(localTrack)
  const localAudioTrack = localTracks.find(track => track.getType() === 'audio')
  conference.addTrack(localAudioTrack)

  return { connection, conference, localTrack }
}

// This is where the changes are being made - stage 1
const loadAndConnect = ({ domain, room}) => {
  return new Promise(( resolve ) => {
    const script = document.createElement('script')
    script.onload = () => {
      JitsiMeetJS.init();
      console.log("hello world")
      const configScript = document.createElement('script')
      //configScript.src = `https://199.98.27.14/etc/jitsi/meet/199.98.27.14-config.js`;
      configScript.src = `https://micro13.ee.cooper.edu/testing-config.js`;
      //configScript.src = `https://meet.jit.si/config.js`;//

      console.log(configScript.src)

      //configScript.src = `https://199.98.27.14/etc/jitsi/meet/external_api.js`;
      document.querySelector('head').appendChild(configScript);



      configScript.onload = () => {
        console.log("This is config var")
        console.log(config)
        connectandJoin({ domain, room, config }).then(resolve)
      }
    };

    console.log("Didn't reach this point")
    //script.src = `https://199.98.27.14/home/msenior13/SeniorProj2020/lib-jitsi-meet/lib-jitsi-meet.min.js`;
    script.src = `https://meet.jit.si/libs/lib-jitsi-meet.min.js`;
    console.log(script.src)
    document.querySelector('head').appendChild(script);
  })
}

const useTracks = () => {
  const [tracks, setTracks] = useState([])

  const addTrack = useCallback((track) => {
    setTracks((tracks) => {
      const hasTrack = tracks.find(_track => track.getId() === _track.getId())

      if(hasTrack) return tracks;

      return [...tracks, track]

    });
  }, [setTracks])

  const removeTrack = useCallback((track) => {
    setTracks((tracks) => tracks.filter(_track => track.getId() !== _track.getId()))
  }, [setTracks])

  return [tracks, addTrack, removeTrack]
}

const getDefaultParamsValue = () => {
  const params = document.location.search.length > 1 ? qs.parse(document.location.search.slice(1)) : {}
  debugger;
  return {
    room: params.room ?? 'daily_standup',
    domain: params.domain ?? '199.98.27.14',

    autoJoin: params.autojoin ?? true,
  }
}

function App() {

  useWindowSize()
  const defaultParams = useMemo(getDefaultParamsValue, [])
  // Rav added this
  // console.log(defaultParams)

  const [mainState, setMainState] = useState('init')
  const [domain, setDomain] = useState(defaultParams.domain)
  const [room, setRoom] = useState(defaultParams.room)
  const [conference, setConference] = useState(null)
  const [videoTracks, addVideoTrack, removeVideoTrack] = useTracks();
  const [audioTracks, addAudioTrack, removeAudioTrack] = useTracks();

  const addTrack = useCallback((track) => {
    if(track.getType() === 'video') addVideoTrack(track)
    if(track.getType() === 'audio') addAudioTrack(track)
  }, [ addVideoTrack, addAudioTrack ])

  const removeTrack = useCallback((track) => {
    if(track.getType() === 'video') removeVideoTrack(track)
    if(track.getType() === 'audio') removeAudioTrack(track)
  }, [removeAudioTrack, removeVideoTrack])

  const connect = useCallback(async (e) => {
    e && e.preventDefault()
    setMainState('loading')
    const { connection, conference, localTrack } = await loadAndConnect({ domain, room });
    setMainState('started')
    setConference(conference)
    addTrack(localTrack)
  }, [addTrack, domain, room]);

  useEffect(() => {
    if(!conference) return

    conference.on(JitsiMeetJS.events.conference.TRACK_ADDED, addTrack)
    conference.on(JitsiMeetJS.events.conference.TRACK_REMOVED, removeTrack)

  }, [addTrack, conference, removeTrack])

  useEffect(() => {
    if(defaultParams.autoJoin || defaultParams.autoJoin === ''){
      connect()
    }
  }, [connect, defaultParams.autoJoin])


  return (
      <div className="App">
        <header className="App-header">
          { mainState === 'init' && <ConnectForm connect={connect} domain={domain} room={room} setRoom={setRoom} setDomain={setDomain} /> }
          { mainState === 'loading' && 'Loading' }
          { mainState === 'started' &&
          <div style={{
            height: '100vh', width: '100vw', maxHeight: '100vw', maxWidth: '100vh',
            background: 'rgba(0, 100,100, 1)',
            position: 'relative',
            borderRadius: '100%'
          }}>
            {
              videoTracks.map((track, index) => <Seat track={track} index={index} length={videoTracks.length} key={track.getId()} />)
            }
            {
              audioTracks.map((track, index) => <Audio track={track} index={index} key={track.getId()} />)
            }
            {console.log(audioTracks)}

            {console.log("we are in the div")}
          </div>}

        </header>
      </div>
  );
}

export default App;