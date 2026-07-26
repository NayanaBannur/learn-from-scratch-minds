Adaptations for the /home/user workspace data layout and env-converge:

- The in-place backup restore rewinds the backup root (`/home/user`; legacy `/mngr` workspaces keep their old target), and its restart-all step re-runs the `env-converge` one-shot so a restored environment record converges installed packages as well as files.

- minds-authored provider blocks (imbue_cloud accounts and byok aws/gcp/azure) now carry the layout knobs (`host_dir=/home/user/.mngr`, `volume_home_path=/home/user`, `host_log_dir=/var/log/mngr`).

- The release runbook gains step 0: cut (and warm) the apt snapshot mirror for a new timestamp via the connector admin routes before landing a `.mngr/apt-snapshot-timestamp` bump.
