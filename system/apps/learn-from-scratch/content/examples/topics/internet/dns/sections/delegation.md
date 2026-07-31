The tree scales because of **delegation**: each level hands off responsibility for the level below it, instead of trying to know everything. [[cite:rfc1034]]

The root operators don't know where `example.com` lives — they only know who runs `com`. The `com` operators don't know your web server — they only know who runs `example.com`.

A **zone** is the slice of the tree one operator actually controls. `example.com`'s owner manages a zone holding `www.example.com`, `mail.example.com`, and so on, and can create names inside it freely without asking anyone.
