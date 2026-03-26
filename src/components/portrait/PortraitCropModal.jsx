import React from "react";
import Cropper from "react-easy-crop";

export default function PortraitCropModal({
  open,
  src,
  crop,
  zoom,
  onCropChange,
  onZoomChange,
  onCropComplete,
  onCancel,
  onApply,
}) {
  if (!open || !src) return null;

  return (
    <div className="pip-modal-backdrop">
      <div className="pip-modal pip-panel">
        <div className="pip-head">
          <h2>[ PORTRAIT CROPPER ]</h2>
          <span>ROBCO IMAGE TOOL</span>
        </div>
        <div className="pip-cropper-wrap">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={3 / 4}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={(_, croppedAreaPixels) => onCropComplete(croppedAreaPixels)}
          />
        </div>
        <div className="pip-form-grid push-top">
          <label className="pip-field">
            <span>Zoom</span>
            <input
              className="pip-range"
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(e) => onZoomChange(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="pip-actions-inline push-top">
          <button type="button" className="pip-btn" onClick={onCancel}>CANCEL</button>
          <button type="button" className="pip-btn is-primary" onClick={onApply}>APPLY PORTRAIT</button>
        </div>
      </div>
    </div>
  );
}
