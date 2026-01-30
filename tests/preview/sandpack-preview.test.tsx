import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SandpackPreview } from "@/components/preview/sandpack-preview";

vi.mock("@codesandbox/sandpack-react", () => ({
  Sandpack: ({ files }: any) => (
    <div data-testid="sandpack-mock">
      {Object.entries(files).map(([path, file]: any) => (
        <div key={path} data-testid={`file-${path}`}>
          {file.code}
        </div>
      ))}
    </div>
  ),
}));

describe("SandpackPreview", () => {
  it("renders default files initially", () => {
    render(<SandpackPreview code="" />);
    expect(screen.getByTestId("sandpack-mock")).toBeDefined();
    expect(screen.getByTestId("file-/App.tsx")).toBeDefined();
  });

  it("updates files after debounce when code is provided", async () => {
    const { rerender } = render(<SandpackPreview code="" />);
    
    const code = "```file:App.tsx\nexport default function App() { return <h1>Updated</h1> }\n```";
    
    rerender(<SandpackPreview code={code} />);
    
    expect(screen.queryByText(/Updated/)).toBeNull();
    
    await waitFor(() => {
      expect(screen.getByText(/Updated/)).toBeDefined();
    }, { timeout: 1000 });
  });
});
