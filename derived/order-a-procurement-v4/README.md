# Selected Order A mule baseline — 2026-10-31

Agent-researched package for the owner's hobby/learning robot project. **No parts have been ordered or physically tested.** This is the owner-approved baseline for continued design and simulation, not an ordered kit, final competition robot BOM or evidence of hardware validation.

## Selected baseline

Build the mule around **two Pololu #4754 70:1 12 V 37D gearmotors with 64 CPR encoders**, using machined brackets, 6 mm hubs, 80 mm silicone-tired wheels and two support casters. The 70:1 version balances speed and torque; #4753 and #4755 remain documented alternatives.

- **Priced Order A subtotal:** **$177.25**
- **Stamped-bracket alternative:** **$163.30**
- **Shipping, tax and unpriced consumables:** not included
- Pololu pages advertise free shipping in USA over $100; destination, eligibility, method and delivery date were not verified, so this is not a landed quote.
- **Working budget target:** $750.00
- **Contingency within working target after Order A and later reserves:** $112.75
- **Additional room to the $1,000 cap:** $250.00

## Why this is only a screen

At the explicit 80 mm mule variant, the arithmetic gate is **72.76564 loaded RPM** and **0.144624 N·m per side**. The #4754 maximum-efficiency point is 130 RPM and 0.313813 N·m. These manufacturer values do not establish robot loaded RPM, traction, current, thermal margin or mission performance. No driver or battery is selected.

## Budget reserves

| Later stage | Planning reserve |
|---|---:|
| controller and sensors | $120.00 |
| driver distribution protection | $100.00 |
| battery and charger | $100.00 |
| mechanism | $80.00 |
| harness and consumables | $60.00 |

These are allocations, not quotes. Unpriced Order A consumables and landed costs draw from contingency.

## Documents

- [Motor comparison](motor-comparison.md): requirements, manufacturer operating points, encoder interface and CAD
- [Order A BOM](order-a-bom.md): line items, alternatives and compatibility notes
- `order-a-bom.csv`: purchase-review table
- `report.json`: complete computed report
- `budget.json`: subtotal and reserves
- `source-manifest.json`: archived source URLs, byte counts and SHA-256 hashes
- `manifest.json`: input/output freshness hashes

Primary manufacturer pages and engineering files are archived under `sources/hardware-2026-10-31/pololu/`. The archive includes performance data, dimensions and STEP models. Prices and availability must be refreshed before any order.

## Before purchase

1. Owner reviews the primary/alternative ratio and 80 mm versus printed 3-inch wheel choice.
2. Confirm FAU supervision, measurement equipment, secured test space and battery policies; scope unpriced consumables.
3. Recheck live price, quantity, stock/lead time, shipping and tax. Do not treat Backorder/Add to cart labels as delivery promises.
4. If approved by the owner, place Order A only. Do not add the driver, battery, controller or mechanism actuator to this order.
5. Record received-part IDs and measurements, then run E02A. Select driver/protection from measured data before E02B/E03.

## Regenerate and verify

From `/workspace/ieee/ieee`:

```sh
node tools/order-a-procurement-v4.js
node tools/verify-order-a-procurement-v4.js
node --test tests/order-a-procurement-v4.test.js
```

The generator performs no network request; it reproduces calculations and hashes from the dated local evidence snapshot.
