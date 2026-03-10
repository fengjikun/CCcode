# Workspace Polling Removal Design

**Context**

`ProjectWorkspace` currently polls project detail every 2 seconds while extraction or AI insight tasks are running. In unstable demo environments this magnifies transient backend or proxy errors into repeated `502` failures.

**Chosen Approach**

Use option A: remove automatic polling from the workspace hook and rely on the existing manual refresh button in the workspace header.

**Why**

- Smallest possible change for demo risk reduction
- Reduces repeated backend pressure during long-running tasks
- Avoids repeated error toasts when upstream services briefly restart

**Scope**

- Remove the polling `useEffect` from `frontend/src/pages/workspace/useProjectWorkspace.ts`
- Keep current manual refresh behavior in `frontend/src/pages/ProjectWorkspacePage.tsx`
- Add a regression test that asserts the hook source no longer registers interval-based polling

**Non-Goals**

- No retry/backoff work in the shared request client
- No task-status redesign
- No new demo-mode feature flags
