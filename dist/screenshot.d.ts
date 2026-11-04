/** Marks elements the screenshot leaves out. */
export declare const SCREENSHOT_SKIP_ATTR = "data-bugfix-skip";
export interface ScreenshotResult {
    /** The PNG reached the clipboard. */
    copied: boolean;
    /** Data URL to copy by hand when the clipboard refused. */
    preview: string | null;
}
/** Capture the page and copy it. */
export declare function copyPageScreenshot(): Promise<ScreenshotResult>;
