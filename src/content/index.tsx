import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Autocomplete } from '../components/content/Autocomplete';
import { ClipboardPreview } from '../components/content/ClipboardPreview';
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

// Built-in variable aliases (work directly without creating custom alias)
const VARIABLE_ALIASES: { shortcode: string; description: string }[] = [
    { shortcode: ':date:', description: 'Current date (YYYY-MM-DD)' },
    { shortcode: ':time:', description: 'Current time' },
    { shortcode: ':datetime:', description: 'Current date and time' },
    { shortcode: ':year:', description: 'Current year' },
    { shortcode: ':month:', description: 'Current month name' },
    { shortcode: ':day:', description: 'Current day' },
    // { shortcode: ':clipboard:', description: 'Clipboard content' },
];

/**
 * Resolve variable aliases directly (no custom alias needed)
 */
async function resolveVariableAlias(shortcode: string): Promise<string | null> {
    const now = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    switch (shortcode) {
        case ':date:':
            return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        case ':time:':
            return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        case ':datetime:':
            return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        case ':year:':
            return now.getFullYear().toString();
        case ':month:':
            return months[now.getMonth()];
        case ':day:':
            return now.getDate().toString();
        case ':clipboard:':
            try {
                const text = await navigator.clipboard.readText();
                return text;
            } catch (err) {
                return '[clipboard denied]';
            }
        default:
            return null;
    }
}

/**
 * Get clipboard content (for preview)
 */
async function getClipboardContent(): Promise<string> {
    try {
        return await navigator.clipboard.readText();
    } catch {
        return '';
    }
}

/**
 * Resolve variable placeholders in a value
 * Supports: :date:, :time:, :datetime:, :clipboard:, :year:, :month:, :day:
 */
