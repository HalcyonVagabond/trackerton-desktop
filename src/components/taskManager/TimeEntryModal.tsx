import { useState, useEffect } from 'react';
import { isoToLocalInput, localInputToIso, secondsToHms } from '../../utils/taskManager';
import type { TimeEntryModalState } from '../../types/taskManager';

interface TimeEntryModalProps {
  state: TimeEntryModalState;
  onClose: () => void;
  onSave: (payload: { duration: number; timestamp: string }) => Promise<void>;
}

export function TimeEntryModal({ state, onClose, onSave }: TimeEntryModalProps) {
  const entry = state.entry;
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('0');
  const [seconds, setSeconds] = useState('0');
  const [timestamp, setTimestamp] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entry) {
      setHours('0');
      setMinutes('0');
      setSeconds('0');
      setTimestamp('');
      setError(null);
      setSaving(false);
      return;
    }
    const { hours: h, minutes: m, secs: s } = secondsToHms(entry.duration);
    setHours(String(h));
    setMinutes(String(m));
    setSeconds(String(s));
    setTimestamp(isoToLocalInput(entry.timestamp));
    setError(null);
    setSaving(false);
  }, [entry]);

  if (!state.isOpen || !entry) {
    return null;
  }

  const handleSave = async () => {
    const hoursVal = Number(hours) || 0;
    const minutesVal = Number(minutes) || 0;
    const secondsVal = Number(seconds) || 0;

    if (minutesVal > 59 || secondsVal > 59) {
      setError('Minutes and seconds must be less than 60.');
      return;
    }

    const duration = hoursVal * 3600 + minutesVal * 60 + secondsVal;
    if (duration < 0) {
      setError('Duration must be greater than or equal to zero.');
      return;
    }

    setSaving(true);
    try {
      await onSave({ duration, timestamp: localInputToIso(timestamp) });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save time entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal"
      onClick={(event) => {
        if (event.target instanceof Node && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-content">
        <h3 className="modal-title">Edit Time Entry</h3>
        <div className="time-input-group">
          <div className="time-input-field">
            <label className="time-input-label" htmlFor="hoursInput">Hours</label>
            <input
              id="hoursInput"
              type="number"
              className="time-input"
              min={0}
              max={999}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
          <div className="time-input-field">
            <label className="time-input-label" htmlFor="minutesInput">Minutes</label>
            <input
              id="minutesInput"
              type="number"
              className="time-input"
              min={0}
              max={59}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>
          <div className="time-input-field">
            <label className="time-input-label" htmlFor="secondsInput">Seconds</label>
            <input
              id="secondsInput"
              type="number"
              className="time-input"
              min={0}
              max={59}
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
            />
          </div>
        </div>
        <label className="settings-label" htmlFor="timestampInput" style={{ marginTop: '1rem' }}>
          Timestamp
        </label>
        <input
          id="timestampInput"
          type="datetime-local"
          className="modal-input"
          value={timestamp}
          onChange={(e) => setTimestamp(e.target.value)}
        />
        {error && (
          <div style={{ color: '#b91c1c', marginTop: '0.75rem', fontSize: '0.9rem' }}>{error}</div>
        )}
        <div className="modal-actions">
          <button className="btn btn--cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn--save" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
