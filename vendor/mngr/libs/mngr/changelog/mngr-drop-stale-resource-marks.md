Fixed four tutorial release tests that failed on every release run because they declared a resource they never touch.

The resource guards fail a test that carries `@pytest.mark.modal` or `@pytest.mark.rsync` without exercising that resource ("marked with X but never invoked X"). `test_list_json_with_no_agents` was marked `modal`, but with no agents the Modal environment does not exist yet, so `mngr list` skips the modal provider and never invokes the CLI -- its near-twin `test_list_active_filter` already carries a comment explaining exactly this. `test_destroy_dry_run`, `test_destroy_with_gc` and `test_create_with_label` were marked `rsync`, but a dry run moves no files and local in-place agents never shell out to rsync.

Dropping the inaccurate marks is what the guard's own message prescribes. Each now carries a short note saying why the mark is absent, so it does not get added back.
