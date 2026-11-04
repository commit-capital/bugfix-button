import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BugfixButton } from "./BugfixButton.js";

describe("BugfixButton", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens a prefilled issue when configured by props", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<BugfixButton repo="acme/app" assignee="dev" labels={["feedback"]} appName="App" />);
    fireEvent.click(screen.getByText("🐞 Feedback"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Login fails" } });
    fireEvent.click(screen.getByText("Open Issue →"));
    const url = new URL(open.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/acme/app/issues/new");
    expect(url.searchParams.get("title")).toBe("Login fails");
    expect(url.searchParams.get("assignees")).toBe("dev");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("onboards, shows the routine, then files", () => {
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
    fireEvent.click(screen.getByText("Open Issue →"));
    expect(open.mock.calls[0][0]).toContain("github.com/acme/app/issues/new");
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
