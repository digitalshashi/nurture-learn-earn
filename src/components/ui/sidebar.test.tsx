import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SidebarProvider, useSidebar } from "./sidebar";

// The open/closed state is shared app-wide through one cookie. A page that
// wants its own starting state must be able to opt out, or expanding the
// sidebar there would follow the user onto every other page.

function Probe() {
  const { state, toggleSidebar } = useSidebar();
  return (
    <button onClick={toggleSidebar} data-testid="probe">
      {state}
    </button>
  );
}

const readCookie = () =>
  document.cookie.match(/(^| )sidebar:state=([^;]+)/)?.[2] ?? null;

beforeEach(() => {
  document.cookie = "sidebar:state=; path=/; max-age=0";
});

describe("SidebarProvider state persistence", () => {
  it("defaults to expanded when no preference is stored", () => {
    render(
      <SidebarProvider>
        <Probe />
      </SidebarProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("expanded");
  });

  it("honours a stored preference", () => {
    document.cookie = "sidebar:state=false; path=/";
    render(
      <SidebarProvider>
        <Probe />
      </SidebarProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("collapsed");
  });

  it("remembers a toggle app-wide by default", () => {
    render(
      <SidebarProvider>
        <Probe />
      </SidebarProvider>,
    );
    fireEvent.click(screen.getByTestId("probe"));
    expect(readCookie()).toBe("false");
  });

  it("starts collapsed when a page asks for it", () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <Probe />
      </SidebarProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("collapsed");
  });

  it("ignores the stored preference when the page opts out", () => {
    document.cookie = "sidebar:state=true; path=/";
    render(
      <SidebarProvider defaultOpen={false} persistState={false}>
        <Probe />
      </SidebarProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("collapsed");
  });

  it("does not leak a toggle to other pages when the page opts out", () => {
    render(
      <SidebarProvider defaultOpen={false} persistState={false}>
        <Probe />
      </SidebarProvider>,
    );

    fireEvent.click(screen.getByTestId("probe"));

    // The page's own sidebar still opens...
    expect(screen.getByTestId("probe")).toHaveTextContent("expanded");
    // ...but the app-wide preference is untouched.
    expect(readCookie()).toBeNull();
  });
});
