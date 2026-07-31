# The problem with recurrence

By 2017, the best translation models were **recurrent**: they read a sentence one token at a time, carrying a running summary — the *hidden state* — forward from each token to the next [[cite:seq2seq]].

That left-to-right chain is the bottleneck. Token $t$ cannot be processed until token $t-1$ is done, so the work along a sentence **cannot be parallelized** [[cite:transformer]].

It also stretches memory thin. To link two distant words, the hidden state must carry information across every step between them, and detail fades over that distance [[cite:bahdanau]].

So a recurrent model is slow to train and weak at long-range links — the two problems this paper sets out to remove.
