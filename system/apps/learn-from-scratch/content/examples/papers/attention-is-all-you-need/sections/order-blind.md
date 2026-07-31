# Attention is order-blind

Self-attention treats its input as a **set**, not a sequence. Each output is a weighted sum over all tokens, and a sum does not care about order [[cite:transformer]].

Shuffle the input tokens and the same tokens come out, merely reordered — the computation itself is blind to position. "Dog bites man" and "man bites dog" would look identical to it.

Recurrence never had this problem: reading left to right builds word order in for free. Attention threw that away along with the sequential chain.

So position has to be added back in some other way. The tokens carry *what* each word is; the model still needs *where* each word sits. That missing signal is supplied by positional encoding, next.
