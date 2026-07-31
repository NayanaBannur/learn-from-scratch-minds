# Training setup

The models were trained on standard machine-translation benchmarks: WMT 2014 English–German (about 4.5M sentence pairs) and the larger English–French set [[cite:transformer]].

Hardware and schedule:

- **8 NVIDIA P100 GPUs**; the base model trained for 100,000 steps (about 12 hours), the big model for 300,000 steps (3.5 days).
- **Adam** optimizer with $\beta_1 = 0.9$, $\beta_2 = 0.98$; the learning rate warms up for 4,000 steps, then decays.

Two forms of regularization:

- **Dropout** of $0.1$, applied to each sub-layer's output and to the embedding sums.
- **Label smoothing** of $0.1$ — the target is softened away from a hard 1.0, which slightly hurts perplexity but improves accuracy and BLEU.
