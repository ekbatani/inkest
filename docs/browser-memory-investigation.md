# Browser memory investigation

This runbook is the reproducible evidence path for P1-44. Use a local,
disposable Inkest deployment and a disposable account. Do not enter personal
notes, credentials, provider keys, attachment paths, or heap snapshots into an
issue or repository: JavaScript heap snapshots can contain rendered note text
and request data.

## Required environment

- A current desktop Chrome or Chromium browser with DevTools.
- A locally running, disposable Inkest instance with no production database,
  attachments, or integrations.
- DevTools **Memory** and **Performance monitor** panels available.

Record browser version, operating system, viewport, note count, note-size
classes, and whether the test used a production build or development server.
Do not record the disposable account password or session data.

## Test data

Create ten disposable notes with distinct, non-sensitive marker text:

- three short notes (about 1 KiB Markdown),
- three medium notes (about 20 KiB),
- three large notes (about 100 KiB), and
- one note containing a representative Mermaid diagram.

Use a small harmless PNG for the attachment exercise. Keep the AI provider
unconfigured: the AI-panel step measures panel mounting only and must not send
test text to a provider.

## Capture procedure

1. Open DevTools, choose **Memory**, and select **Heap snapshot**. In
   **Performance monitor**, enable JS heap size, DOM nodes, and event listeners.
2. Navigate to the dashboard, run garbage collection twice with the DevTools
   trash-can control, and capture `baseline.heapsnapshot` locally. Record the
   three monitor values only.
3. Run 20 cycles. Each cycle opens a short, medium, and large note; makes a
   harmless one-character edit and waits for the saved state; returns to the
   dashboard; and opens the next note. Do not leave unsaved drafts behind.
4. On every fifth cycle, open and close the Mermaid note's Focus reader, open
   and close the AI panel without submitting an action, and upload then remove
   the harmless attachment reference. Reload the application after cycles 10
   and 20.
5. Return to the dashboard, collect garbage twice, and capture
   `post-cycle.heapsnapshot` locally. Record the same monitor values. Repeat
   the entire procedure once after a fresh browser restart.

## Analysis and reporting

Compare `post-cycle` to `baseline` in DevTools' **Comparison** view. Investigate
constructors and retaining paths that grow after garbage collection, especially
CodeMirror `EditorView`/state objects, Mermaid SVG/DOM nodes, detached DOM
trees, event listeners, object URLs, React fibers, and AI-panel state. A
transient rise before garbage collection is not a leak.

Record only this aggregate table in the task evidence or issue:

| Run | Baseline JS heap | Post-cycle JS heap | Baseline DOM nodes | Post-cycle DOM nodes | Retained constructors / path | Result |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 |  |  |  |  |  |  |
| 2 after browser restart |  |  |  |  |  |  |

If a constructor retains increasing instances after both reloads and garbage
collection, attach a redacted retaining-path description and open a narrowly
scoped fix. Re-run this exact drill before marking P1-44 done; do not ship a
memory-related change based on a monitor graph alone.
