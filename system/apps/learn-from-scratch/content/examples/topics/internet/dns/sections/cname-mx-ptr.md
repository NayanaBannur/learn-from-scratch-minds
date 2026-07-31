A few more record types cover everyday needs — aliases, mail, and reverse lookups. [[cite:rfc1035]]

| Type | Maps | Used for |
|------|------|----------|
| **CNAME** | one name → another name | an alias, e.g. `www.example.com` → `example.com` |
| **MX** | a domain → a mail server, with a preference number | routing email for the domain |
| **PTR** | an IP address → a name | the **reverse** lookup: address back to name |

A **CNAME** says "this name is really that name; look that one up instead." An **MX** record's preference number lets a domain list backup mail servers, lowest number tried first. A **PTR** record runs DNS backwards, which mail servers use to sanity-check who is connecting.
