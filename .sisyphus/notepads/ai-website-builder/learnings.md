# Task 8: iframe Preview for Static HTML - Learnings

## Implementation Summary

Successfully implemented a secure iframe sandbox component for rendering static HTML/CSS/JS content with the following features:

### Key Components Created

1. **IframePreview Component** (`components/preview/iframe-preview.tsx`)
   - Uses `srcdoc` attribute to inject HTML/CSS/JS directly into iframe
   - Implements sandbox security attributes: `allow-scripts allow-same-origin`
   - Prevents parent window access via restrictive sandbox policy
   - Includes postMessage error handling for runtime errors
   - Refresh button to reload preview without page reload
   - Error display UI for debugging

2. **Project Type Detection** (`lib/preview/detect-project-type.ts`)
   - `detectProjectType()` - Identifies React vs static HTML projects
   - `extractStaticFiles()` - Extracts HTML/CSS/JS from parsed files
   - Enables automatic preview selection based on project type

3. **Message Item Integration** (`components/chat/message-item.tsx`)
   - Detects static HTML projects from AI response
   - Renders IframePreview above message text when HTML files detected
   - Falls back to text rendering for non-HTML projects

4. **Test Coverage**
   - 12 component tests covering sandbox attributes, srcdoc injection, error handling
   - E2E tests for preview rendering and refresh functionality
   - All tests passing

### Technical Decisions

1. **srcdoc vs src**: Used `srcdoc` for direct HTML injection instead of blob URLs
   - Simpler implementation
   - No CORS issues
   - Direct content control

2. **Sandbox Attributes**: `allow-scripts allow-same-origin`
   - `allow-scripts`: Required for JavaScript execution
   - `allow-same-origin`: Allows CSS/JS to work properly
   - Explicitly excluded: `allow-top-navigation`, `allow-forms` for security

3. **Error Handling**: postMessage communication
   - Iframe sends errors to parent via postMessage
   - Parent displays errors in UI
   - Errors cleared on refresh

4. **Project Type Detection**: File extension-based
   - React: `.tsx`, `.jsx`, or `package.json`
   - Static HTML: `.html` files
   - Unknown: No recognized files

### Integration Points

- Chat page now supports both React (Sandpack) and static HTML (iframe) previews
- Message item component automatically selects appropriate preview
- UIMessage type uses `parts` array instead of `content` property

### Testing Notes

- Component tests use `getAttribute('sandbox')` instead of `sandbox.contains()` for JSDOM compatibility
- E2E tests verify preview rendering and refresh functionality
- All 12 component tests pass successfully

### Potential Enhancements

1. Support for inline CSS/JS in HTML files
2. CSS preprocessor support (SCSS, Less)
3. JavaScript module support via importmap
4. Preview size customization
5. Code editor integration for live editing
