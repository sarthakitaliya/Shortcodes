/**
 * Input Observer
 * Detects and monitors text input fields for shortcode patterns
 */

import { TextReplacer } from './TextReplacer';

export interface InputObserverOptions {
    onPatternChange: (pattern: string | null, position: { x: number; y: number }) => void;
    onReplace: (shortcode: string) => void;
}

export class InputObserver {
    private replacer: TextReplacer;
    private options: InputObserverOptions;
    private mutationObserver: MutationObserver;
    private activeElement: HTMLElement | null = null;
    private boundHandlers = new Map<HTMLElement, { input: EventListener; keydown: EventListener }>();

    constructor(options: InputObserverOptions) {
        this.options = options;
        this.replacer = new TextReplacer();

        // MutationObserver for dynamically added inputs
        this.mutationObserver = new MutationObserver(this.handleMutations.bind(this));

        this.init();
    }

    private init(): void {
        // Observe document for new inputs
        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });

        // Attach to existing inputs
        this.attachToAllInputs();

        // Listen for focus changes
        document.addEventListener('focusin', this.handleFocusIn.bind(this));
        document.addEventListener('focusout', this.handleFocusOut.bind(this));
    }

    private handleMutations(mutations: MutationRecord[]): void {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLElement) {
                    this.attachToInputsIn(node);
                }
            }
        }
    }

    private attachToAllInputs(): void {
        this.attachToInputsIn(document.body);
    }

    private attachToInputsIn(root: HTMLElement): void {
        // Input and textarea elements
        const textInputs = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
            'input[type="text"], input[type="search"], input:not([type]), textarea'
        );

        textInputs.forEach(input => this.attachToInput(input));

        // Contenteditable elements
        const editables = root.querySelectorAll<HTMLElement>('[contenteditable="true"]');
        editables.forEach(editable => this.attachToInput(editable));

        // Check if root itself is an input
        if (this.isInputElement(root)) {
            this.attachToInput(root as HTMLInputElement | HTMLTextAreaElement | HTMLElement);
        }
    }

    private isInputElement(el: HTMLElement): boolean {
        const tagName = el.tagName.toLowerCase();
        if (tagName === 'textarea') return true;
        if (tagName === 'input') {
            const type = (el as HTMLInputElement).type;
            return !type || type === 'text' || type === 'search';
        }
        return el.isContentEditable;
    }

    private attachToInput(input: HTMLElement): void {
        if (this.boundHandlers.has(input)) return;

        const inputHandler = (e: Event) => this.handleInput(e);
        const keydownHandler = (e: Event) => this.handleKeyDown(e as KeyboardEvent);

        input.addEventListener('input', inputHandler);
        input.addEventListener('keydown', keydownHandler);

        this.boundHandlers.set(input, { input: inputHandler, keydown: keydownHandler });
    }

    private handleFocusIn(e: FocusEvent): void {
        const target = e.target as HTMLElement;
        if (this.isInputElement(target)) {
            this.activeElement = target;
        }
    }

    private handleFocusOut(_e: FocusEvent): void {
        // Delay to allow autocomplete click
        setTimeout(() => {
            if (!document.activeElement || !this.isInputElement(document.activeElement as HTMLElement)) {
                this.options.onPatternChange(null, { x: 0, y: 0 });
            }
        }, 150);
    }

    private handleInput(_e: Event): void {
        if (!this.activeElement) return;

        const { pattern, position } = this.replacer.detectPattern(this.activeElement);
        this.options.onPatternChange(pattern, position);
    }

    private handleKeyDown(e: KeyboardEvent): void {
        const target = e.target as HTMLElement;

        // Check for trigger keys (space, enter, tab)
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'Tab') {
            const result = this.replacer.tryReplace(target);
            if (result.replaced) {
                this.options.onReplace(result.shortcode!);
                this.options.onPatternChange(null, { x: 0, y: 0 });

                // For Tab, prevent default only if we replaced
                if (e.key === 'Tab') {
                    e.preventDefault();
                }
            }
        }
    }

    /**
     * Replace the current pattern with a selected value
     */
    public replaceWithValue(value: string): void {
        if (this.activeElement) {
            this.replacer.replacePattern(this.activeElement, value);
            this.options.onPatternChange(null, { x: 0, y: 0 });
        }
    }

    public destroy(): void {
        this.mutationObserver.disconnect();

        this.boundHandlers.forEach((handlers, element) => {
            element.removeEventListener('input', handlers.input);
            element.removeEventListener('keydown', handlers.keydown);
        });
        this.boundHandlers.clear();
    }
}
