# Branch Default GitLab Push Design

**Date:** 2026-03-09

**Goal:** Make the local branch `mvp-platform-skeleton` explicitly default to pushing to the GitLab remote.

## Scope

- Set a branch-specific push target for `mvp-platform-skeleton`.
- Keep all other branches unchanged.
- Keep existing fetch/upstream tracking as-is.

## Non-Goals

- Changing the default push target for the whole repository.
- Renaming remotes.
- Modifying any tracked source code.

## Recommended Approach

Set the local git config key:

```ini
[branch "mvp-platform-skeleton"]
	pushRemote = origin
```

## Why

- Smallest possible blast radius: only the current branch is affected.
- Aligns explicit push behavior with the current upstream, which already points to GitLab `origin`.
- Avoids changing push defaults for other branches that may still need different remotes.

## Verification

Confirm:

1. `git config --get branch.mvp-platform-skeleton.pushRemote` returns `origin`
2. `git remote get-url origin` still points to the GitLab repository
3. `git push` on this branch will resolve to GitLab by default
