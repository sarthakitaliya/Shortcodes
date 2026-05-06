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
    theme?: 'light' | 'dark';
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
    items,
    position,
    selectedIndex,
    query,
    onSelect,
    onClose,
    onNavigate,
    theme = 'light',
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
        y: Math.min(position.y, window.innerHeight - 340),
    };

    const isDark = theme === 'dark';
    const surfaceStyle = isDark
        ? {
            background: '#0f172a',
            border: '1px solid #1e293b',
            color: '#e2e8f0',
            WebkitTextFillColor: '#e2e8f0',
            colorScheme: 'dark' as const,
        }
        : {
            color: '#111827',
            WebkitTextFillColor: '#111827',
            colorScheme: 'light' as const,
        };

    if (items.length === 0) {
        return (
            <div
                className={`sc-autocomplete ${theme}`}
                style={{
                    left: `${adjustedPosition.x}px`,
                    top: `${adjustedPosition.y}px`,
                    ...surfaceStyle,
                }}
            >
                <div
                    className="sc-autocomplete-empty"
                    style={{
                        color: isDark ? '#cbd5e1' : '#9ca3af',
                        WebkitTextFillColor: isDark ? '#cbd5e1' : '#9ca3af',
                    }}
                >
                    No matches for <span
                        className="sc-autocomplete-query-text"
                        style={{
                            color: isDark ? '#f8fafc' : '#4b5563',
                            WebkitTextFillColor: isDark ? '#f8fafc' : '#4b5563',
                        }}
                    >{query}</span>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`sc-autocomplete ${theme}`}
            style={{
                left: `${adjustedPosition.x}px`,
                top: `${adjustedPosition.y}px`,
                ...surfaceStyle,
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div
                className="sc-autocomplete-header"
                style={{
                    background: isDark ? '#0f172a' : '#ffffff',
                    borderBottomColor: isDark ? '#1e293b' : '#f3f4f6',
                }}
            >
                <span
                    className="sc-autocomplete-query"
                    style={{
                        color: isDark ? '#94a3b8' : '#9ca3af',
                        WebkitTextFillColor: isDark ? '#94a3b8' : '#9ca3af',
                    }}
                >
                    Suggestions for <span
                        className="sc-autocomplete-query-text"
                        style={{
                            color: isDark ? '#f8fafc' : '#374151',
                            WebkitTextFillColor: isDark ? '#f8fafc' : '#374151',
                        }}
                    >{query}</span>
                </span>
            </div>

            {/* List */}
            <div ref={listRef} className="sc-autocomplete-list">
                {items.map((item, index) => (
                    <div
                        key={item.shortcode}
                        ref={index === selectedIndex ? selectedRef : null}
                        className={`sc-autocomplete-item ${index === selectedIndex ? 'selected' : ''}`}
                        style={{
                            background: index === selectedIndex
                                ? (isDark ? '#1e293b' : '#f3f4f6')
                                : 'transparent',
                            color: isDark ? '#e2e8f0' : '#111827',
                            WebkitTextFillColor: isDark ? '#e2e8f0' : '#111827',
                        }}
                        onClick={() => onSelect(item)}
                        onMouseEnter={() => { }} // Could add hover selection
                    >
                        {/* Preview */}
                        <div
                            className="sc-autocomplete-emoji"
                            style={{
                                background: isDark ? '#1e293b' : '#ffffff',
                                borderColor: isDark ? '#334155' : '#e5e7eb',
                                color: isDark ? '#f8fafc' : '#374151',
                                WebkitTextFillColor: isDark ? '#f8fafc' : '#374151',
                            }}
                        >
                            {item.type === 'emoji' ? item.value :
                                item.type === 'link' ? <Favicon url={item.value} /> :
                                    item.type === 'template' ? <ClipboardList size={18} /> : <FileText size={18} />}
                        </div>

                        {/* Info */}
                        <div className="sc-autocomplete-info">
                            <div
                                className="sc-autocomplete-shortcode"
                                style={{
                                    color: isDark ? '#e2e8f0' : '#111827',
                                    WebkitTextFillColor: isDark ? '#e2e8f0' : '#111827',
                                }}
                            >
                                {item.shortcode}
                            </div>
                            {item.description && (
                                <div
                                    className="sc-autocomplete-type"
                                    style={{
                                        color: isDark ? '#94a3b8' : '#9ca3af',
                                        WebkitTextFillColor: isDark ? '#94a3b8' : '#9ca3af',
                                    }}
                                >
                                    {item.description}
                                </div>
                            )}
                        </div>

                        {/* Type Badge */}
                        <span
                            className={`sc-autocomplete-type-badge ${item.type}`}
                            style={{
                                background: isDark ? '#1e293b' : '#f9fafb',
                                borderColor: isDark ? '#334155' : '#f3f4f6',
                                color: isDark ? '#cbd5e1' : '#9ca3af',
                                WebkitTextFillColor: isDark ? '#cbd5e1' : '#9ca3af',
                            }}
                        >
                            {item.type}
                        </span>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div
                className="sc-autocomplete-footer"
                style={{
                    background: isDark ? '#0f172a' : 'rgba(249, 250, 251, 0.5)',
                    borderTopColor: isDark ? '#1e293b' : '#f3f4f6',
                    color: isDark ? '#94a3b8' : '#9ca3af',
                    WebkitTextFillColor: isDark ? '#94a3b8' : '#9ca3af',
                }}
            >
                <div className="sc-autocomplete-hint">
                    <span
                        className="sc-autocomplete-key"
                        style={{
                            background: isDark ? '#1e293b' : '#ffffff',
                            borderColor: isDark ? '#334155' : '#e5e7eb',
                            color: isDark ? '#e2e8f0' : '#6b7280',
                            WebkitTextFillColor: isDark ? '#e2e8f0' : '#6b7280',
                        }}
                    >
                        ↑↓
                    </span>
                    <span>Navigate</span>
                </div>
                <div className="sc-autocomplete-hint">
                    <span
                        className="sc-autocomplete-key"
                        style={{
                            background: isDark ? '#1e293b' : '#ffffff',
                            borderColor: isDark ? '#334155' : '#e5e7eb',
                            color: isDark ? '#e2e8f0' : '#6b7280',
                            WebkitTextFillColor: isDark ? '#e2e8f0' : '#6b7280',
                        }}
                    >
                        Enter
                    </span>
                    <span>Select</span>
                </div>
                <div className="sc-autocomplete-hint">
                    <span
                        className="sc-autocomplete-key"
                        style={{
                            background: isDark ? '#1e293b' : '#ffffff',
                            borderColor: isDark ? '#334155' : '#e5e7eb',
                            color: isDark ? '#e2e8f0' : '#6b7280',
                            WebkitTextFillColor: isDark ? '#e2e8f0' : '#6b7280',
                        }}
                    >
                        Esc
                    </span>
                    <span>Close</span>
                </div>
            </div>
        </div>
    );
};
