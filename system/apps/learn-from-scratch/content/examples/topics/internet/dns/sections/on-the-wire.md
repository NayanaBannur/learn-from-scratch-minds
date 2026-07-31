A DNS lookup is normally a single round trip. The resolver sends one **query** packet and gets back one **response** packet, over **UDP** on **port 53**. [[cite:rfc1035]]

UDP is a fire-and-forget transport with no connection setup, which keeps a lookup cheap and fast.

Both packets share one message format: a header, the **question** (the name and type being asked), and — in the response — **answer** records, plus space for authority and additional records. The response repeats the question and fills in the answer.
