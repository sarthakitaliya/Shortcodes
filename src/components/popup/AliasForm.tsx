import React, { useState, useEffect } from 'react';
import { CustomAlias, AliasType } from '../../lib/aliasTypes';

interface AliasFormProps {
    initialValue?: CustomAlias | null;
    onSave: (alias: Omit<CustomAlias, 'createdAt' | 'updatedAt' | 'isDefault'>) => void;
    onCancel: () => void;
}

export const AliasForm: React.FC<AliasFormProps> = ({ initialValue, onSave, onCancel }) => {
    const [shortcode, setShortcode] = useState('');
    const [value, setValue] = useState('');
    const [type, setType] = useState<AliasType>('text');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (initialValue) {
            setShortcode(initialValue.shortcode);
            setValue(initialValue.value);
            setType(initialValue.type);
            setDescription(initialValue.description || '');
        }
    }, [initialValue]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Format shortcode
        let formattedShortcode = shortcode.trim().toLowerCase();
        if (!formattedShortcode.startsWith(':')) {
            formattedShortcode = ':' + formattedShortcode;
        }
        if (!formattedShortcode.endsWith(':')) {
            formattedShortcode = formattedShortcode + ':';
        }

        onSave({
            shortcode: formattedShortcode,
            value: value.trim(),
            type,
            description: description.trim() || undefined,
        });
    };

    const isValid = shortcode.trim().length > 0 && value.trim().length > 0;

    return (
        <form onSubmit={handleSubmit} className="form-container">
            <div className="form-group">
                <label className="form-label">Shortcode</label>
                <input
                    type="text"
                    className="form-input"
                    placeholder=":myalias:"
                    value={shortcode}
                    onChange={(e) => setShortcode(e.target.value)}
                    autoFocus
                />
                <div className="text-xs text-gray-400 mt-1">
                    Will auto-format to :shortcode: format
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Type</label>
                <select
                    className="form-select"
                    value={type}
                    onChange={(e) => setType(e.target.value as AliasType)}
                >
                    <option value="text">Text</option>
                    <option value="link">Link / URL</option>
                    <option value="template">Template</option>
                    <option value="variable">Variable</option>
                    <option value="emoji">Custom Emoji</option>
                </select>
                {type === 'variable' && (
                    <div className="text-xs text-gray-400 mt-2">
                        <div className="font-medium text-gray-300 mb-1">Available Variables:</div>
                        <div className="grid grid-cols-2 gap-1">
                            <span><code>:date:</code> → 2026-03-03</span>
                            <span><code>:time:</code> → 10:30 AM</span>
                            <span><code>:datetime:</code> → date + time</span>
                            <span><code>:clipboard:</code> → clipboard content</span>
                            <span><code>:year:</code> → 2026</span>
                            <span><code>:month:</code> → March</span>
                            <span><code>:day:</code> → 3</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="form-group">
                <label className="form-label">
                    {type === 'link' ? 'URL' : type === 'template' ? 'Template Content' : type === 'variable' ? 'Variables to include' : 'Replacement Value'}
                </label>
                {type === 'template' || type === 'variable' ? (
                    <textarea
                        className="form-textarea"
                        rows={4}
                        placeholder={type === 'variable' ? "e.g., Today is :date: at :time:" : "Enter your template text..."}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                    />
                ) : (
                    <input
                        type={type === 'link' ? 'url' : 'text'}
                        className="form-input"
                        placeholder={
                            type === 'link' ? 'https://example.com' :
                                type === 'emoji' ? '🎉' : 'Replacement text...'
                        }
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                    />
                )}
            </div>

            <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <input
                    type="text"
                    className="form-input"
                    placeholder="Brief description for autocomplete"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>

            <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={onCancel}>
                    Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={!isValid}>
                    {initialValue ? 'Update' : 'Create'} Alias
                </button>
            </div>
        </form>
    );
};
