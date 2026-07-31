# The feed-forward network

Attention mixes information *between* tokens. The feed-forward network then processes *each token on its own* [[cite:transformer]]:

$$\operatorname{FFN}(x) = \max(0,\; xW_1 + b_1)\,W_2 + b_2$$

It is two linear layers with a $\operatorname{ReLU}$ between them — the same small network applied at every position, which is why the paper calls it *position-wise*.

The first layer expands each token from $d_{\text{model}} = 512$ up to $d_{\text{ff}} = 2048$; the second brings it back to 512.

That wide middle gives each token room to recombine the features attention just gathered, before the width collapses back for the next layer. Attention decides *what to look at*; the feed-forward network decides *what to make of it*.
