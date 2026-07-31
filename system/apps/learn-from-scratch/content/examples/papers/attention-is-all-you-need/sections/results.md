# Results and legacy

On WMT 2014 the big Transformer set new state-of-the-art scores — **28.4 BLEU** on English–German and **41.8 BLEU** on English–French, beating every prior single model and even ensembles [[cite:transformer]].

BLEU scores a translation by how much it overlaps with human reference translations; higher is better. The German result improved on the previous best by over 2 BLEU.

It reached this at **a fraction of the training cost** of the recurrent and convolutional models it beat — the parallelism paid off.

The lasting impact runs deeper than translation. Dropping recurrence for attention made models that scale cleanly on modern hardware, and the Transformer became the backbone of nearly every large language model that followed. The title turned out to be literal: attention was all you needed.
