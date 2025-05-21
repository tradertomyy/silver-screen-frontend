import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Hls from 'hls.js';
import { useParams, useNavigate } from 'react-router-dom';
import { movies } from './data/movies'; // Import the movies data

function MovieRoom() {
  // Get movieId from URL params
  const { movieId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [roomId, setRoomId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [currentMovie, setCurrentMovie] = useState(null);


  // Refs
  const videoRef = useRef(null);
  const isRemoteAction = useRef(false);
  const hlsRef = useRef(null);
  const socketRef = useRef(null);
  const lastActionTime = useRef(0);
  const seekTimeout = useRef(null);
  const playTimeout = useRef(null);

  // Find the current movie based on movieId
  useEffect(() => {
    const movie = movies.find(m => m.id === movieId);
    if (movie) {
      setCurrentMovie(movie);
    } else {
      setError('Movie not found');
      // Optionally redirect back to catalogue after a delay
      setTimeout(() => navigate('/'), 3000);
    }
  }, [movieId, navigate]);

const currentSource = currentMovie?.videoSource;


  // Socket connection setup
  useEffect(() => {
    const initializeSocket = () => {
      socketRef.current = io('https://movie-socket-server.onrender.com', {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Socket event handlers
      socketRef.current.on('connect', () => {
        setConnectionStatus('connected');
      });

      socketRef.current.on('disconnect', () => {
        setConnectionStatus('disconnected');
      });

      socketRef.current.on('connect_error', () => {
        setConnectionStatus('error');
        setError('Failed to connect to server');
      });

      socketRef.current.on('joined-room', () => {
        setJoined(true);
        setError(null);
      });

      socketRef.current.on('error-message', setError);
      socketRef.current.on('error', () => setError('Connection error'));

      socketRef.current.on('playback-state', handleRemotePlayback);
      socketRef.current.on('force-seek', handleForceSeek);
    };

    initializeSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // HLS player setup
  useEffect(() => {
    if (!joined || !videoRef.current) return;

    const initializePlayer = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const video = videoRef.current;

      if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        
        hls.loadSource(currentSource);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log("Manifest loaded");
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) setError("Video loading failed");
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = currentSource;
        video.addEventListener('error', () => {
          setError("Native HLS playback failed");
        });
      } else {
        setError("Browser doesn't support HLS");
      }
    };

    initializePlayer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [joined, currentSource]);

  useEffect(() => {
    // Store current video ref in a variable
    const videoElement = videoRef.current;

    return () => {
      // Use the stored reference in cleanup
      clearTimeout(seekTimeout.current);
      clearTimeout(playTimeout.current);
      if (videoElement) {
        videoElement.removeEventListener('canplay', () => {});
      }
    };
  }, []);
  // Event handlers
  const handleRemotePlayback = ({ isPlaying, timestamp }) => {
    if (!videoRef.current || isRemoteAction.current) return;
    
    isRemoteAction.current = true;
    
    try {
      videoRef.current.currentTime = timestamp;
      if (isPlaying) {
        videoRef.current.play().catch(e => {
          console.error("Remote play failed:", e);
          setIsSeeking(false);
          setTimeout(() => videoRef.current.play()
            .catch(e => console.error("Retry failed too:", e)), 500);
        });
      } else {
        videoRef.current.pause();
      }
    } catch (e) {
      console.error("Remote playback error:", e);
    }
    
    setTimeout(() => isRemoteAction.current = false, 100);
  };

  const handleForceSeek = ({ timestamp, shouldPlay }) => {
    if (!videoRef.current) return;
    
    // Clear any pending timeouts/events from previous seeks
    videoRef.current.removeEventListener('canplay', handleCanPlay);
    if (seekTimeout.current) clearTimeout(seekTimeout.current);
    if (playTimeout.current) clearTimeout(playTimeout.current);

    setIsSeeking(true);
    isRemoteAction.current = true;
    
    try {
      videoRef.current.currentTime = timestamp;
    } catch (e) {
      console.error("Seek failed:", e);
      setIsSeeking(false);
      return;
    }

    function handleCanPlay() {
      videoRef.current.removeEventListener('canplay', handleCanPlay);
      if (seekTimeout.current) clearTimeout(seekTimeout.current);
      handlePlayAfterSeek();
    };

    const handlePlayAfterSeek = () => {
      if (shouldPlay) {
        playTimeout.current = setTimeout(() => {
          videoRef.current.play()
            .catch(e => console.error("Play failed after seek:", e))
            .finally(() => setIsSeeking(false));
        }, 300);
      } else {
        videoRef.current.pause();
        setIsSeeking(false);
      }
      setTimeout(() => isRemoteAction.current = false, 100);
    };

    videoRef.current.addEventListener('canplay', handleCanPlay);
    seekTimeout.current = setTimeout(() => {
      videoRef.current.removeEventListener('canplay', handleCanPlay);
      handlePlayAfterSeek();
    }, 1000);
  };
  
  const handlePlay = () => {
    if (!socketRef.current?.connected || !videoRef.current) return;
    const now = Date.now();
    if (now - lastActionTime.current < 200) return;
    lastActionTime.current = now;
    socketRef.current.emit('playback-state', { 
      isPlaying: true,
      timestamp: videoRef.current.currentTime
    });
  };

  const handlePause = () => {
    if (!socketRef.current?.connected || !videoRef.current) return;
    const now = Date.now();
    if (now - lastActionTime.current < 200) return;
    lastActionTime.current = now;
    socketRef.current.emit('playback-state', { 
      isPlaying: false,
      timestamp: videoRef.current.currentTime
    });
  };

  const handleSeek = (e) => {
    if (!videoRef.current || !socketRef.current?.connected) return;
    const timestamp = e.target.currentTime;
    if (typeof timestamp !== 'number' || isNaN(timestamp)) return;
    
    const now = Date.now();
    if (now - lastActionTime.current < 200) return;
    
    lastActionTime.current = now;
    socketRef.current.emit('client-seek', { 
      timestamp,
      shouldPlay: !videoRef.current.paused 
    });
  };

  const joinRoom = () => {
    setError(null);
    setIsLoading(true);
    
    if (!roomId.trim() || !passcode.trim()) {
      setError('Room ID and passcode are required');
      setIsLoading(false);
      return;
    }
    
    if (!socketRef.current?.connected) {
      setError('Not connected to server');
      setIsLoading(false);
      return;
    }

    const timeout = setTimeout(() => setIsLoading(false), 5000);

    const onJoined = () => {
      clearTimeout(timeout);
      setIsLoading(false);
      socketRef.current?.off('joined-room', onJoined);
      socketRef.current?.off('error-message', onError);
    };

    const onError = (msg) => {
      clearTimeout(timeout);
      setIsLoading(false);
      setError(msg);
      socketRef.current?.off('joined-room', onJoined);
      socketRef.current?.off('error-message', onError);
    };

    socketRef.current?.on('joined-room', onJoined);
    socketRef.current?.on('error-message', onError);
    socketRef.current.emit('join-room', { 
      roomId: roomId.trim(), 
      passcode: passcode.trim() 
    });
  };

  const leaveRoom = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setJoined(false);
  };

  // Render
  return (
    <div style={{ padding: 20 }}>
      <div style={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        padding: '5px 10px',
        borderRadius: '4px',
        background: 
          connectionStatus === 'connected' ? '#4CAF50' : 
          connectionStatus === 'error' ? '#F44336' : '#FF9800',
        color: 'white'
      }}>
        {connectionStatus.toUpperCase()}
      </div>

      {!joined ? (
        <div>
          <h1>Join a Movie Room</h1>
          {currentMovie && <h2>Now Watching: {currentMovie.title} ({currentMovie.year})</h2>}
          {error && <ErrorDisplay message={error} />}
          <div style={{ margin: '20px 0' }}>
            <InputField 
              type="text"
              placeholder="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              disabled={isLoading}
            />
            <InputField 
              type="password"
              placeholder="Passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
            <Button 
              onClick={joinRoom}
              disabled={isLoading}
              loading={isLoading}
              label={isLoading ? "Joining..." : "Join Room"}
            />
          </div>
          <DebugInfo 
            connectionStatus={connectionStatus} 
            socketConnected={socketRef.current?.connected}
          />
        </div>
      ) : (
        <div>
          <h2>You're in room: {roomId}</h2>
          {currentMovie && <h3>Watching: {currentMovie.title}</h3>}
          {error && <ErrorDisplay message={error} />}
          
          <div style={{ position: 'relative' }}> 
            <video
              ref={videoRef}
              controls={!isSeeking}
              width="720"
              style={{ 
                maxWidth: '100%',
                opacity: isSeeking ? 0.7 : 1
              }}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeeked={handleSeek}
            >
              <source src={currentSource} type="application/x-mpegURL" />
              Your browser does not support HLS streaming.
            </video>
            
            {isSeeking && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%,-50%)',
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '5px',
                zIndex: 10,
                pointerEvents: 'none'
              }}>
                Syncing...
              </div>
            )}
          </div>

          <div style={{ marginTop: '20px' }}>
            <Button 
              onClick={leaveRoom}
              label="Leave Room"
              color="#f44336"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper components (would normally be in separate files)
function ErrorDisplay({ message }) {
  return (
    <div style={{ 
      color: 'white', 
      backgroundColor: '#F44336',
      padding: '10px',
      borderRadius: '4px',
      margin: '10px 0'
    }}>
      {message}
    </div>
  );
}

function InputField({ type, placeholder, value, onChange, disabled }) {
  return (
    <div style={{ marginBottom: type === 'password' ? '20px' : '10px' }}>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{ 
          padding: '10px',
          width: '200px',
          borderRadius: '4px',
          border: '1px solid #ccc'
        }}
      />
    </div>
  );
}

function Button({ onClick, disabled, loading, label, color = '#2196F3' }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      style={{ 
        padding: '10px 20px',
        background: loading ? '#cccccc' : color,
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: loading ? 'wait' : 'pointer',
        fontSize: '16px'
      }}
    >
      {label}
    </button>
  );
}

function DebugInfo({ connectionStatus, socketConnected}) {
  return (
    <div style={{ color: '#666', fontSize: '14px' }}>
      <p>Debug information:</p>
      <ul>
        <li>Connection: {connectionStatus}</li>
        <li>Socket: {socketConnected ? 'Connected' : 'Disconnected'}</li>
      </ul>
    </div>
  );
}

export default MovieRoom;