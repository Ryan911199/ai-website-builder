import { SandpackFile, SandpackPredefinedTemplate } from "@codesandbox/sandpack-react";

export const SANDPACK_TEMPLATE: SandpackPredefinedTemplate = "react-ts";

export const SANDPACK_DEFAULT_FILES: Record<string, SandpackFile> = {
  "/App.tsx": {
    code: `export default function App() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-blue-600">Hello Sandpack</h1>
      <p className="mt-2 text-gray-600">Start editing to see some magic happen!</p>
    </div>
  );
}
`,
  },
};

export const SANDPACK_OPTIONS = {
  externalResources: ["https://cdn.tailwindcss.com"],
  showNavigator: false,
  showTabs: true,
  showLineNumbers: true,
  wrapContent: true,
  editorHeight: 600,
  resizablePanels: true,
};
