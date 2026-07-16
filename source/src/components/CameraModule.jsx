import { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RotateCcw, Upload, X } from 'lucide-react';

/**
 * CameraModule
 * Accesses the device camera via getUserMedia and lets the operator
 * capture a still frame, or fall back to a file upload if camera
 * access is unavailable (e.g. desktop testing, permission denied).
 *
 * Emits the captured frame as a data URL via onCapture.
 */
export default function CameraModule({ onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [preview, setPreview] = useState(null);

  const startStream = useCallback(async (mode) => {
    stopStream();
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsStreaming(true);
    } catch (err) {
      setIsStreaming(false);
      setError('Camera unavailable. Use "Upload photo" instead.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  useEffect(() => {
    startStream(facingMode);
    return () => stopStream();
  }, [facingMode, startStream]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPreview(dataUrl);
    onCapture(dataUrl);
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result);
      onCapture(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function retake() {
    setPreview(null);
    startStream(facingMode);
  }

  function flipCamera() {
    setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'));
  }

  if (preview) {
    return (
      <div className="camera-module">
        <div className="camera-frame">
          <img src={preview} alt="Captured scene" className="camera-preview" />
        </div>
        <div className="camera-controls">
          <button className="btn btn-ghost" onClick={retake}>
            <X size={18} /> Retake
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="camera-module">
      <div className="camera-frame">
        {isStreaming ? (
          <video ref={videoRef} className="camera-preview" playsInline muted />
        ) : (
          <div className="camera-placeholder">
            <Camera size={32} />
            <p>{error || 'Requesting camera access…'}</p>
          </div>
        )}
        <div className="camera-reticle" aria-hidden="true" />
      </div>

      <div className="camera-controls">
        <label className="btn btn-ghost">
          <Upload size={18} /> Upload photo
          <input type="file" accept="image/*" onChange={handleFileUpload} hidden />
        </label>

        <button className="btn btn-capture" onClick={capture} disabled={!isStreaming}>
          <span className="capture-ring" />
        </button>

        <button className="btn btn-ghost" onClick={flipCamera} disabled={!isStreaming}>
          <RotateCcw size={18} /> Flip
        </button>
      </div>
    </div>
  );
}
