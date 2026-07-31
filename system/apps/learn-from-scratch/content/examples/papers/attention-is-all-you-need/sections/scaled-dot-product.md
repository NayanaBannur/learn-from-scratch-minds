# Scaled dot-product attention

The paper packs every token's query into a matrix $Q$, every key into $K$, and every value into $V$, then computes all lookups at once [[cite:transformer]]:

$$\operatorname{Attention}(Q,K,V) = \operatorname{softmax}\!\left(\frac{QK^{\top}}{\sqrt{d_k}}\right)V$$

Read it in three moves:

- $QK^{\top}$ scores every query against every key with a **dot product** — larger when a query and key point the same way, so it measures match strength.
- $\operatorname{softmax}$ turns each query's row of scores into weights that are positive and sum to one — a soft choice over all tokens.
- Multiplying by $V$ blends the values by those weights.

The term $d_k$ is the length of a key vector. Dividing by $\sqrt{d_k}$ is the one adjustment that keeps this stable at scale — the next step explains why.
