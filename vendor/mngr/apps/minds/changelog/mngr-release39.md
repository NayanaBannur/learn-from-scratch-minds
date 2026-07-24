Released minds 0.3.9: the app now clones the `minds-v0.3.9` default-workspace-template tag.

Fixed the launch-to-first-message e2e harness, red since 2026-07-23. Two failures, one cause: the harness still modelled a window as a single page, and the persistent-chrome-shell work split it into two surfaces.

It reported `no content page on backend origin` while the app was healthy and sitting on `/welcome`, because it matched pages against Playwright's cached `page.url`. main.js drives the window's WebContentsViews from the Electron main process (`webContents.loadURL` / `loadFile`), and those commits do not reliably reach a `connect_over_cdp` client, so Playwright can report the `shell.html` it saw at attach time forever while the view is really on `/welcome`. Page discovery now reads `location.href` from the live document.

Past that, it failed with `net::ERR_CERT_AUTHORITY_INVALID` navigating the chrome view to a workspace, because only the workspace-content session trusts the forward proxy's self-signed loopback cert (and main.js's chrome guard blocks agent URLs there anyway). The harness now keeps local pages on the chrome view and drives chat on the content view, reaching workspaces the way a user does -- letting the app route them, or clicking the tile -- instead of navigating agent URLs itself.

The workspace wait is pinned to the agent host the create returned. A window has one content view, so creating a second workspace repoints the very page the first is still showing; an unpinned wait could match the first workspace mid-handoff and check the second workspace's reply against the first one's transcript -- which already holds its own reply, so it would have passed spuriously.
