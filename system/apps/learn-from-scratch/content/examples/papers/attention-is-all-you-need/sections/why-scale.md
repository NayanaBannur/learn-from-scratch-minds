# Why the square-root scaling

A dot product sums $d_k$ products, one per dimension. If the query and key entries behave like independent unit-variance numbers, that sum has variance $d_k$ — so its typical size grows with the key length [[cite:transformer]].

With $d_k = 64$, raw scores swing across a range wide enough to matter. Feed large scores into softmax and it saturates: almost all weight lands on a single token, and the others get gradients near zero.

A saturated softmax barely responds to change, so learning stalls where the scores are already extreme.

Dividing by $\sqrt{d_k}$ rescales the scores back to unit variance, whatever the key length. The softmax stays in its responsive range, and gradients keep flowing during training.
