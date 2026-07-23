import './BookmarksModal.css';

import { Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useTraffic } from '../lib/TrafficContext';
import { usePresets } from '../lib/usePresets';

export function BookmarksModal() {
  const { selectedCameras, selectRoute } = useTraffic();
  const { presets, addPreset, removePreset } = usePresets();

  const [showModal, setShowModal] = useState(false);
  const [saveName, setSaveName] = useState('');

  useEffect(() => {
    const handler = () => setShowModal(true);
    window.addEventListener('open-bookmarks-modal', handler);
    return () => window.removeEventListener('open-bookmarks-modal', handler);
  }, []);

  const handleLoadPreset = (cameraIds: string[]) => {
    selectRoute(cameraIds);
    setShowModal(false);
  };

  const handleSave = () => {
    if (saveName.trim() && selectedCameras.length > 0) {
      addPreset(saveName.trim(), selectedCameras.map((c) => c.id));
      setSaveName('');
    }
  };

  if (!showModal) return null;

  return (
    <div className="bookmarks-overlay" onClick={() => setShowModal(false)}>
      <div className="bookmarks-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bookmarks-modal-header">
          <h2>Bookmarks <span className="bookmarks-notice">Stored on this device only</span></h2>
          <button className="bookmarks-modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
        </div>

        {/* List of bookmarks */}
        <div className="bookmarks-list">
          {presets.length === 0 ? (
            <p className="bookmarks-empty">No bookmarks saved yet.</p>
          ) : (
            presets.map((p) => (
              <div key={p.id} className="bookmarks-list-item">
                <button className="bookmarks-list-load" onClick={() => handleLoadPreset(p.cameraIds)}>
                  <span className="bookmarks-list-name">{p.name}</span>
                  <span className="bookmarks-list-count">{p.cameraIds.length} cameras</span>
                </button>
                <button className="bookmarks-list-delete" onClick={() => removePreset(p.id)} title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Save current selection */}
        {selectedCameras.length > 0 && (
          <div className="bookmarks-save-section">
            <p className="bookmarks-save-label">Save current selection ({selectedCameras.length} cameras)</p>
            <div className="bookmarks-save-row">
              <input
                className="bookmarks-save-input"
                type="text"
                placeholder="Bookmark name..."
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                autoFocus
              />
              <button className="bookmarks-save-btn" onClick={handleSave} disabled={!saveName.trim()}>Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
