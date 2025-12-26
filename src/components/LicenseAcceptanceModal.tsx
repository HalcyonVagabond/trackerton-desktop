import { useState } from 'react';

const LICENSE_ACCEPTED_KEY = 'trackerton-license-accepted';

const LICENSE_TEXT = `MIT License

Copyright (c) 2025 Trackerton

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

interface LicenseAcceptanceModalProps {
  onAccept: () => void;
}

export function LicenseAcceptanceModal({ onAccept }: LicenseAcceptanceModalProps) {
  const [agreed, setAgreed] = useState(false);

  const handleAccept = () => {
    if (agreed) {
      localStorage.setItem(LICENSE_ACCEPTED_KEY, 'true');
      onAccept();
    }
  };

  return (
    <div className="modal-overlay modal-overlay--blocking">
      <div className="license-modal">
        <div className="license-modal__header">
          <div className="license-modal__icon">📜</div>
          <h2 className="license-modal__title">License Agreement</h2>
          <p className="license-modal__subtitle">Please review and accept the license terms to continue</p>
        </div>

        <div className="license-modal__content">
          <div className="license-modal__license-box">
            <pre className="license-modal__license-text">{LICENSE_TEXT}</pre>
          </div>
        </div>

        <div className="license-modal__footer">
          <label className="license-modal__checkbox-label">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="license-modal__checkbox"
            />
            <span className="license-modal__checkbox-custom" />
            <span className="license-modal__checkbox-text">
              I have read and agree to the terms of the MIT License
            </span>
          </label>

          <button
            className="btn btn--primary license-modal__accept-btn"
            onClick={handleAccept}
            disabled={!agreed}
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export function hasAcceptedLicense(): boolean {
  return localStorage.getItem(LICENSE_ACCEPTED_KEY) === 'true';
}