async function resolveVariables(value: string): Promise<string> {
    const now = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const date = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const year = now.getFullYear().toString();
    const month = months[now.getMonth()];
    const day = now.getDate().toString();

    let result = value;
    result = result.replace(/:date:/g, date);
    result = result.replace(/:time:/g, time);
    result = result.replace(/:datetime:/g, date + ' ' + time);
    result = result.replace(/:year:/g, year);
    result = result.replace(/:month:/g, month);
    result = result.replace(/:day:/g, day);

    // Handle clipboard - must be async
    if (result.includes(':clipboard:')) {
        try {
            const clipboardText = await navigator.clipboard.readText();
            result = result.replace(/:clipboard:/g, clipboardText);
        } catch {
            result = result.replace(/:clipboard:/g, '');
        }
    }

    return result;
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

    // Clipboard preview state
    const [showClipboardPreview, setShowClipboardPreview] = useState(false);
    const [clipboardContent, setClipboardContent] = useState('');
    const [clipboardPreviewPosition, setClipboardPreviewPosition] = useState({ x: 0, y: 0 });
    const [clipboardShortcode, setClipboardShortcode] = useState('');

    // Determine effective theme
    const getEffectiveTheme = () => {
        if (preferences.theme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return preferences.theme;
    };
    const effectiveTheme = getEffectiveTheme();

    const replacerRef = useRef<TextReplacer>(new TextReplacer());
    const activeElementRef = useRef<HTMLElement | null>(null);
    const replaceCooldownRef = useRef(false);

    // Store latest state in refs so event handlers always have fresh values
    const stateRef = useRef({ customAliases, emojiOverrides, preferences });
    stateRef.current = { customAliases, emojiOverrides, preferences };

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
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }, []);

    // Search for matching aliases - uses current state from ref
    // If searchTerm is empty (just ":"), return all aliases
    const doSearch = (pattern: string): AutocompleteItem[] => {
        const { customAliases, emojiOverrides } = stateRef.current;
        const results: AutocompleteItem[] = [];
        const searchTerm = pattern.toLowerCase().replace(/^:/, '');

        // If no search term (just ":"), show all custom aliases + variable aliases
        if (!searchTerm) {
            // Add variable aliases
            for (const va of VARIABLE_ALIASES) {
                results.push({
                    shortcode: va.shortcode,
                    value: '',
                    type: 'variable',
                    description: va.description,
                });
            }
            // Add custom aliases
            for (const alias of customAliases) {
                results.push({
                    shortcode: alias.shortcode,
                    value: alias.value,
                    type: alias.type,
                    description: alias.description,
                });
            }
            return results.slice(0, 8);
        }

        // Search custom aliases FIRST (prioritize user aliases over emojis)
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

        // Then search variable aliases
        for (const va of VARIABLE_ALIASES) {
            if (va.shortcode.toLowerCase().includes(searchTerm) && !results.some(r => r.shortcode === va.shortcode)) {
                results.push({
                    shortcode: va.shortcode,
                    value: '',
                    type: 'variable',
                    description: va.description,
                });
            }
        }

        // Then search emojis
        const emojiResults = searchEmojis(searchTerm, 20);
        for (const { shortcode, emoji } of emojiResults) {
            // Skip if we already have this shortcode from custom aliases
            if (!results.some(r => r.shortcode.toLowerCase() === shortcode.toLowerCase())) {
                const value = emojiOverrides[shortcode] || emoji;
                results.push({ shortcode, value, type: 'emoji' });
            }
        }

        return results.slice(0, 8);
    };

    // Unified suggestion update logic
    const updateSuggestions = useCallback((target: HTMLElement) => {
        const { preferences } = stateRef.current;

        if (!preferences.enabled) {
            return;
        }

        // Hide clipboard preview when updating suggestions
        setShowClipboardPreview(false);

        // Skip if we just replaced a pattern (prevents infinite loop on ChatGPT)
        if (replaceCooldownRef.current) {
            setTimeout(() => { replaceCooldownRef.current = false; }, 100);
            return;
        }

        activeElementRef.current = target;
        const { pattern, position } = replacerRef.current.detectPattern(target);

        if (!pattern || (pattern.length < 2 && pattern !== ':')) {
            setVisible(false);
            setItems([]);
            setQuery('');
            return;
        }

        if (!preferences.showAutocomplete) {
            return;
        }

        const matches = doSearch(pattern).slice(0, preferences.maxSuggestions);

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
    const handleKeyDownEvent = useCallback(async (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const { customAliases, emojiOverrides, preferences } = stateRef.current;

        // Check if extension is enabled
        if (!preferences.enabled) {
            return;
        }

        // Handle clipboard preview keyboard events
        if (showClipboardPreview) {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Confirm clipboard insertion
                if (activeElementRef.current && clipboardContent) {
                    replacerRef.current.replacePattern(activeElementRef.current, clipboardContent);
                }
                setShowClipboardPreview(false);
                setVisible(false);
                setItems([]);
                return;
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setShowClipboardPreview(false);
                return;
            }
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

            // Skip replacement when pattern is just ":" - let autocomplete handle selection
            if (!pattern || pattern === ':') {
                return;
            }

            // Skip if clipboard preview is showing - let it handle the Enter key
            if (showClipboardPreview) {
                return;
            }

            if (pattern) {
                const fullShortcode = pattern.endsWith(':') ? pattern : `${pattern}:`;

                // Check emoji
                const emoji = getEmoji(fullShortcode);

                if (emoji) {
                    e.preventDefault();
                    replaceCooldownRef.current = true;
                    replacerRef.current.replacePattern(target, emojiOverrides[fullShortcode] || emoji);
                    setVisible(false);
                    setItems([]);
                    storage.addToRecentAliases(fullShortcode);
                    return;
                }

                // Check variable aliases (built-in)
                const resolvedValue = await resolveVariableAlias(fullShortcode);
                if (resolvedValue !== null) {
                    // For clipboard, show preview instead of directly inserting
                    if (fullShortcode === ':clipboard:') {
                        e.preventDefault();
                        // Get clipboard content for preview
                        const clipboard = await getClipboardContent();
                        setClipboardContent(clipboard);
                        setClipboardPreviewPosition(position);
                        setClipboardShortcode(fullShortcode);
                        setShowClipboardPreview(true);
                        return;
                    }

                    e.preventDefault();
                    replaceCooldownRef.current = true;
                    replacerRef.current.replacePattern(target, resolvedValue);
                    setVisible(false);
                    setItems([]);
                    storage.addToRecentAliases(fullShortcode);
                    return;
                }

                // Check custom aliases
                const alias = customAliases.find(a => a.shortcode === fullShortcode);
                if (alias) {
                    e.preventDefault();
                    // Check if this is a clipboard type alias
                    if (alias.type === 'variable' && alias.value === ':clipboard:') {
                        const clipboard = await getClipboardContent();
                        setClipboardContent(clipboard);
                        setClipboardPreviewPosition(position);
                        setClipboardShortcode(alias.shortcode);
                        setShowClipboardPreview(true);
                        return;
                    }

                    // Resolve variables in the value
                    const customResolvedValue = await resolveVariables(alias.value);
                    replaceCooldownRef.current = true;
                    replacerRef.current.replacePattern(target, customResolvedValue);
                    setVisible(false);
                    setItems([]);
                    // Track to recent aliases
                    storage.addToRecentAliases(alias.shortcode);
                }
            }
        }
    }, [updateSuggestions, showClipboardPreview, clipboardContent, position]);

    const handleFocusOutEvent = useCallback(() => {
        setTimeout(() => {
            setVisible(false);
            setItems([]);
            setShowClipboardPreview(false);
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
    const handleSelect = useCallback(async (item: AutocompleteItem) => {
        if (activeElementRef.current) {
            let replacementValue = item.value;

            // For variable aliases, resolve them now (values are empty for variable aliases)
            if (item.type === 'variable') {
                // // For clipboard, show preview
                // if (item.shortcode === ':clipboard:') {
                //     const clipboard = await getClipboardContent();
                //     setClipboardContent(clipboard);
                //     setClipboardPreviewPosition(position);
                //     setClipboardShortcode(item.shortcode);
                //     setShowClipboardPreview(true);
                //     // Set cooldown BEFORE returning to prevent loop
                //     replaceCooldownRef.current = true;
                //     return;
                // }

                replacementValue = await resolveVariableAlias(item.shortcode) || '';
            }

            // Set cooldown BEFORE replacement so input event handler skips
            replaceCooldownRef.current = true;
            replacerRef.current.replacePattern(activeElementRef.current, replacementValue);
            storage.addToRecentAliases(item.shortcode);
        }
        setVisible(false);
        setItems([]);
    }, [position]);

    // Handle clipboard preview confirmation
    const handleClipboardConfirm = useCallback(() => {
        if (activeElementRef.current && clipboardContent) {
            replaceCooldownRef.current = true;
            replacerRef.current.replacePattern(activeElementRef.current, clipboardContent);
            if (clipboardShortcode) {
                storage.addToRecentAliases(clipboardShortcode);
            }
        }
        setShowClipboardPreview(false);
        setVisible(false);
        setItems([]);
    }, [clipboardContent, clipboardShortcode]);

    // Handle clipboard preview cancel
    const handleClipboardCancel = useCallback(() => {
        setShowClipboardPreview(false);
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
            el.addEventListener('keydown', handleKeyDownEvent as unknown as EventListener);
            el.addEventListener('keyup', handleKeyUpEvent as unknown as EventListener);
            el.addEventListener('focusout', handleFocusOutEvent);
        };

        const attachToInputsIn = (root: Element) => {
            const inputs = root.querySelectorAll<HTMLElement>(
                'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="image"]):not([type="color"]):not([type="range"]):not([type="password"]), textarea, [contenteditable="true"], [role="textbox"], [role="combobox"], [aria-multiline="true"]'
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
                            if (node.matches?.('input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="image"]):not([type="color"]):not([type="range"]):not([type="password"]), textarea, [contenteditable="true"], [role="textbox"], [role="combobox"], [aria-multiline="true"]')) {
                                attachToElement(node);
                            }
                        }
                    }
                } else if (mutation.type === 'attributes') {
                    const target = mutation.target as HTMLElement;
                    if (target.matches?.('input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="image"]):not([type="color"]):not([type="range"]):not([type="password"]), textarea, [contenteditable="true"], [role="textbox"], [role="combobox"], [aria-multiline="true"]')) {
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

        return () => {
            observer.disconnect();
            attachedElements.forEach(el => {
                el.removeEventListener('input', handleInputEvent);
                el.removeEventListener('keydown', handleKeyDownEvent as unknown as EventListener);
                el.removeEventListener('keyup', handleKeyUpEvent as unknown as EventListener);
                el.removeEventListener('focusout', handleFocusOutEvent);
            });
        };
    }, [handleInputEvent, handleKeyDownEvent, handleKeyUpEvent, handleFocusOutEvent]);

    if (!visible && !showClipboardPreview) return null;

    return (
        <>
            {visible && (
                <Autocomplete
                    items={items}
                    position={position}
                    selectedIndex={selectedIndex}
                    query={query}
                    onSelect={handleSelect}
                    onClose={() => { setVisible(false); setItems([]); }}
                    onNavigate={handleNavigate}
                    theme={effectiveTheme}
                />
            )}

            {showClipboardPreview && (
                <ClipboardPreview
                    content={clipboardContent}
                    position={clipboardPreviewPosition}
                    onConfirm={handleClipboardConfirm}
                    onCancel={handleClipboardCancel}
                    theme={effectiveTheme}
                />
            )}
        </>
    );
};

// Initialize content script
function init() {
    const container = document.createElement('div');
    container.id = 'shortcodes-autocomplete-root';
    document.body.appendChild(container);

    const root = createRoot(container);
    root.render(<App />);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
