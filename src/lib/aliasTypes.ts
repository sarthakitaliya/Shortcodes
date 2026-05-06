/**
 * Alias types supported by the extension
 */
export type AliasType = 'emoji' | 'text' | 'link' | 'file' | 'template' | 'variable';

/**
 * Supported variable placeholders
 */
export type VariableType = 'date' | 'time' | 'datetime' | 'clipboard' | 'year' | 'month' | 'day';

/**
 * Base alias structure
 */
export interface Alias {
    /** The shortcode trigger (e.g., ":fire:") */
    shortcode: string;
    /** The expanded value */
    value: string;
    /** Type of alias */
    type: AliasType;
    /** Whether this is a default (immutable) alias */
    isDefault: boolean;
    /** Optional description for display */
    description?: string;
    /** For files: the original filename */
    fileName?: string;
    /** For files: the file type */
    fileType?: string;
}

/**
 * Emoji alias (default, cannot be deleted)
 */
export interface EmojiAlias extends Alias {
    type: 'emoji';
    isDefault: true;
}

/**
 * Custom alias created by user
 */
export interface CustomAlias extends Alias {
    isDefault: false;
    /** When the alias was created */
    createdAt: number;
    /** When the alias was last modified */
    updatedAt: number;
}

/**
 * User preferences
 */
export interface UserPreferences {
    /** Enable/disable the extension globally */
    enabled: boolean;
    /** Show autocomplete popup */
    showAutocomplete: boolean;
    /** Trigger characters (default: space, enter, tab) */
    triggerKeys: ('space' | 'enter' | 'tab')[];
    /** Maximum autocomplete suggestions */
    maxSuggestions: number;
    /** Theme mode: 'light' | 'dark' | 'system' */
    theme: 'light' | 'dark' | 'system';
}

/**
 * Storage schema
 */
export interface StorageSchema {
    /** Custom aliases created by user */
    customAliases: CustomAlias[];
    /** User overrides for default emoji aliases */
    emojiOverrides: Record<string, string>;
    /** User preferences */
    preferences: UserPreferences;
    /** Recently used shortcodes */
    recentAliases: string[];
}

/**
 * Default preferences
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
    enabled: true,
    showAutocomplete: true,
    triggerKeys: ['space', 'enter', 'tab'],
    maxSuggestions: 8,
    theme: 'system',
};
