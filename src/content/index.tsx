/**
 * Content Script Entry Point
 * Injects into all pages and handles shortcode expansion
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Autocomplete } from '../components/content/Autocomplete';
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

    // Unified suggestion update logic
    const updateSuggestions = useCallback((target: HTMLElement) => {
        const { preferences } = stateRef.current;
        console.log('[Shortcodes] updateSuggestions called, enabled:', preferences.enabled, 'showAutocomplete:', preferences.showAutocomplete);

        if (!preferences.enabled) {
            console.log('[Shortcodes] Extension disabled, returning');
            return;
        }

        activeElementRef.current = target;
        const { pattern, position } = replacerRef.current.detectPattern(target);
        console.log('[Shortcodes] Detected pattern:', pattern);

        if (!pattern || pattern.length < 2) {
            setVisible(false);
            setItems([]);
            setQuery('');
            return;
        }

        if (!preferences.showAutocomplete) {
            console.log('[Shortcodes] Autocomplete disabled in preferences');
            return;
        }

        const matches = doSearch(pattern).slice(0, preferences.maxSuggestions);
        console.log('[Shortcodes] Found', matches.length, 'matches for', pattern);

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
        console.log('[Shortcodes] Showing dropdown with', matches.length, 'items');
    }, []);

    // Stable input handler - use requestAnimationFrame to ensure DOM is updated
    const handleInputEvent = useCallback((e: Event) => {
        const target = e.target as HTMLElement;
        // Use requestAnimationFrame for reliable DOM sync (fixes Cmd+Delete, Cmd+A+Delete, etc.)
        requestAnimationFrame(() => {
            updateSuggestions(target);
        });
    }, [updateSuggestions]);

    // Stable keydown handler
    const handleKeyDownEvent = useCallback((e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const { customAliases, emojiOverrides, preferences } = stateRef.current;

        // Check if extension is enabled
        if (!preferences.enabled) {
            console.log('[Shortcodes] Extension disabled, skipping keydown');
            return;
        }

        // Handle Cmd+Delete/Backspace (Mac) or Ctrl+Delete/Backspace (Windows/Linux)
        // These may not fire input events reliably
        if ((e.metaKey || e.ctrlKey) && (e.key === 'Backspace' || e.key === 'Delete')) {
            // Schedule update after the deletion happens
            setTimeout(() => {
                requestAnimationFrame(() => updateSuggestions(target));
            }, 10);
            return;
        }

        if (e.key === ' ' || e.key === 'Enter' || e.key === 'Tab') {
            const { pattern } = replacerRef.current.detectPattern(target);
            console.log('[Shortcodes] Keydown trigger - pattern:', pattern);

            if (pattern) {
                const fullShortcode = pattern.endsWith(':') ? pattern : `${pattern}:`;
                console.log('[Shortcodes] Looking for shortcode:', fullShortcode);

                // Check emoji
                const emoji = getEmoji(fullShortcode);
                console.log('[Shortcodes] Emoji lookup result:', emoji);

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
    }, [updateSuggestions]); // Added updateSuggestions dependency

    const handleFocusOutEvent = useCallback(() => {
        setTimeout(() => {
            setVisible(false);
            setItems([]);
        }, 200);
    }, []);

    // Handle keyup for any potential text modification
    const handleKeyUpEvent = useCallback((e: KeyboardEvent) => {
        // Re-check on Backspace, Delete, or if Cmd/Ctrl was held (for Cmd+Delete, Ctrl+Backspace, etc.)
        if (e.key === 'Backspace' || e.key === 'Delete' || e.metaKey || e.ctrlKey) {
            setTimeout(() => updateSuggestions(e.target as HTMLElement), 0);
        }
    }, [updateSuggestions]);

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
                'input[type="text"], input[type="search"], input:not([type]), textarea, [contenteditable="true"], [role="textbox"]'
            );
            inputs.forEach(attachToElement);
        };

        attachToInputsIn(document.body);

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node instanceof HTMLElement) {
                            attachToInputsIn(node);
                            if (node.matches?.('input[type="text"], input[type="search"], input:not([type]), textarea, [contenteditable="true"], [role="textbox"]')) {
                                attachToElement(node);
                            }
                        }
                    }
                } else if (mutation.type === 'attributes') {
                    const target = mutation.target as HTMLElement;
                    if (target.matches?.('input[type="text"], input[type="search"], input:not([type]), textarea, [contenteditable="true"], [role="textbox"]')) {
                        attachToElement(target);
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['contenteditable', 'role']
        });
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
