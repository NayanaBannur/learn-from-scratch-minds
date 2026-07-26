Two additive, default-preserving provider knobs supporting the upcoming /home/user workspace data layout:

- The docker provider's new `volume_mount_path` mounts the per-host volume at a configurable path (e.g. `/home/user`) with `host_dir` as a directory inside it, instead of mounting at `host_dir` directly. Requires `isolate_host_volumes=true`; the choice is persisted per host record and replayed on start and snapshot restore.

- A new `host_log_dir` config on every provider instance directs mngr's plain-text service logs (shutdown, activity watcher, volume sync) outside `host_dir` (e.g. to `/var/log/mngr`), keeping regenerable diagnostics out of backed-up data. Default unchanged (`<host_dir>/logs`).
