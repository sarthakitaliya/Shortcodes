import { CustomAlias, StorageSchema, UserPreferences, DEFAULT_PREFERENCES } from './aliasTypes';

/**
 * Chrome storage wrapper for type-safe storage operations
 */
class Storage {
    private static instance: Storage;

    private constructor() { }

    static getInstance(): Storage {
        if (!Storage.instance) {
            Storage.instance = new Storage();
        }
        return Storage.instance;
    }

    /**
     * Get all custom aliases
     */
    async getCustomAliases(): Promise<CustomAlias[]> {
        const result = await chrome.storage.local.get('customAliases');
        return result.customAliases || [];
    }

    /**
     * Save custom aliases
     */
    async setCustomAliases(aliases: CustomAlias[]): Promise<void> {
        await chrome.storage.local.set({ customAliases: aliases });
    }

    /**
     * Add a new custom alias
     */
    async addCustomAlias(alias: Omit<CustomAlias, 'createdAt' | 'updatedAt' | 'isDefault'>): Promise<CustomAlias> {
        const aliases = await this.getCustomAliases();
        const now = Date.now();

        const newAlias: CustomAlias = {
            ...alias,
            isDefault: false,
            createdAt: now,
            updatedAt: now,
        };

        // Check for duplicate shortcode
        const existingIndex = aliases.findIndex(a => a.shortcode === newAlias.shortcode);
        if (existingIndex >= 0) {
            // Update existing
            aliases[existingIndex] = { ...newAlias, createdAt: aliases[existingIndex].createdAt };
        } else {
            aliases.push(newAlias);
        }

        await this.setCustomAliases(aliases);
        return newAlias;
    }

    /**
     * Update an existing custom alias
     */
    async updateCustomAlias(shortcode: string, updates: Partial<Omit<CustomAlias, 'shortcode' | 'isDefault' | 'createdAt'>>): Promise<CustomAlias | null> {
        const aliases = await this.getCustomAliases();
        const index = aliases.findIndex(a => a.shortcode === shortcode);

        if (index < 0) return null;

        aliases[index] = {
            ...aliases[index],
            ...updates,
            updatedAt: Date.now(),
        };

        await this.setCustomAliases(aliases);
        return aliases[index];
    }

    /**
     * Delete a custom alias
     */
    async deleteCustomAlias(shortcode: string): Promise<boolean> {
        const aliases = await this.getCustomAliases();
        const filtered = aliases.filter(a => a.shortcode !== shortcode);

        if (filtered.length === aliases.length) return false;

        await this.setCustomAliases(filtered);
        return true;
    }

    /**
     * Get emoji overrides
     */
    async getEmojiOverrides(): Promise<Record<string, string>> {
        const result = await chrome.storage.local.get('emojiOverrides');
        return result.emojiOverrides || {};
    }

    /**
     * Set an emoji override
     */
    async setEmojiOverride(shortcode: string, value: string): Promise<void> {
        const overrides = await this.getEmojiOverrides();
        overrides[shortcode] = value;
        await chrome.storage.local.set({ emojiOverrides: overrides });
    }

    /**
     * Remove an emoji override (restore default)
     */
    async removeEmojiOverride(shortcode: string): Promise<void> {
        const overrides = await this.getEmojiOverrides();
        delete overrides[shortcode];
        await chrome.storage.local.set({ emojiOverrides: overrides });
    }

    /**
     * Get user preferences
     */
    async getPreferences(): Promise<UserPreferences> {
        const result = await chrome.storage.local.get('preferences');
        return { ...DEFAULT_PREFERENCES, ...(result.preferences || {}) };
    }

    /**
     * Update user preferences
     */
    async setPreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
        const current = await this.getPreferences();
        const updated = { ...current, ...prefs };
        await chrome.storage.local.set({ preferences: updated });
        return updated;
    }

    /**
     * Get recent aliases (shortcodes)
     */
    async getRecentAliases(): Promise<string[]> {
        try {
            const result = await chrome.storage.local.get('recentAliases');
            return result.recentAliases || [];
        } catch {
            return [];
        }
    }

    /**
     * Add a shortcode to recent aliases
     */
    async addToRecentAliases(shortcode: string): Promise<string[]> {
        try {
            const recent = await this.getRecentAliases();

            // Remove if already exists (to move to front)
            const filtered = recent.filter(s => s !== shortcode);

            // Add to front
            const updated = [shortcode, ...filtered].slice(0, 10);

            await chrome.storage.local.set({ recentAliases: updated });
            return updated;
        } catch {
            return [];
        }
    }

    /**
     * Clear recent aliases
     */
    async clearRecentAliases(): Promise<void> {
        await chrome.storage.local.set({ recentAliases: [] });
    }

    /**
     * Get all storage data
     */
    async getAll(): Promise<StorageSchema> {
        const [customAliases, emojiOverrides, preferences, recentAliases] = await Promise.all([
            this.getCustomAliases(),
            this.getEmojiOverrides(),
            this.getPreferences(),
            this.getRecentAliases(),
        ]);
        return { customAliases, emojiOverrides, preferences, recentAliases };
    }

    /**
     * Clear all storage data
     */
    async clear(): Promise<void> {
        await chrome.storage.local.clear();
    }
}

export const storage = Storage.getInstance();
