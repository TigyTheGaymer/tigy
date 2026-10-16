# Tasks

UI scope: public screens use minimal, unstyled markup, just enough to meet the specs and their tests. Layout and look are deferred to the separate UI/UX change.

## 1. NSFW

- [ ] 1.1 Define the composite index (`published`, `sortDate`, id) for lists that include NSFW; verify the paging query runs without index errors against the emulator
- [ ] 1.2 Build the "show NSFW" switch remembered in the browser and applied after hydration; verify that server HTML never contains NSFW images and that the switch persists across reloads
- [ ] 1.3 Build the NSFW confirm screen (server-rendered, skipped when the switch is on) and `noindex` on NSFW pages; verify with server-HTML tests
- [ ] 1.4 Make the other versions in the same set follow the switch; verify with tests for both spec scenarios

## Workflow follow-up

- Archive this change after implementation and review, after `add-public-gallery` and before `add-artists`.
