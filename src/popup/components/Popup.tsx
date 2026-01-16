import React, { useState, useEffect } from 'react';
import { storage } from '../../lib/storage';
import { CustomAlias, UserPreferences, DEFAULT_PREFERENCES } from '../../lib/aliasTypes';
import { EMOJI_MAP, searchEmojis } from '../../data/emojis';
import { AliasForm } from './AliasForm';

type Tab = 'aliases' | 'emojis' | 'settings';

export const Popup: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('aliases');
    const [customAliases, setCustomAliases] = useState<CustomAlias[]>([]);
    const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
    const [showForm, setShowForm] = useState(false);
    const [editingAlias, setEditingAlias] = useState<CustomAlias | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Load data
    useEffect(() => {
        const loadData = async () => {
            const [aliases, prefs] = await Promise.all([
                storage.getCustomAliases(),
                storage.getPreferences(),
            ]);
            setCustomAliases(aliases);
            setPreferences(prefs);
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
                            <div key={alias.shortcode} className="alias-item">
                                <div className="alias-preview">
                                    {alias.type === 'emoji' ? alias.value :
                                        alias.type === 'link' ? '🔗' :
                                            alias.type === 'template' ? '📋' : '📝'}
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
                                        ✏️
                                    </button>
                                    <button
                                        className="alias-btn delete"
                                        onClick={() => handleDeleteAlias(alias.shortcode)}
                                    >
                                        🗑️
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
                    <div key={shortcode} className="alias-item">
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

    const renderSettingsTab = () => (
        <div className="space-y-3">
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

            <div className="mt-6 p-3 bg-gray-50 rounded-xl text-center">
                <div className="text-2xl mb-1">⚡</div>
                <div className="text-sm font-medium text-gray-700">Shortcodes v1.0.0</div>
                <div className="text-xs text-gray-400">Type :shortcode: anywhere to expand</div>
            </div>
        </div>
    );

    return (
        <div className="popup-container">
            {/* Header */}
            <div className="popup-header">
                <div className="popup-title">
                    <span>⚡</span>
                    <span>Shortcodes</span>
                </div>
                <div className="popup-subtitle">Emoji & text expansion everywhere</div>
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
                {activeTab === 'emojis' && renderEmojisTab()}
                {activeTab === 'settings' && renderSettingsTab()}
            </div>
        </div>
    );
};
