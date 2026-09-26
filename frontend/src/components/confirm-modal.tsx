"use client";

import React from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="confirm-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">
          <button type="button" onClick={onCancel} aria-label="Close dialog">
            ×
          </button>
          <strong>{title}</strong>
          <span />
        </div>
        <div className="confirm-modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="clear" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={isDanger ? "danger-button" : "show"}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
