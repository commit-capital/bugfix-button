// Override --bugfix-* variables to theme it.
const bg = "var(--bugfix-bg, #ffffff)";
const fg = "var(--bugfix-fg, #1f2328)";
const muted = "var(--bugfix-muted, #59636e)";
const border = "var(--bugfix-border, #d0d7de)";
const accent = "var(--bugfix-accent, #0969da)";
const danger = "var(--bugfix-danger, #cf222e)";
const field = "var(--bugfix-field-bg, #ffffff)";
const font = 'var(--bugfix-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)';
const control = {
    padding: "6px 14px",
    font: `13px ${font}`,
    borderRadius: 6,
    cursor: "pointer",
};
export const styles = {
    button: {
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: "4px 12px",
        font: `13px ${font}`,
        color: muted,
        cursor: "pointer",
        whiteSpace: "nowrap",
    },
    floating: {
        position: "fixed",
        top: 12,
        right: 16,
        zIndex: 2147483000,
        boxShadow: "0 1px 4px rgba(0, 0, 0, 0.12)",
    },
    overlay: {
        position: "fixed",
        inset: 0,
        zIndex: 2147483001,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "12vh 16px 16px",
        background: "rgba(0, 0, 0, 0.45)",
        font: `14px ${font}`,
        color: fg,
    },
    modal: {
        width: "min(560px, 100%)",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 10,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        textAlign: "left",
    },
    modalHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 15,
        fontWeight: 600,
    },
    close: {
        background: "none",
        border: "none",
        fontSize: 16,
        color: muted,
        cursor: "pointer",
    },
    textareaWrap: {
        position: "relative",
    },
    textarea: {
        width: "100%",
        boxSizing: "border-box",
        padding: "8px 34px 8px 10px",
        font: `14px ${font}`,
        color: fg,
        background: field,
        border: `1px solid ${border}`,
        borderRadius: 6,
        resize: "vertical",
    },
    mic: {
        position: "absolute",
        right: 8,
        bottom: 10,
        background: "none",
        border: "none",
        padding: 2,
        color: muted,
        cursor: "pointer",
    },
    micActive: {
        color: danger,
    },
    field: {
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize: 13,
        fontWeight: 500,
    },
    input: {
        padding: "6px 8px",
        font: `14px ${font}`,
        color: fg,
        background: field,
        border: `1px solid ${border}`,
        borderRadius: 6,
    },
    option: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: muted,
        cursor: "pointer",
    },
    preview: {
        maxWidth: "100%",
        maxHeight: 220,
        borderRadius: 4,
        border: `1px solid ${border}`,
    },
    footer: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
    },
    actions: {
        display: "flex",
        gap: 8,
    },
    primary: {
        ...control,
        background: accent,
        border: `1px solid ${accent}`,
        color: "#fff",
    },
    secondary: {
        ...control,
        background: "transparent",
        border: `1px solid ${border}`,
        color: muted,
    },
    linkButton: {
        background: "none",
        border: "none",
        padding: 0,
        font: `12px ${font}`,
        color: accent,
        cursor: "pointer",
    },
    hint: {
        margin: 0,
        fontSize: 12,
        color: muted,
    },
    errors: {
        margin: 0,
        paddingLeft: 18,
        fontSize: 12,
        color: danger,
    },
    steps: {
        margin: 0,
        paddingLeft: 18,
        fontSize: 13,
        lineHeight: 1.5,
    },
};
