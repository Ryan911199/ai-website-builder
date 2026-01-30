# Architectural Decisions - Task 8

## 1. iframe Sandbox Security Model

**Decision**: Use `sandbox="allow-scripts allow-same-origin"` with explicit exclusions

**Rationale**:
- `allow-scripts`: Required for JavaScript execution in preview
- `allow-same-origin`: Allows CSS/JS to function properly
- Excludes `allow-top-navigation`, `allow-forms`, `allow-pointer-lock` for security
- Prevents iframe from accessing parent window or navigating top-level frame

**Alternative Considered**: Stricter sandbox with only `allow-scripts`
- Would break CSS and some JS functionality
- Not suitable for realistic HTML/CSS/JS previews

## 2. srcdoc vs Blob URL vs External File

**Decision**: Use `srcdoc` attribute for direct HTML injection

**Rationale**:
- Simplest implementation - no file system or blob URL management
- No CORS issues
- Direct control over content
- Automatic updates when props change

**Alternatives Rejected**:
- Blob URLs: More complex, requires cleanup
- External files: Requires server-side storage
- Data URLs: Limited size, encoding complexity

## 3. Error Handling via postMessage

**Decision**: Use postMessage for error communication from iframe to parent

**Rationale**:
- Respects sandbox restrictions (can't access parent directly)
- Allows error display in parent UI
- Supports both sync errors and unhandled promise rejections
- Clean separation of concerns

**Implementation**:
- Iframe sends: `{ type: 'error', message, filename, lineno }`
- Parent listens and displays in error UI
- Errors cleared on refresh

## 4. Project Type Detection Strategy

**Decision**: File extension-based detection with fallback to unknown

**Rationale**:
- Simple and reliable
- Works with AI-generated file lists
- Clear decision tree: React files → React, HTML files → Static, else → Unknown

**Detection Logic**:
1. Check for `.tsx`, `.jsx`, or `package.json` → React
2. Check for `.html` files → Static HTML
3. Default → Unknown (no preview)

**Alternative Considered**: Content-based detection
- Would require parsing file contents
- More complex, slower
- Not necessary for this use case

## 5. Message Item Integration

**Decision**: Detect project type in MessageItem component, render preview above text

**Rationale**:
- Centralized preview logic
- Automatic selection based on content
- Preserves message text for reference
- Clean component hierarchy

**Layout**:
```
[Avatar] [Preview (if HTML)]
         [Message Text]
```

## 6. UIMessage Type Handling

**Decision**: Extract text from `message.parts` array instead of `message.content`

**Rationale**:
- UIMessage type uses `parts` array structure
- Each part has `type` and content
- Filters for `type === 'text'` parts
- Consistent with existing message-item implementation

**Code Pattern**:
```typescript
const content = message.parts
  .filter((part) => part.type === 'text')
  .map((part) => (part.type === 'text' ? part.text : ''))
  .join('');
```

## 7. Test Approach

**Decision**: Separate component tests and E2E tests with different focus

**Component Tests** (12 tests):
- Sandbox attributes
- srcdoc injection
- Error handling
- Refresh functionality
- Props updates

**E2E Tests** (5 tests):
- Full chat flow
- Preview rendering
- Refresh button interaction
- CSS styling
- JavaScript execution

**Test Compatibility**:
- Use `getAttribute('sandbox')` for JSDOM compatibility
- Avoid `sandbox.contains()` which doesn't work in test environment
