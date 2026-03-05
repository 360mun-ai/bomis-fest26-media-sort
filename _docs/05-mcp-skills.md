# Agent Skills & Rules
**Project Name:** Open Minds Fest Media Sorter

## 1. Tooling & MCP Integration

### Context7 (Live Documentation)
**Trigger:** Automatically invoke the `context7` MCP server whenever you need to write implementation code for Next.js App Router, Auth.js, Tailwind CSS, or the Google Drive API.
**Action:** Do not rely on your base training data. Fetch the exact, version-specific documentation to prevent hallucinating deprecated APIs.

### Browser MCP (Autonomous Testing)
**Trigger:** Once a frontend component or route is built.
**Action:** Use your browser control capabilities to navigate to `http://localhost:3000`. Click through the UI, verify the upload dashboard renders correctly in dark mode, and ensure no console errors are thrown before moving to the next task.

## 2. Global Vibe Rules (Behavior)

### GSD (Get Shit Done) Protocol
* **No Yapping:** Do not output long introductory, explanatory, or conversational text. Output only the necessary terminal commands, file paths, and code blocks.
* **Complete Files:** Never use `// ... existing code ...` placeholders. Write the complete, functional file every time.
* **Sequential Focus:** Finish one file completely and verify it works before moving to the next phase.

### UI/UX Pro Max Skill
* **Aesthetic:** Default to a professional, high-end dark mode using neutral dark grays (e.g., `bg-zinc-950`). Avoid stark black (`#000000`).
* **Components:** Use `shadcn/ui` extensively to ensure the interface is accessible, responsive, and clean without writing custom CSS from scratch.
* **Layouts:** Implement modern visual patterns like the masonry grid for the media gallery and bento-box style cards for the upload dashboard.

### Obsidian Documentation Protocol
* **Knowledge Syncing:** Treat the `_docs` folder as your absolute source of truth. 
* **Continuous Updates:** If you encounter an unresolvable bug and must make an architectural pivot during coding, you must update the relevant markdown files (e.g., `02-architecture.md` or the implementation plan) to reflect reality. Do not let the codebase and the documentation drift apart.