import { useState, useCallback } from 'react';
import { ShieldAlert, MapPin, Wifi, WifiOff, Loader2, ChevronRight } from 'lucide-react';
import CameraModule from './components/CameraModule.jsx';
import SeveritySlider from './components/SeveritySlider.jsx';
import QROutput from './components/QROutput.jsx';
import { analyzeImage } from './ai/visionHeuristics.js';
import { evaluateTriage, CATEGORY_META } from './ai/triageEngine.js';
import { resizeImage } from './utils/imageCompressor.js';
import { getCurrentPosition, formatCoords } from './utils/geoHandler.js';
import { packPayload } from './utils/encoder.js';
import './App.css';

const STAGES = {
  CAPTURE: 'capture',
  ANALYZING: 'analyzing',
  REVIEW: 'review',
  RESULT: 'result'
};

export default function App() {
  const [stage, setStage] = useState(STAGES.CAPTURE);
  const [rawImage, setRawImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [manualSeverity, setManualSeverity] = useState(null);
  const [coords, setCoords] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const isOnline = useOnlineStatus();

  const requestLocation = useCallback(() => {
    setGeoError(null);
    getCurrentPosition()
      .then((pos) => setCoords(formatCoords(pos.lat, pos.lon)))
      .catch((err) => setGeoError(err.message));
  }, []);

  const handleCapture = useCallback(
    async (dataUrl) => {
      setRawImage(dataUrl);
      setStage(STAGES.ANALYZING);
      setAnalysisError(null);

      // Kick off geolocation in parallel — it should not block analysis.
      requestLocation();

      try {
        const { canvas, dataUrl: preview } = await resizeImage(dataUrl, 224);
        setPreview(preview);

        // Synchronous, pure-Canvas heuristic — no network, no model
        // download, cannot fail to "load" because nothing is loaded.
        const results = analyzeImage(canvas);
        setPredictions(results);
        setStage(STAGES.REVIEW);
      } catch (err) {
        console.error(err);
        setAnalysisError(
          'Image analysis failed to run on this photo. You can still submit a manual assessment below.'
        );
        setStage(STAGES.REVIEW);
      }
    },
    [requestLocation]
  );

  const triage = predictions.length || manualSeverity
    ? evaluateTriage(predictions, manualSeverity)
    : null;

  const payload = triage ? packPayload(triage, coords) : null;

  function reset() {
    setStage(STAGES.CAPTURE);
    setRawImage(null);
    setPreview(null);
    setPredictions([]);
    setManualSeverity(null);
    setCoords(null);
    setGeoError(null);
    setAnalysisError(null);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <ShieldAlert size={22} />
          <span>WhisperTriage AI</span>
        </div>
        <div className={`net-badge ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isOnline ? 'Online' : 'Offline — running on device'}
        </div>
      </header>

      <main className="app-main">
        {stage === STAGES.CAPTURE && (
          <section className="stage stage-capture">
            <p className="stage-intro">
              Photograph the patient or scene. Analysis and compression happen entirely on
              this device — nothing is uploaded.
            </p>
            <CameraModule onCapture={handleCapture} />
          </section>
        )}

        {stage === STAGES.ANALYZING && (
          <section className="stage stage-analyzing">
            {rawImage && <img src={rawImage} alt="Captured" className="analyzing-thumb" />}
            <Loader2 className="spin" size={28} />
            <p>Analyzing…</p>
            <p className="stage-note">
              Runs entirely on-device via Canvas pixel analysis — no download, no network call.
            </p>
          </section>
        )}

        {stage === STAGES.REVIEW && (
          <section className="stage stage-review">
            {preview && <img src={preview} alt="Analyzed frame" className="review-thumb" />}

            {analysisError && <div className="alert alert-warn">{analysisError}</div>}

            {predictions.length > 0 && (
              <div className="prediction-list">
                <p className="section-label">On-device visual signal</p>
                {predictions.slice(0, 3).map((p) => (
                  <div className="prediction-row" key={p.label}>
                    <span>{p.label}</span>
                    <span>{Math.round(p.score * 100)}%</span>
                  </div>
                ))}
              </div>
            )}

            <SeveritySlider value={manualSeverity} onChange={setManualSeverity} />

            <div className="geo-row">
              <MapPin size={14} />
              {coords ? (
                <span>{coords.lat}, {coords.lon}</span>
              ) : (
                <>
                  <span>{geoError || 'Acquiring GPS…'}</span>
                  {geoError && (
                    <button className="geo-retry" onClick={requestLocation} type="button">
                      Retry
                    </button>
                  )}
                </>
              )}
            </div>

            <button
              className="btn btn-primary"
              disabled={!triage}
              onClick={() => setStage(STAGES.RESULT)}
            >
              Generate triage code <ChevronRight size={16} />
            </button>
          </section>
        )}

        {stage === STAGES.RESULT && triage && (
          <section className="stage stage-result">
            <div className={`triage-banner cat-${triage.category.toLowerCase()}`}>
              <span className="triage-color-dot" />
              <div>
                <p className="triage-category">{triage.label} — {CATEGORY_META[triage.category].color}</p>
                <p className="triage-confidence">Confidence {Math.round(triage.confidence * 100)}% · {triage.source === 'manual' ? 'Operator confirmed' : 'Heuristic suggested'}</p>
              </div>
            </div>

            <QROutput payload={payload} byteSize={new TextEncoder().encode(payload).length} />

            <button className="btn btn-ghost" onClick={reset}>
              New capture
            </button>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <span>Zero backend · Zero cloud calls · Zero downloads · Fully offline, always</span>
      </footer>
    </div>
  );
}

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  if (typeof window !== 'undefined') {
    window.ononline = () => setOnline(true);
    window.onoffline = () => setOnline(false);
  }
  return online;
}
