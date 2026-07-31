# The proposal: attention alone

The paper, published in June 2017, makes one radical cut: **remove recurrence entirely**. No step-by-step chain, no convolution — only *attention* [[cite:transformer]].

Attention is a mechanism that lets each token look directly at every other token in one step, and pull in what it needs from them. Earlier models used it as a helper bolted onto a recurrent core [[cite:bahdanau]].

This paper makes attention the whole model. The authors call the result the **Transformer**.

Because every token's lookup happens at once, the whole sentence is processed **in parallel**, and any two tokens are a single step apart — directly answering the two problems recurrence left behind.
