import React, { useState, useEffect } from 'react';
import { FileText, ClipboardList, Pencil, Trash2, Clock, Sun, Moon } from 'lucide-react';
import { storage } from '../../lib/storage';
import { CustomAlias, UserPreferences, DEFAULT_PREFERENCES } from '../../lib/aliasTypes';
import { EMOJI_MAP, searchEmojis, getEmoji } from '../../data/emojis';
import { AliasForm } from './AliasForm';
import { Favicon } from '../Favicon';

type Tab = 'aliases' | 'recent' | 'emojis' | 'settings';

export const Popup: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('aliases');
    const [customAliases, setCustomAliases] = useState<CustomAlias[]>([]);
    const [recentShortcodes, setRecentShortcodes] = useState<string[]>([]);
    const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
    const [showForm, setShowForm] = useState(false);
    const [editingAlias, setEditingAlias] = useState<CustomAlias | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Determine effective theme
    const getEffectiveTheme = () => {
        if (preferences.theme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return preferences.theme;
    };
    const effectiveTheme = getEffectiveTheme();

    // Toggle theme
    const toggleTheme = async () => {
        const newTheme = effectiveTheme === 'dark' ? 'light' : 'dark';
        await handlePreferenceChange('theme', newTheme);
    };

    // Load data
    useEffect(() => {
        const loadData = async () => {
            const [aliases, prefs, recent] = await Promise.all([
                storage.getCustomAliases(),
                storage.getPreferences(),
                storage.getRecentAliases(),
            ]);
            setCustomAliases(aliases);
            setPreferences(prefs);
            setRecentShortcodes(recent);
        };
        loadData();
    }, []);

    // Handle alias save
    const handleSaveAlias = async (alias: Omit<CustomAlias, 'createdAt' | 'updatedAt' | 'isDefault'>) => {
        await storage.addCustomAlias(alias);
        const aliases = await storage.getCustomAliases();
        setCustomAliases(aliases);
        setShowForm(false);
        setEditingAlias(null);
    };

    // Handle alias delete
    const handleDeleteAlias = async (shortcode: string) => {
        await storage.deleteCustomAlias(shortcode);
        const aliases = await storage.getCustomAliases();
        setCustomAliases(aliases);
    };

    // Handle preference change
    const handlePreferenceChange = async (key: keyof UserPreferences, value: unknown) => {
        const updated = await storage.setPreferences({ [key]: value });
        setPreferences(updated);
    };

    // Filter aliases by search
    const filteredAliases = customAliases.filter(alias =>
        alias.shortcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alias.value.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get emoji results for emoji tab
    const emojiResults = activeTab === 'emojis'
        ? searchEmojis(searchQuery || ':', 50)
        : [];

    const renderAliasesTab = () => {
        if (showForm) {
            return (
                <AliasForm
                    initialValue={editingAlias}
                    onSave={handleSaveAlias}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingAlias(null);
                    }}
                />
            );
        }

        return (
            <>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search aliases..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                {filteredAliases.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📝</div>
                        <div className="empty-title">No custom aliases yet</div>
                        <div className="empty-desc">Create one to get started!</div>
                    </div>
                ) : (
                    <div className="alias-list">
                        {filteredAliases.map(alias => (
                            <div key={alias.shortcode} className="alias-item group">
                                <div className="alias-preview">
                                    {alias.type === 'emoji' ? alias.value :
                                        alias.type === 'link' ? <Favicon url={alias.value} /> :
                                            alias.type === 'template' ? <ClipboardList size={18} /> : alias.type === 'variable' ? <Clock size={18} /> : <FileText size={18} />}
                                </div>
                                <div className="alias-info">
                                    <div className="alias-shortcode">{alias.shortcode}</div>
                                    <div className="alias-value">{alias.value.substring(0, 40)}...</div>
                                </div>
                                <span className={`type-badge ${alias.type}`}>{alias.type}</span>
                                <div className="alias-actions">
                                    <button
                                        className="alias-btn"
                                        onClick={() => {
                                            setEditingAlias(alias);
                                            setShowForm(true);
                                        }}
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        className="alias-btn delete"
                                        onClick={() => handleDeleteAlias(alias.shortcode)}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <button className="add-btn" onClick={() => setShowForm(true)}>
                    + Add Custom Alias
                </button>
            </>
        );
    };

    const renderEmojisTab = () => (
        <>
            <input
                type="text"
                className="search-input"
                placeholder="Search emojis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="text-xs text-gray-400 mb-3">
                {Object.keys(EMOJI_MAP).length} emojis available
            </div>

            <div className="alias-list">
                {emojiResults.map(({ shortcode, emoji }) => (
                    <div key={shortcode} className="alias-item group">
                        <div className="alias-preview">{emoji}</div>
                        <div className="alias-info">
                            <div className="alias-shortcode">{shortcode}</div>
                        </div>
                        <span className="type-badge emoji">default</span>
                    </div>
                ))}
            </div>
        </>
    );

    // Get recent aliases with their full data
    const getRecentAliases = () => {
        return recentShortcodes.map(shortcode => {
            // Check custom aliases first
            const custom = customAliases.find(a => a.shortcode === shortcode);
            if (custom) return custom;
            // Check variable aliases (like :date:, :time:, etc.)
            if (shortcode.startsWith(':') && shortcode.endsWith(':')) {
                const description = getVariableDescription(shortcode);
                if (description) return { shortcode, value: '', type: 'variable' as const, isDefault: true, description };
            }
            // Check emojis
            const emoji = getEmoji(shortcode);
            if (emoji) return { shortcode, value: emoji, type: 'emoji' as const, isDefault: true };
            return null;
        }).filter(Boolean) as (CustomAlias | { shortcode: string; value: string; type: 'emoji' | 'variable'; isDefault: true; description?: string })[];
    };

    // Get description for variable aliases
    const getVariableDescription = (shortcode: string): string | null => {
        const descriptions: Record<string, string> = {
            ':date:': 'Current date (YYYY-MM-DD)',
            ':time:': 'Current time',
            ':datetime:': 'Current date and time',
            ':year:': 'Current year',
            ':month:': 'Current month name',
            ':day:': 'Current day',
        };
        return descriptions[shortcode] || null;
    };

    const renderRecentTab = () => {
        const recentAliases = getRecentAliases();

        if (recentAliases.length === 0) {
            return (
                <div className="empty-state">
                    <div className="empty-icon"><Clock size={32} /></div>
                    <div className="empty-title">No recent aliases</div>
                    <div className="empty-desc">Use some aliases to see them here!</div>
                </div>
            );
        }

        return (
            <div className="alias-list">
                {recentAliases.map((alias) => (
                    <div key={alias.shortcode} className="alias-item group">
                        <div className="alias-preview">
                            {alias.type === 'emoji' ? alias.value :
                                alias.type === 'link' ? <Favicon url={alias.value} /> :
                                    alias.type === 'template' ? <ClipboardList size={18} /> :
                                        alias.type === 'variable' ? <Clock size={18} /> : <FileText size={18} />}
                        </div>
                        <div className="alias-info">
                            <div className="alias-shortcode">{alias.shortcode}</div>
                            <div className="alias-value">
                                {alias.type === 'variable' ? alias.description :
                                    alias.value ? `${alias.value.substring(0, 40)}...` : ''}
                            </div>
                        </div>
                        <span className={`type-badge ${alias.type}`}>
                                {alias.type === 'variable' ? 'variable' : alias.isDefault ? 'default' : alias.type}
                            </span>
                    </div>
                ))}
            </div>
        );
    };

    const renderSettingsTab = () => (
        <div className="space-y-3">
            <div className="section-title">Global</div>
            <div className="toggle-container">
                <div className="toggle-info">
                    <div className="toggle-label">Enable Extension</div>
                    <div className="toggle-desc">Toggle shortcode expansion globally</div>
                </div>
                <div
                    className={`toggle-switch ${preferences.enabled ? 'active' : ''}`}
                    onClick={() => handlePreferenceChange('enabled', !preferences.enabled)}
                />
            </div>

            <div className="toggle-container">
                <div className="toggle-info">
                    <div className="toggle-label">Show Autocomplete</div>
                    <div className="toggle-desc">Display suggestion popup while typing</div>
                </div>
                <div
                    className={`toggle-switch ${preferences.showAutocomplete ? 'active' : ''}`}
                    onClick={() => handlePreferenceChange('showAutocomplete', !preferences.showAutocomplete)}
                />
            </div>

            <div className="section-title">Preferences</div>
            <div className="form-group">
                <label className="form-label">Max Suggestions</label>
                <select
                    className="form-select"
                    value={preferences.maxSuggestions}
                    onChange={(e) => handlePreferenceChange('maxSuggestions', parseInt(e.target.value))}
                >
                    <option value={5}>5</option>
                    <option value={8}>8</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                </select>
            </div>

        </div>
    );

    return (
        <div className={`popup-container ${effectiveTheme}`} data-theme={effectiveTheme}>
            {/* Header */}
            <div className="popup-header">
                <div className="popup-title">
                    <span>Shortcodes</span>
                </div>
                <div className="popup-subtitle">Emoji & text expansion everywhere</div>
                <button
                    className="theme-toggle"
                    onClick={toggleTheme}
                    title={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {effectiveTheme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                </button>
            </div>

            {/* Tabs */}
            <div className="popup-tabs">
                <div
                    className={`popup-tab ${activeTab === 'aliases' ? 'active' : ''}`}
                    onClick={() => setActiveTab('aliases')}
                >
                    Custom
                </div>
                <div
                    className={`popup-tab ${activeTab === 'recent' ? 'active' : ''}`}
                    onClick={() => setActiveTab('recent')}
                >
                    Recent
                </div>
                <div
                    className={`popup-tab ${activeTab === 'emojis' ? 'active' : ''}`}
                    onClick={() => setActiveTab('emojis')}
                >
                    Emojis
                </div>
                <div
                    className={`popup-tab ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    Settings
                </div>
            </div>

            {/* Content */}
            <div className="popup-content">
                {activeTab === 'aliases' && renderAliasesTab()}
                {activeTab === 'recent' && renderRecentTab()}
                {activeTab === 'emojis' && renderEmojisTab()}
                {activeTab === 'settings' && renderSettingsTab()}
            </div>
        </div>
    );
};
