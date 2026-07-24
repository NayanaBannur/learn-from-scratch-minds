`release-tests.yml` now runs the release suite on Linux instead of the entire monorepo test suite.

The Linux branch of the sharded `test-mngr-release` job had no `-m` marker filter, so each of its 12 shards ran every unit, integration, acceptance and release test it was given -- under the 90-second per-test timeout meant for release tests. In the last run, ubuntu shard 1 executed ~1400 tests where macOS shard 1 (which had the filter) executed 36. That is why this workflow has never reported green, and why its failures were dominated by tests that are not part of the release suite at all.

Both platforms now select `release and not docker and not docker_sdk`. Docker-marked release tests keep running in `test-mngr-release-docker`, which provisions the daemon and registry mirror they need.

The same job also never raised the pytest suite deadline. `IS_RELEASE=1` alone caps a run at 600 seconds, and every shard exceeds that -- the slowest observed is 1624s -- so each one was killed at the ten-minute mark and exited non-zero no matter how its tests went. Worse, the cap fires before pytest prints its failure summary, so a red shard reported no tracebacks at all, which is why these failures were so hard to read. The job now budgets per shard.
