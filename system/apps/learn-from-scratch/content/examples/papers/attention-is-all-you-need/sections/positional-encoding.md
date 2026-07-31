# Sinusoidal positional encoding

The model adds a **positional encoding** to each token's embedding — a vector that depends only on the token's position, so the sum carries both *what* the word is and *where* it sits [[cite:transformer]].

The paper builds each position's vector from sine and cosine waves of different frequencies, one pair per dimension $i$:

$$PE_{(pos,\,2i)} = \sin\!\left(\frac{pos}{10000^{2i/d_{\text{model}}}}\right) \qquad PE_{(pos,\,2i+1)} = \cos\!\left(\frac{pos}{10000^{2i/d_{\text{model}}}}\right)$$

Low dimensions use fast waves that flip between neighbouring positions; high dimensions use slow waves that drift across the whole sentence. Together they give every position a distinct fingerprint.

```diagram
{ "type": "svg", "src": "assets/positional-encoding.svg" }
```

Because the waves are smooth, nearby positions get similar encodings — so the model can read *relative* distance, not just absolute position.
