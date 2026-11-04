/** Marks elements the screenshot leaves out. */
export const SCREENSHOT_SKIP_ATTR = "data-bugfix-skip";
/** Capture the page and copy it. */
export async function copyPageScreenshot() {
    try {
        const { default: html2canvas } = await import("html2canvas-pro");
        const canvas = await html2canvas(document.documentElement, {
            scale: 1,
            useCORS: true,
            logging: false,
            allowTaint: true,
            ignoreElements: (el) => el.hasAttribute(SCREENSHOT_SKIP_ATTR),
        });
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        if (!blob)
            return { copied: false, preview: null };
        try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            return { copied: true, preview: null };
        }
        catch {
            // Clipboard needs permission and HTTPS.
            return { copied: false, preview: canvas.toDataURL("image/png") };
        }
    }
    catch {
        return { copied: false, preview: null };
    }
}
