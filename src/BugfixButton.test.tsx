import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BugfixButton } from "./BugfixButton.js";

function lastOpenedUrl(open: ReturnType<typeof vi.spyOn>): URL {
  const calls = open.mock.calls as unknown[][];
  return new URL(calls[calls.length - 1][0] as string);
}

describe("BugfixButton", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("bugfix-button:screenshot", "false");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens a prefilled issue when configured by props", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<BugfixButton repo="acme/app" assignee="dev" labels={["feedback"]} appName="App" details={["branch `x`"]} />);
    fireEvent.click(screen.getByText("🐞 Feedback"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Login fails" } });
    await act(async () => { fireEvent.click(screen.getByText("Open Issue →")); });
    const url = lastOpenedUrl(open);
    expect(url.pathname).toBe("/acme/app/issues/new");
    expect(url.searchParams.get("title")).toBe("Login fails");
    expect(url.searchParams.get("assignees")).toBe("dev");
    expect(url.searchParams.get("body")).toContain("branch `x`");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("files the generated title and body", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const generate = vi.fn().mockResolvedValue({ title: "Login button ignores clicks", body: "## Steps\n1. Click" });
    render(<BugfixButton repo="acme/app" assignee="dev" generate={generate} />);
    fireEvent.click(screen.getByText("🐞 Feedback"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "login broke" } });
    await act(async () => { fireEvent.click(screen.getByText("Open Issue →")); });
    expect(generate).toHaveBeenCalledWith("login broke");
    const url = lastOpenedUrl(open);
    expect(url.searchParams.get("title")).toBe("Login button ignores clicks");
    expect(url.searchParams.get("body")?.startsWith("## Steps")).toBe(true);
  });

  it("files the raw description when generate fails", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const generate = vi.fn().mockRejectedValue(new Error("down"));
    render(<BugfixButton repo="acme/app" assignee="dev" generate={generate} />);
    fireEvent.click(screen.getByText("🐞 Feedback"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "login broke" } });
    await act(async () => { fireEvent.click(screen.getByText("Open Issue →")); });
    expect(lastOpenedUrl(open).searchParams.get("title")).toBe("login broke");
  });

  it("renders the dialog under document.body", () => {
    const { container } = render(<BugfixButton repo="acme/app" assignee="dev" placement="inline" />);
    fireEvent.click(screen.getByText("🐞 Feedback"));
    const dialog = screen.getByRole("dialog");
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it("stays open when a drag from inside ends on the backdrop", () => {
    render(<BugfixButton repo="acme/app" assignee="dev" />);
    fireEvent.click(screen.getByText("🐞 Feedback"));
    const overlay = screen.getByRole("dialog").parentElement as HTMLElement;
    fireEvent.mouseDown(screen.getByRole("textbox"));
    fireEvent.click(overlay);
    expect(screen.queryByRole("dialog")).not.toBeNull();
    fireEvent.mouseDown(overlay);
    fireEvent.click(overlay);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the draft across dismissals", () => {
    render(<BugfixButton repo="acme/app" assignee="dev" />);
    fireEvent.click(screen.getByText("🐞 Feedback"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "half a thought" } });
    fireEvent.click(screen.getByText("Cancel"));
    fireEvent.click(screen.getByText("🐞 Feedback"));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("half a thought");
  });

  it("onboards, shows the routine, then files", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<BugfixButton />);
    fireEvent.click(screen.getByText("🐞 Feedback"));
    fireEvent.change(screen.getByPlaceholderText("owner/name"), { target: { value: "acme/app" } });
    fireEvent.change(screen.getAllByPlaceholderText("anyone")[0], { target: { value: "dev" } });
    fireEvent.click(screen.getByText("Save →"));

    const prompt = screen.getByDisplayValue(/Fix issues filed through the Feedback button on acme\/app/);
    expect((prompt as HTMLTextAreaElement).value).toContain("author:dev");

    fireEvent.click(screen.getByText("Done"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Crash" } });
    await act(async () => { fireEvent.click(screen.getByText("Open Issue →")); });
    expect(lastOpenedUrl(open).pathname).toBe("/acme/app/issues/new");
  });

  it("remembers onboarding across reloads", () => {
    render(<BugfixButton />);
    fireEvent.click(screen.getByText("🐞 Feedback"));
    fireEvent.change(screen.getByPlaceholderText("owner/name"), { target: { value: "acme/app" } });
    fireEvent.change(screen.getAllByPlaceholderText("anyone")[1], { target: { value: "dev" } });
    fireEvent.click(screen.getByText("Save →"));
    cleanup();

    render(<BugfixButton />);
    fireEvent.click(screen.getByText("🐞 Feedback"));
    expect(screen.getByText("Open Issue →")).toBeTruthy();
  });

  it("blocks saving rules that match anyone", () => {
    render(<BugfixButton />);
    fireEvent.click(screen.getByText("🐞 Feedback"));
    fireEvent.change(screen.getByPlaceholderText("owner/name"), { target: { value: "acme/app" } });
    expect((screen.getByText("Save →") as HTMLButtonElement).disabled).toBe(true);
  });
});
