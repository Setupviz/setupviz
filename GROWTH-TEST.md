# SetupViz organic growth test

Run one worked example for each audience over two weeks. Each example opens in the existing builder. Show one change, then invite people to try the same change on their desk. Keep the three demos comparable by starting with a single post for each audience and recording when and where each went out.

## Competitive gaming

**Hook:** How much mouse-pad room does a 34-inch ultrawide leave on a 48 × 24 desk?

Start with the Samsung Odyssey G5 34-inch on its stock stand, Logitech G PRO X TKL LIGHTSPEED, Logitech G PRO X3 SUPERSTRIKE, and Razer Gigantus V2 Medium. All four fit on a 48 × 24-inch desk. Swap to the SteelSeries QcK Heavy Large and show it running under the monitor stand. Keep that pad selected and change the depth to 30 inches to see it fit.

**Post draft:** I built SetupViz after buying gear that didn’t fit the way I expected and having to replace it. On a 48 × 24 desk with a 34-inch Odyssey G5, the medium Razer pad fits. A larger SteelSeries pad runs under the monitor stand in the same spot. Try the layout with your own dimensions and see which size you’d buy.

[Try locally](http://localhost:8787/builder?s=eyJ2IjoxLCJkIjpbMTIxOSw2MTBdLCJwIjp7Im0iOiJzYW1zdW5nbGMzNGc1NXQiLCJrIjoidGtsIiwicCI6ImNsb3RobSIsIm8iOiJncHgzc3VwZXJzdHJpa2UifSwieCI6eyJtIjpbMjA2LjIsMjBdLCJrIjpbMjg5LjUsMzUwXSwicCI6WzcyOS41LDMwNV0sIm8iOls4NzcuNzUsMzgwXX0sImEiOlsiIiwiIiwiIl19&demo=gaming) · [Link to share](https://setupviz.com/builder?s=eyJ2IjoxLCJkIjpbMTIxOSw2MTBdLCJwIjp7Im0iOiJzYW1zdW5nbGMzNGc1NXQiLCJrIjoidGtsIiwicCI6ImNsb3RobSIsIm8iOiJncHgzc3VwZXJzdHJpa2UifSwieCI6eyJtIjpbMjA2LjIsMjBdLCJrIjpbMjg5LjUsMzUwXSwicCI6WzcyOS41LDMwNV0sIm8iOls4NzcuNzUsMzgwXX0sImEiOlsiIiwiIiwiIl19&demo=gaming)

## Remote work

**Hook:** How much desk width do you get back by swapping out the number pad?

Open a 120 × 60 cm desk with a Dell S2725QC, Logitech MX Keys S, Logitech MX Master 3S and SteelSeries QcK Medium. Swap the keyboard for the MX Mechanical Mini. Both layouts fit, and the keyboard itself takes up about 4.6 inches (11.7 cm) less width in the same position. The mouse and pad still occupy space to its right.

**Post draft:** I wanted to see what a smaller keyboard buys you on a work desk. On this 120 × 60 cm setup, I swapped an MX Keys S for an MX Mechanical Mini. The smaller keyboard frees about 4.6 inches of width in the same spot. If you use the number pad, try moving the full-size board instead and see which layout you’d rather work at.

[Try locally](http://localhost:8787/builder?s=eyJ2IjoxLCJkIjpbMTIwMCw2MDBdLCJwIjp7Im0iOiJzMjcyNXFjIiwiayI6ImZ1bGwiLCJwIjoicWNrbSIsIm8iOiJteG0zcyJ9LCJ4Ijp7Im0iOlsyOTQuMjMsMjBdLCJrIjpbMjgwLDM0MF0sInAiOls3MjAsMzAwXSwibyI6WzgzNy44NSwzNzIuNTVdfSwiYSI6WyIiLCIiLCIiXX0&demo=remote-work) · [Link to share](https://setupviz.com/builder?s=eyJ2IjoxLCJkIjpbMTIwMCw2MDBdLCJwIjp7Im0iOiJzMjcyNXFjIiwiayI6ImZ1bGwiLCJwIjoicWNrbSIsIm8iOiJteG0zcyJ9LCJ4Ijp7Im0iOlsyOTQuMjMsMjBdLCJrIjpbMjgwLDM0MF0sInAiOls3MjAsMzAwXSwibyI6WzgzNy44NSwzNzIuNTVdfSwiYSI6WyIiLCIiLCIiXX0&demo=remote-work)

## First desk setup

**Hook:** What actually fits on a 40 × 20-inch desk?

Open a 40 × 20-inch desk with a Dell S2425HSM, Logitech MX Mechanical Mini, Logitech G Pro X Superlight 2 and SteelSeries QcK Medium. All four fit. Swap to the SteelSeries QcK Heavy Large and show it running under the monitor stand. Invite people to try moving the pad or resizing the desk.

**Post draft:** If you’re planning your first setup around a small desk, here’s a 40 × 20-inch layout you can move around. The medium mouse pad fits. The large pad runs under the monitor stand. Try the two sizes on your own desk before you order and see how much room you’d actually have.

[Try locally](http://localhost:8787/builder?s=eyJ2IjoxLCJkIjpbMTAxNiw1MDhdLCJwIjp7Im0iOiJtb24yNCIsImsiOiJrNzUiLCJwIjoicWNrbSIsIm8iOiJncHgyIn0sIngiOnsibSI6WzIzOS4xOCwyMF0sImsiOlsxODgsMjQ4XSwicCI6WzYyOSwyMDhdLCJvIjpbNzU3LjI1LDI4MC41XX0sImEiOlsiIiwiIiwiIl19&demo=first-setup) · [Link to share](https://setupviz.com/builder?s=eyJ2IjoxLCJkIjpbMTAxNiw1MDhdLCJwIjp7Im0iOiJtb24yNCIsImsiOiJrNzUiLCJwIjoicWNrbSIsIm8iOiJncHgyIn0sIngiOnsibSI6WzIzOS4xOCwyMF0sImsiOlsxODgsMjQ4XSwicCI6WzYyOSwyMDhdLCJvIjpbNzU3LjI1LDI4MC41XX0sImEiOlsiIiwiIiwiIl19&demo=first-setup)

## Read the results

The Worker uses its existing `CLICKS` binding. Substitute the dataset name if it differs from `setupviz_clicks`. Once live, open each public link and check that its category appears before posting.

```sql
SELECT blob3 AS audience, blob2 AS action, SUM(_sample_interval) AS total
FROM setupviz_clicks
WHERE blob1 = 'event' AND blob3 IN ('gaming', 'remote-work', 'first-setup')
  AND timestamp >= NOW() - INTERVAL '14' DAY
GROUP BY blob3, blob2
ORDER BY blob3, blob2
```

```sql
SELECT blob4 AS audience, blob1 AS link_type, SUM(_sample_interval) AS clicks
FROM setupviz_clicks
WHERE blob1 IN ('item', 'cart') AND blob4 IN ('gaming', 'remote-work', 'first-setup')
  AND timestamp >= NOW() - INTERVAL '14' DAY
GROUP BY blob4, blob1
ORDER BY blob4, blob1
```

At two weeks, compare first edits per demo open and Amazon clicks per demo open. Use share and image-save actions as secondary signals. Report opens as visits, and share and save actions as attempts. Continue to watch `demo_return_edit` for edits to the same demo on a later day within 90 days in the same browser. Treat it as a count of return edits observed through those demo links. It does not estimate unique users, cross-device returns, or all builder retention. Compare total outbound clicks with Amazon Associates shipped orders and commissions. Existing Amazon tags are based on link placement, so commissions are not split by audience.
