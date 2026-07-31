# Inside an encoder layer

Each encoder layer has just two sub-layers, in order [[cite:transformer]]:

1. **multi-head self-attention** — every token gathers context from the whole sentence;
2. a **feed-forward network** — applied to each token on its own (the next step).

Around each sub-layer sits the same wrapper:

$$\operatorname{LayerNorm}\bigl(x + \operatorname{Sublayer}(x)\bigr)$$

The $x +$ is a **residual connection**: the sub-layer's output is *added* to its input rather than replacing it, so the original signal always has a clear path forward and gradients reach deep layers intact [[cite:resnet]].

$\operatorname{LayerNorm}$ then rescales each token's vector to a stable mean and variance, keeping activations well-behaved as they pass through all six layers [[cite:layernorm]].
