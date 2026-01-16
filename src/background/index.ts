/**
 * Background Service Worker
 * Handles extension lifecycle and message passing
 */

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('[Shortcodes] Extension installed');

        // Initialize default storage
        chrome.storage.local.set({
            customAliases: [],
            emojiOverrides: {},
            preferences: {
                enabled: true,
                showAutocomplete: true,
                triggerKeys: ['space', 'enter', 'tab'],
                maxSuggestions: 8,
            },
        });
    } else if (details.reason === 'update') {
        console.log('[Shortcodes] Extension updated');
    }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_ALIASES') {
        chrome.storage.local.get(['customAliases', 'emojiOverrides'], (result) => {
            sendResponse({
                customAliases: result.customAliases || [],
                emojiOverrides: result.emojiOverrides || {},
            });
        });
        return true; // Keep channel open for async response
    }

    if (message.type === 'GET_PREFERENCES') {
        chrome.storage.local.get('preferences', (result) => {
            sendResponse(result.preferences || {});
        });
        return true;
    }
});

export { };
