Plain DNS has no way to prove an answer is genuine. A machine positioned between you and the resolver could forge a reply and send you to the wrong address. **DNSSEC** (DNS Security Extensions, 2005) closes that gap. [[cite:rfc4033]]

Each zone signs its records with a private key. A resolver can verify the signature against the zone's public key, confirming the answer really came from the zone owner and was not altered. [[cite:rfc4033]]

The keys form a **chain of trust**: each zone's key is vouched for by its parent — the domain by its TLD, the TLD by the root — so a resolver only has to trust the root's key to check the whole path. DNSSEC proves an answer is authentic; it does not hide it.
