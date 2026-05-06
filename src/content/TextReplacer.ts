/**
 * Text Replacer
 * Core engine for detecting and replacing shortcode patterns
 */

// Regex to detect :shortcode or :shortcode: pattern (not escaped with \)
// The trailing colon is optional
const SHORTCODE_PATTERN = /(?<!\\):([a-zA-Z0-9_+-]+):?$/;
// Also detect just ":" to show all aliases
const JUST_COLON_PATTERN = /(?<!\\):$/;
const ESCAPE_PATTERN = /\\:/g;

export interface DetectionResult {
    pattern: string | null;
    position: { x: number; y: number };
}

export interface ReplaceResult {
    replaced: boolean;
    shortcode?: string;
}

export class TextReplacer {
    /**
     * Detect if there's a shortcode pattern being typed
     */
    detectPattern(element: HTMLElement): DetectionResult {
        const nullResult: DetectionResult = { pattern: null, position: { x: 0, y: 0 } };

        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            return this.detectInInput(element);
        } else if (element.isContentEditable) {
            return this.detectInContentEditable(element);
        }

        return nullResult;
    }

    private detectInInput(input: HTMLInputElement | HTMLTextAreaElement): DetectionResult {
        const nullResult: DetectionResult = { pattern: null, position: { x: 0, y: 0 } };

        const cursorPos = input.selectionStart;
        if (cursorPos === null) return nullResult;

        const textBeforeCursor = input.value.substring(0, cursorPos);

        // First check for just ":" (show all aliases)
        if (JUST_COLON_PATTERN.test(textBeforeCursor)) {
            const position = this.getInputCaretPosition(input);
            return { pattern: ':', position };
        }

        const match = textBeforeCursor.match(SHORTCODE_PATTERN);

        if (!match) return nullResult;

        const position = this.getInputCaretPosition(input);
        return {
            pattern: `:${match[1]}`,
            position,
        };
    }

    private detectInContentEditable(element: HTMLElement): DetectionResult {
        const nullResult: DetectionResult = { pattern: null, position: { x: 0, y: 0 } };

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return nullResult;

        const range = selection.getRangeAt(0);
        if (!element.contains(range.commonAncestorContainer)) return nullResult;

        // Get text before cursor
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        const textBeforeCursor = preCaretRange.toString();

        // First check for just ":" (show all aliases)
        if (JUST_COLON_PATTERN.test(textBeforeCursor)) {
            const rect = range.getBoundingClientRect();
            // Fallback to element rect if range rect seems off (e.g., 0 or negative)
            const elementRect = element.getBoundingClientRect();
            const x = rect.width > 0 && rect.left > 0 ? rect.left : elementRect.left;
            const y = rect.height > 0 ? rect.bottom : elementRect.bottom;
            return { pattern: ':', position: { x, y } };
        }

        const match = textBeforeCursor.match(SHORTCODE_PATTERN);
        if (!match) return nullResult;

        const rect = range.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const x = rect.width > 0 && rect.left > 0 ? rect.left : elementRect.left;
        const y = rect.height > 0 ? rect.bottom : elementRect.bottom;
        return {
            pattern: `:${match[1]}`,
            position: { x, y },
        };
    }

    private getInputCaretPosition(input: HTMLInputElement | HTMLTextAreaElement): { x: number; y: number } {
        const inputRect = input.getBoundingClientRect();
        
        // For inputs at the very beginning or with issues, use a fallback
        if (inputRect.width === 0 || inputRect.height === 0) {
            return { x: inputRect.left, y: inputRect.bottom };
        }

        // Create a mirror element to measure caret position
        const mirror = document.createElement('div');
        const computed = getComputedStyle(input);

        // Copy styles
        const styles = [
            'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
            'letterSpacing', 'textTransform', 'wordSpacing', 'textIndent',
            'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
            'borderLeftWidth', 'borderRightWidth', 'borderTopWidth', 'borderBottomWidth',
        ];

        mirror.style.position = 'absolute';
        mirror.style.visibility = 'hidden';
        mirror.style.whiteSpace = 'pre-wrap';
        mirror.style.wordWrap = 'break-word';

        styles.forEach(style => {
            (mirror.style as unknown as Record<string, string>)[style] = computed.getPropertyValue(
                style.replace(/([A-Z])/g, '-$1').toLowerCase()
            );
        });

        mirror.style.width = `${input.offsetWidth}px`;
        if (input instanceof HTMLTextAreaElement) {
            mirror.style.height = 'auto';
        }

        const cursorPos = input.selectionStart || 0;
        const textBeforeCursor = input.value.substring(0, cursorPos);
        mirror.textContent = textBeforeCursor;

        // Add a span to mark cursor position
        const cursorSpan = document.createElement('span');
        cursorSpan.textContent = '|';
        mirror.appendChild(cursorSpan);

        document.body.appendChild(mirror);

        const cursorRect = cursorSpan.getBoundingClientRect();
        const mirrorRect = mirror.getBoundingClientRect();

        document.body.removeChild(mirror);

        return {
            x: inputRect.left + (cursorRect.left - mirrorRect.left),
            y: inputRect.top + (cursorRect.top - mirrorRect.top) + 20,
        };
    }

    /**
     * Try to replace the pattern at cursor with the corresponding value
     */
    tryReplace(element: HTMLElement): ReplaceResult {
        // Import will be async, so we handle this in the caller
        // This just detects if there's a complete pattern to replace
        const { pattern } = this.detectPattern(element);

        if (pattern) {
            // Pattern detected - caller should check if it's a valid alias
            return { replaced: false, shortcode: pattern };
        }

        return { replaced: false };
    }

    /**
     * Replace the current pattern with a value
     */
    replacePattern(element: HTMLElement, value: string): void {
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            this.replaceInInput(element, value);
        } else if (element.isContentEditable) {
            this.replaceInContentEditable(element, value);
        }
    }

    private replaceInInput(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
        const cursorPos = input.selectionStart;
        if (cursorPos === null) return;

        const textBeforeCursor = input.value.substring(0, cursorPos);
        
        // Handle single ":" case - replace the colon with the selected value
        if (JUST_COLON_PATTERN.test(textBeforeCursor)) {
            const newValue = input.value.substring(0, cursorPos - 1) + value + input.value.substring(cursorPos);
            
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
                'value'
            )!.set!;
            nativeInputValueSetter.call(input, newValue);
            
            const event = new Event('input', { bubbles: true });
            input.dispatchEvent(event);
            
            const newCursorPos = cursorPos - 1 + value.length;
            input.setSelectionRange(newCursorPos, newCursorPos);
            return;
        }

        const match = textBeforeCursor.match(SHORTCODE_PATTERN);

        if (!match) return;

        const patternStart = cursorPos - match[0].length;
        const newValue = input.value.substring(0, patternStart) + value + input.value.substring(cursorPos);

        // Use native setter to trigger React/Vue/etc state updates
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
            'value'
        )!.set!;

        nativeInputValueSetter.call(input, newValue);

        // Fire input event
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);

        // Set cursor position after replacement
        const newCursorPos = patternStart + value.length;
        input.setSelectionRange(newCursorPos, newCursorPos);
    }

    private replaceInContentEditable(element: HTMLElement, value: string): void {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        if (!element.contains(range.commonAncestorContainer)) return;

        // Get text before cursor to find pattern
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        const textBeforeCursor = preCaretRange.toString();

        // Handle single ":" case - replace the colon with the selected value
        if (JUST_COLON_PATTERN.test(textBeforeCursor)) {
            const startNode = range.startContainer;
            const startOffset = range.startOffset;

            if (startNode.nodeType === Node.TEXT_NODE) {
                const textNode = startNode as Text;
                const beforeText = textNode.textContent!.substring(0, startOffset - 1);
                const afterText = textNode.textContent!.substring(startOffset);

                const newTextNode = document.createTextNode(beforeText + value + afterText);
                textNode.parentNode?.replaceChild(newTextNode, textNode);

                const newRange = document.createRange();
                const cursorPos = beforeText.length + value.length;
                newRange.setStart(newTextNode, cursorPos);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }

            element.dispatchEvent(new Event('input', { bubbles: true }));
            return;
        }

        const match = textBeforeCursor.match(SHORTCODE_PATTERN);
        if (!match) return;

        // Find and replace the pattern
        const patternLength = match[0].length;

        // Move start of range back by pattern length
        const startNode = range.startContainer;
        const startOffset = range.startOffset;

        if (startNode.nodeType === Node.TEXT_NODE) {
            const textNode = startNode as Text;
            // Use textContent but preserve newlines by replacing \n with actual line breaks
            const beforeText = textNode.textContent!.substring(0, startOffset - patternLength);
            const afterText = textNode.textContent!.substring(startOffset);

            // For contenteditable, we need to insert as text node to preserve formatting
            const newTextNode = document.createTextNode(beforeText + value + afterText);

            // Replace the old node with the new one
            textNode.parentNode?.replaceChild(newTextNode, textNode);

            // Set cursor after replacement
            const newRange = document.createRange();
            const cursorPos = beforeText.length + value.length;
            newRange.setStart(newTextNode, cursorPos);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }

        // Fire input event
        element.dispatchEvent(new Event('input', { bubbles: true }));
    }

    /**
     * Unescape escaped colons
     */
    static unescape(text: string): string {
        return text.replace(ESCAPE_PATTERN, ':');
    }
}
