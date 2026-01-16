import React, { useEffect, useRef, useCallback } from 'react';
import { FileText, ClipboardList } from 'lucide-react';
import { AliasType } from '../../lib/aliasTypes';
import { Favicon } from '../Favicon';

interface AutocompleteItem {
    shortcode: string;
    value: string;
    type: AliasType;
    description?: string;
}

interface AutocompleteProps {
    items: AutocompleteItem[];
    position: { x: number; y: number };
    selectedIndex: number;
    query: string;
    onSelect: (item: AutocompleteItem) => void;
    onClose: () => void;
    onNavigate: (direction: 'up' | 'down') => void;
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
    items,
    position,
    selectedIndex,
    query,
    onSelect,
    onClose,
    onNavigate,
}) => {
    const listRef = useRef<HTMLDivElement>(null);
    const selectedRef = useRef<HTMLDivElement>(null);

    // Scroll selected item into view
    useEffect(() => {
        if (selectedRef.current && listRef.current) {
            selectedRef.current.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth',
            });
        }
    }, [selectedIndex]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                e.stopPropagation();
                onNavigate('up');
                break;
            case 'ArrowDown':
                e.preventDefault();
                e.stopPropagation();
                onNavigate('down');
                break;
            case 'Enter':
                e.preventDefault();
                e.stopPropagation();
                if (items[selectedIndex]) {
                    onSelect(items[selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                e.stopPropagation();
                onClose();
                break;
        }
    }, [items, selectedIndex, onSelect, onClose, onNavigate]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [handleKeyDown]);

    // Calculate position ensuring dropdown stays in viewport
    const adjustedPosition = {
        x: Math.min(position.x, window.innerWidth - 380),
        y: Math.min(position.y, window.innerHeight - 340 + window.scrollY),
    };

    if (items.length === 0) {
        return (
            <div
                className="sc-autocomplete"
                style={{
                    left: `${adjustedPosition.x}px`,
                    top: `${adjustedPosition.y}px`,
                }}
            >
                <div className="sc-autocomplete-empty">
                    No matches for <span className="font-semibold text-gray-600">{query}</span>
                </div>
            </div>
        );
    }

    return (
        <div
            className="sc-autocomplete"
            style={{
                left: `${adjustedPosition.x}px`,
                top: `${adjustedPosition.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="sc-autocomplete-header">
                <span className="sc-autocomplete-query">
                    Suggestions for <span className="font-semibold text-gray-700">{query}</span>
                </span>
            </div>

            {/* List */}
            <div ref={listRef} className="sc-autocomplete-list">
                {items.map((item, index) => (
                    <div
                        key={item.shortcode}
                        ref={index === selectedIndex ? selectedRef : null}
                        className={`sc-autocomplete-item ${index === selectedIndex ? 'selected' : ''}`}
                        onClick={() => onSelect(item)}
                        onMouseEnter={() => { }} // Could add hover selection
                    >
                        {/* Preview */}
                        <div className="sc-autocomplete-emoji">
                            {item.type === 'emoji' ? item.value :
                                item.type === 'link' ? <Favicon url={item.value} /> :
                                    item.type === 'template' ? <ClipboardList size={18} /> : <FileText size={18} />}
                        </div>

                        {/* Info */}
                        <div className="sc-autocomplete-info">
                            <div className="sc-autocomplete-shortcode">{item.shortcode}</div>
                            {item.description && (
                                <div className="sc-autocomplete-type">{item.description}</div>
                            )}
                        </div>

                        {/* Type Badge */}
                        <span className={`sc-autocomplete-type-badge ${item.type}`}>
                            {item.type}
                        </span>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="sc-autocomplete-footer">
                <div className="sc-autocomplete-hint">
                    <span className="sc-autocomplete-key">↑↓</span>
                    <span>Navigate</span>
                </div>
                <div className="sc-autocomplete-hint">
                    <span className="sc-autocomplete-key">Enter</span>
                    <span>Select</span>
                </div>
                <div className="sc-autocomplete-hint">
                    <span className="sc-autocomplete-key">Esc</span>
                    <span>Close</span>
                </div>
            </div>
        </div>
    );
};
