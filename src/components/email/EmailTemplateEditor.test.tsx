import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { renderPreview, EmailTemplateEditor } from "./EmailTemplateEditor";

const sent: { url: string; body: Record<string, unknown> }[] = [];
let response: { ok: boolean; body: Record<string, unknown> } = {
  ok: true,
  body: { success: true, sent_from: "Test <t@example.com>", provider: "resend" },
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { access_token: "tok" } } }) },
  },
}));

const toasts: { title?: string }[] = [];
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: (t: { title?: string }) => toasts.push(t) }),
}));

beforeEach(() => {
  sent.length = 0;
  toasts.length = 0;
  response = {
    ok: true,
    body: { success: true, sent_from: "Test <t@example.com>", provider: "resend" },
  };
  vi.stubGlobal("fetch", (url: string, init: RequestInit) => {
    sent.push({ url, body: JSON.parse(String(init.body)) });
    return Promise.resolve({
      ok: response.ok,
      json: () => Promise.resolve(response.body),
    } as Response);
  });
});

describe("renderPreview", () => {
  it("fills placeholders", () => {
    expect(renderPreview("Hi {{student_name}}", { student_name: "Alex" })).toBe("Hi Alex");
  });

  it("tolerates spacing inside the braces", () => {
    expect(renderPreview("Hi {{ student_name }}", { student_name: "Alex" })).toBe("Hi Alex");
  });

  it("leaves unknown placeholders visible rather than blanking them", () => {
    // Silently emptying an unknown token would hide a typo until it reached a
    // real inbox.
    expect(renderPreview("Hi {{nope}}", { student_name: "Alex" })).toBe("Hi {{nope}}");
  });

  it("replaces every occurrence", () => {
    expect(renderPreview("{{a}} and {{a}}", { a: "x" })).toBe("x and x");
  });
});

/** Radix tabs activate on mouseDown, so a bare click does not switch them. */
const selectTab = (name: RegExp) => {
  const trigger = screen.getByRole("tab", { name });
  fireEvent.mouseDown(trigger);
  fireEvent.click(trigger);
};

function setup(props: Partial<React.ComponentProps<typeof EmailTemplateEditor>> = {}) {
  const onSubjectChange = vi.fn();
  const onHtmlChange = vi.fn();
  render(
    <EmailTemplateEditor
      subject="Welcome {{student_name}}"
      html="<p>Hello {{student_name}}</p>"
      onSubjectChange={onSubjectChange}
      onHtmlChange={onHtmlChange}
      variables={["student_name"]}
      {...props}
    />,
  );
  return { onSubjectChange, onHtmlChange };
}

describe("EmailTemplateEditor", () => {
  it("offers the three editing modes", () => {
    setup();
    expect(screen.getByRole("tab", { name: /Editor/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /HTML/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Preview/ })).toBeInTheDocument();
  });

  it("edits the subject", () => {
    const { onSubjectChange } = setup();
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "New subject" } });
    expect(onSubjectChange).toHaveBeenCalledWith("New subject");
  });

  it("edits raw HTML in the source view", () => {
    const { onHtmlChange } = setup();
    selectTab(/HTML/);
    fireEvent.change(screen.getByLabelText("Email HTML source"), {
      target: { value: "<p>changed</p>" },
    });
    expect(onHtmlChange).toHaveBeenCalledWith("<p>changed</p>");
  });

  it("renders the preview inside a sandboxed frame", () => {
    const { container } = render(
      <EmailTemplateEditor
        subject="Hi {{student_name}}"
        html="<p>Body</p>"
        onSubjectChange={() => {}}
        onHtmlChange={() => {}}
      />,
    );
    selectTab(/Preview/);

    const frame = container.querySelector("iframe");
    expect(frame).toBeTruthy();
    // Template HTML is untrusted-ish content; it must not run in the app page.
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame?.getAttribute("srcdoc")).toContain("<p>Body</p>");
  });

  it("fills sample values in the previewed subject", () => {
    setup();
    selectTab(/Preview/);
    expect(screen.getByText("Welcome Alex Fernandes")).toBeInTheDocument();
  });

  it("refuses to send a test without a recipient", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Send test/ }));
    await waitFor(() => expect(toasts.some((t) => /address/i.test(t.title || ""))).toBe(true));
    expect(sent).toHaveLength(0);
  });

  it("sends a test to the address entered", async () => {
    setup({ purpose: "automation", accountId: "acc-1" });

    fireEvent.change(screen.getByLabelText("Test recipient"), {
      target: { value: "someone@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send test/ }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].url).toContain("/functions/v1/send-test-email");
    expect(sent[0].body).toMatchObject({
      to: "someone@example.com",
      subject: "Welcome {{student_name}}",
      account_id: "acc-1",
      purpose: "automation",
    });
  });

  it("surfaces a provider rejection instead of claiming success", async () => {
    response = { ok: false, body: { error: "SMTP auth failed" } };
    setup();

    fireEvent.change(screen.getByLabelText("Test recipient"), {
      target: { value: "someone@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send test/ }));

    await waitFor(() => expect(toasts.some((t) => t.title === "Couldn't send")).toBe(true));
  });
});
