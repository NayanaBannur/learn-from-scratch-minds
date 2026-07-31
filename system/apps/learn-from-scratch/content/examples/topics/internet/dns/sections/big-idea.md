In 1987, Paul Mockapetris specified DNS in **RFC 1034** and **RFC 1035** to replace that single file. [[cite:rfc1034]]

The core idea is to make the directory **distributed and hierarchical**. Instead of one list, the name space is split into a tree, and different organisations run different parts of it.

No server holds all the names. Each one knows its own slice and where to send you for the rest. This is what lets DNS grow to billions of names while every lookup still finds its answer.
