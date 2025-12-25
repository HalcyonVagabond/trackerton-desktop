import { useState, useEffect } from 'react';
import { isoToLocalInput, localInputToIso, secondsToHms } from '../../utils/taskManager';
import type { TimeEntryModalState } from '../../types/taskManager';

interface TimeEntryModalProps {
  state: TimeEntryModalState;
  onClose: () => void;
  onSave: (payload: { duration: number; timestamp: string; notes?: string }) => Promise<void>;
}

export function TimeEntryModal({ state, onClose, onSave }: TimeEntryModalProps) {
  const entry = state.entry;
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('0');
  const [seconds, setSeconds] = useState('0');
  const [timestamp, setTimestamp] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entry) {
      setHours('0');
      setMinutes('0');
      setSeconds('0');
      setTimestamp('');
      setNotes('');
      setError(null);
      setSaving(false);
      return;
    }
    const { hours: h, minutes: m, secs: s } = secondsToHms(entry.duration);
    setHours(String(h));
    setMinutes(String(m));
    setSeconds(String(s));
    setTimestamp(isoToLocalInput(entry.timestamp));
    setNotes(entry.notes ?? '');
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
      await onSave({ 
        duration, 
        timestamp: localInputToIso(timestamp),
        notes: notes.trim() || undefined
      });
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
      <div className="modal-content time-entry-modal">
        <h3 className="modal-title">Edit Time Entry</h3>
        
        <div className="time-entry-modal__section">
          <label className="time-entry-modal__label">Duration</label>
          <div className="time-entry-modal__duration">
            <div className="time-entry-modal__duration-field">
              <input
                id="hoursInput"
                type="number"
                className="time-entry-modal__duration-input"
                min={0}
                max={999}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
              <span className="time-entry-modal__duration-unit">h</span>
            </div>
            <span className="time-entry-modal__duration-sep">:</span>
            <div className="time-entry-modal__duration-field">
              <input
                id="minutesInput"
                type="number"
                className="time-entry-modal__duration-input"
                min={0}
                max={59}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
              <span className="time-entry-modal__duration-unit">m</span>
            </div>
            <span className="time-entry-modal__duration-sep">:</span>
            <div className="time-entry-modal__duration-field">
              <input
                id="secondsInput"
                type="number"
                className="time-entry-modal__duration-input"
                min={0}
                max={59}
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
              />
              <span className="time-entry-modal__duration-unit">s</span>
            </div>
          </div>
        </div>

        <div className="time-entry-modal__section">
          <label className="time-entry-modal__label" htmlFor="timestampInput">
            Timestamp
          </label>
          <input
            id="timestampInput"
            type="datetime-local"
            className="time-entry-modal__input"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
          />
        </div>

        <div className="time-entry-modal__section">
          <label className="time-entry-modal__label" htmlFor="notesInput">
            Notes
          </label>
          <textarea
            id="notesInput"
            className="time-entry-modal__textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you work on?"
            rows={3}
          />
        </div>

        {error && (
          <div className="time-entry-modal__error">{error}</div>
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
