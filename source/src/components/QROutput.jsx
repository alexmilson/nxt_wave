import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Radio } from 'lucide-react';
import { useState } from 'react';

/**
 * QROutput
 * Renders the compressed triage payload as a scannable, high-contrast
 * QR code, plus the raw string for manual SMS/radio relay when even a
 * camera-scan handoff isn't possible.
 */
export default function QROutput({ payload, byteSize }) {
  const [copied, setCopied] = useState(false);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API may be unavailable (e.g. insecure context) — fail silently,
      // the raw string is still visible and selectable on screen.
    }
  }

  return (
    <div className="qr-output">
      <div className="qr-card">
        <QRCodeSVG
          value={payload}
          size={220}
          level="M"
          bgColor="#ffffff"
          fgColor="#0b0f0e"
          includeMargin
        />
      </div>

      <div className="qr-meta">
        <div className="qr-payload-row">
          <code className="qr-payload-text">{payload}</code>
          <button className="btn btn-icon" onClick={copyToClipboard} title="Copy payload">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
        <div className="qr-stats">
          <span>
            <Radio size={14} /> {byteSize} bytes
          </span>
          <span>Scan device-to-device, relay via SMS, or read aloud over radio.</span>
        </div>
      </div>
    </div>
  );
}
