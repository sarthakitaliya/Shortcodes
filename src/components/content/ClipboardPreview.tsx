import React, { useEffect, useRef, useCallback } from 'react';
import { Clipboard, Check, X } from 'lucide-react';

interface ClipboardPreviewProps {
    content: string;
    position: { x: number; y: number };
    onConfirm: () => void;
    onCancel: () => void;
    theme?: 'light' | 'dark';
}

export const ClipboardPreview: React.FC<ClipboardPreviewProps> = ({
    content,
    position,
    onConfirm,
    onCancel,
    theme = 'light',
}) => {
    const previewRef = useRef<HTMLDivElement>(null);

    // Calculate adjusted position ensuring popup stays in viewport
    const adjustedPosition = {
        x: Math.min(position.x, window.innerWidth - 360),
        y: Math.min(position.y, window.innerHeight - 200),
    };

    // Handle keyboard events
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onConfirm();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        }
    }, [onConfirm, onCancel]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [handleKeyDown]);

    // Truncate long content for preview
    const displayContent = content.length > 200
        ? content.substring(0, 200) + '...'
        : content;

    // Show empty state if clipboard is empty
    const isEmpty = !content || content.trim() === '';

    return (
        <div
            ref={previewRef}
            className={`sc-clipboard-preview ${theme}`}
            style={{
                left: `${adjustedPosition.x}px`,
                top: `${adjustedPosition.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="sc-clipboard-preview-header">
                <Clipboard size={16} />
                <span>Clipboard Preview</span>
            </div>

            {/* Content */}
            <div className="sc-clipboard-preview-content">
                {isEmpty ? (
                    <div className="sc-clipboard-preview-empty">
                        Clipboard is empty
                    </div>
                ) : (
                    <div className="sc-clipboard-preview-text">
                        {displayContent}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="sc-clipboard-preview-actions">
                <button
                    className="sc-clipboard-preview-btn cancel"
                    onClick={onCancel}
                >
                    <X size={14} />
                    Cancel
                </button>
                <button
                    className="sc-clipboard-preview-btn confirm"
                    onClick={onConfirm}
                    disabled={isEmpty}
                >
                    <Check size={14} />
                    Insert
                </button>
            </div>

            {/* Footer hints */}
            <div className="sc-clipboard-preview-footer">
                <div className="sc-clipboard-preview-hint">
                    <span className="sc-clipboard-preview-key">Enter</span>
                    <span>Insert</span>
                </div>
                <div className="sc-clipboard-preview-hint">
                    <span className="sc-clipboard-preview-key">Esc</span>
                    <span>Cancel</span>
                </div>
            </div>
        </div>
    );
};
