/**
 * Content Script Entry Point
 * Injects into all pages and handles shortcode expansion
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Autocomplete } from './components/Autocomplete';
import { searchEmojis, getEmoji } from '../data/emojis';
import { storage } from '../lib/storage';
import { AliasType, CustomAlias, UserPreferences, DEFAULT_PREFERENCES } from '../lib/aliasTypes';
import { TextReplacer } from './TextReplacer';
import '../styles/content.css';

interface AutocompleteItem {
    shortcode: string;
    value: string;
    type: AliasType;
    description?: string;
}

const App: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const [items, setItems] = useState<AutocompleteItem[]>([]);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [query, setQuery] = useState('');
    const [customAliases, setCustomAliases] = useState<CustomAlias[]>([]);
    const [emojiOverrides, setEmojiOverrides] = useState<Record<string, string>>({});
    const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);

    const replacerRef = useRef<TextReplacer>(new TextReplacer());
    const activeElementRef = useRef<HTMLElement | null>(null);

    // Store latest state in refs so event handlers always have fresh values
    const stateRef = useRef({ customAliases, emojiOverrides, preferences });
    stateRef.current = { customAliases, emojiOverrides, preferences };

    console.log('[Shortcodes] App rendered, visible:', visible);

    // Load custom aliases, overrides, and preferences
    useEffect(() => {
        const loadData = async () => {
            try {
                const [aliases, overrides, prefs] = await Promise.all([
                    storage.getCustomAliases(),
                    storage.getEmojiOverrides(),
                    storage.getPreferences(),
                ]);
                setCustomAliases(aliases);
                setEmojiOverrides(overrides);
                setPreferences(prefs);
                console.log('[Shortcodes] Loaded', aliases.length, 'aliases, enabled:', prefs.enabled);
            } catch (err) {
                console.error('[Shortcodes] Error loading data:', err);
            }
        };
        loadData();

        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
            if (changes.customAliases) {
                setCustomAliases(changes.customAliases.newValue || []);
            }
            if (changes.emojiOverrides) {
                setEmojiOverrides(changes.emojiOverrides.newValue || {});
            }
            if (changes.preferences) {
                setPreferences({ ...DEFAULT_PREFERENCES, ...changes.preferences.newValue });
                console.log('[Shortcodes] Preferences updated:', changes.preferences.newValue);
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }, []);

    // Search for matching aliases - uses current state from ref
    const doSearch = (pattern: string): AutocompleteItem[] => {
        const { customAliases, emojiOverrides } = stateRef.current;
        const results: AutocompleteItem[] = [];
        const searchTerm = pattern.toLowerCase().replace(/^:/, '');

        // Search emojis
        const emojiResults = searchEmojis(searchTerm, 20);
        for (const { shortcode, emoji } of emojiResults) {
            const value = emojiOverrides[shortcode] || emoji;
            results.push({ shortcode, value, type: 'emoji' });
        }

        // Search custom aliases
        for (const alias of customAliases) {
            if (alias.shortcode.toLowerCase().includes(searchTerm)) {
                results.push({
                    shortcode: alias.shortcode,
                    value: alias.value,
                    type: alias.type,
                    description: alias.description,
                });
            }
        }

        return results.slice(0, 8);
    };

    // Stable input handler that uses refs
    const handleInputEvent = useCallback((e: Event) => {
        const { preferences } = stateRef.current;

        // Check if extension is enabled
        if (!preferences.enabled) {
            return;
        }

        const target = e.target as HTMLElement;
        activeElementRef.current = target;

        const { pattern, position } = replacerRef.current.detectPattern(target);
        console.log('[Shortcodes] handleInput - pattern:', pattern);

        if (!pattern || pattern.length < 2) {
            setVisible(false);
            setItems([]);
            setQuery('');
            return;
        }

        // Check if autocomplete should be shown
        if (!preferences.showAutocomplete) {
            return;
        }

        const matches = doSearch(pattern).slice(0, preferences.maxSuggestions);
        console.log('[Shortcodes] Found', matches.length, 'matches');

        if (matches.length === 0) {
            setVisible(false);
            setItems([]);
            return;
        }

        setItems(matches);
        setPosition(position);
        setQuery(pattern);
        setSelectedIndex(0);
        setVisible(true);
    }, []); // No deps - uses refs for fresh state

    // Stable keydown handler
    const handleKeyDownEvent = useCallback((e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const { customAliases, emojiOverrides, preferences } = stateRef.current;

        // Check if extension is enabled
        if (!preferences.enabled) {
            return;
        }

        if (e.key === ' ' || e.key === 'Enter' || e.key === 'Tab') {
            const { pattern } = replacerRef.current.detectPattern(target);

            if (pattern) {
                const fullShortcode = pattern.endsWith(':') ? pattern : `${pattern}:`;

                // Check emoji
                const emoji = getEmoji(fullShortcode);
                if (emoji) {
                    e.preventDefault();
                    replacerRef.current.replacePattern(target, emojiOverrides[fullShortcode] || emoji);
                    setVisible(false);
                    setItems([]);
                    console.log('[Shortcodes] Replaced with:', emoji);
                    return;
                }

                // Check custom aliases
                const alias = customAliases.find(a => a.shortcode === fullShortcode);
                if (alias) {
                    e.preventDefault();
                    replacerRef.current.replacePattern(target, alias.value);
                    setVisible(false);
                    setItems([]);
                    console.log('[Shortcodes] Replaced with alias:', alias.value);
                }
            }
        }
    }, []); // No deps - uses refs

    const handleFocusOutEvent = useCallback(() => {
        setTimeout(() => {
            setVisible(false);
            setItems([]);
        }, 200);
    }, []);

    // Handle keyup for backspace detection
    const handleKeyUpEvent = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
            const target = e.target as HTMLElement;
            const { pattern } = replacerRef.current.detectPattern(target);
            console.log('[Shortcodes] Keyup - pattern after backspace:', pattern);
            if (!pattern || pattern.length < 2) {
                setVisible(false);
                setItems([]);
            }
        }
    }, []);

    // Handle autocomplete selection
    const handleSelect = useCallback((item: AutocompleteItem) => {
        if (activeElementRef.current) {
            replacerRef.current.replacePattern(activeElementRef.current, item.value);
        }
        setVisible(false);
        setItems([]);
    }, []);

    // Handle navigation
    const handleNavigate = useCallback((direction: 'up' | 'down') => {
        setSelectedIndex(prev => {
            if (direction === 'up') {
                return prev > 0 ? prev - 1 : items.length - 1;
            } else {
                return prev < items.length - 1 ? prev + 1 : 0;
            }
        });
    }, [items.length]);

    // Attach event listeners - runs once on mount
    useEffect(() => {
        const attachedElements = new Set<HTMLElement>();

        const attachToElement = (el: HTMLElement) => {
            if (attachedElements.has(el)) return;
            attachedElements.add(el);
            el.addEventListener('input', handleInputEvent);
            el.addEventListener('keydown', handleKeyDownEvent as EventListener);
            el.addEventListener('keyup', handleKeyUpEvent as EventListener);
            el.addEventListener('focusout', handleFocusOutEvent);
        };

        const attachToInputsIn = (root: Element) => {
            const inputs = root.querySelectorAll<HTMLElement>(
                'input[type="text"], input[type="search"], input:not([type]), textarea, [contenteditable="true"]'
            );
            inputs.forEach(attachToElement);
        };

        attachToInputsIn(document.body);

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node instanceof HTMLElement) {
                        attachToInputsIn(node);
                        if (node.matches?.('input[type="text"], input[type="search"], input:not([type]), textarea, [contenteditable="true"]')) {
                            attachToElement(node);
                        }
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        console.log('[Shortcodes] Event listeners attached');

        return () => {
            observer.disconnect();
            attachedElements.forEach(el => {
                el.removeEventListener('input', handleInputEvent);
                el.removeEventListener('keydown', handleKeyDownEvent as EventListener);
                el.removeEventListener('keyup', handleKeyUpEvent as EventListener);
                el.removeEventListener('focusout', handleFocusOutEvent);
            });
        };
    }, [handleInputEvent, handleKeyDownEvent, handleKeyUpEvent, handleFocusOutEvent]);

    if (!visible) return null;

    return (
        <Autocomplete
            items={items}
            position={position}
            selectedIndex={selectedIndex}
            query={query}
            onSelect={handleSelect}
            onClose={() => { setVisible(false); setItems([]); }}
            onNavigate={handleNavigate}
        />
    );
};

// Initialize content script
function init() {
    const container = document.createElement('div');
    container.id = 'shortcodes-autocomplete-root';
    document.body.appendChild(container);

    const root = createRoot(container);
    root.render(<App />);

    console.log('[Shortcodes] Extension initialized');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
