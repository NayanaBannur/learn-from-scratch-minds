There are two styles of query, and the split is what makes the system comfortable to use. [[cite:rfc1034]]

Your device makes a **recursive** query: "give me the final answer for `www.example.com`." It hands the whole problem to the resolver and waits for one reply.

The resolver then makes **iterative** queries to the authoritative servers: it asks the root, gets a referral, asks the TLD, gets another referral, asks the domain, and gets the address. Each authoritative server answers only the one step it knows. The resolver does the walking so your device never has to.
