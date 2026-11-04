export interface SpeechInput {
    active: boolean;
    error: string;
    supported: boolean;
    toggle: () => void;
    stop: () => void;
}
/** Dictation that appends recognized phrases. */
export declare function useSpeechInput(append: (text: string) => void, initialActive: boolean): SpeechInput;
