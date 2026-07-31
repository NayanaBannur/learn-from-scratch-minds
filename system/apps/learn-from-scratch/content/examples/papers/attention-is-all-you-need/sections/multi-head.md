# Multi-head attention

Multi-head attention runs $h$ attention computations side by side. The base model uses $h = 8$ heads [[cite:transformer]].

Each head gets its own learned projections $W_i^Q, W_i^K, W_i^V$, so it forms its own queries, keys, and values and attends independently:

$$\operatorname{head}_i = \operatorname{Attention}(QW_i^Q,\; KW_i^K,\; VW_i^V)$$

Each head works in a smaller space of size $d_k = d_v = d_{\text{model}}/h = 512/8 = 64$. Splitting the width across heads keeps the total cost the same as one full-width head.

```diagram
{ "type": "svg", "src": "assets/multi-head.svg" }
```

The heads' outputs are concatenated back to full width and passed through one more projection $W^O$ to mix them:

$$\operatorname{MultiHead}(Q,K,V) = \operatorname{Concat}(\operatorname{head}_1, \dots, \operatorname{head}_h)\,W^O$$
