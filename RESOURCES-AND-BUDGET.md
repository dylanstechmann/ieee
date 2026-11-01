# Resources and budget — experimental competition robot

Updated October 31, 2026. Agent-written record of the owner's stated preferences
and proposed next steps; not evidence of purchases, approved access, or hardware tests.

## Current owner planning assumptions — October 31, 2026

- FAU tools and space, including 3D printers and soldering equipment, are assumed
  available. Exact equipment, training, supervision, hours, storage, test space,
  battery/charging policy and charges still require confirmation.
- New motors, batteries and other components are expected to be purchased; the
  design is not constrained to existing or borrowable equipment.
- Initial prototyping budget is **$500–$1,000**, with a **$750 working target**
  and **$1,000 planning cap**. This is not authorization for the agent to order.
- Sourced Order A research is in `derived/order-a-procurement-v4/README.md`.
  Its selected required-parts subtotal is **$177.25** before shipping, tax and unpriced
  consumables. No parts are ordered or physically validated.

## Earlier starting point (historical)

- No existing robot parts. Home tool inventory is unknown, not necessarily empty.
- Approximately $100 was an initial affordability preference, **not a hard cap**.
  Exceeding it is acceptable for now; no replacement spending ceiling is agreed.
- Strong competition performance is the objective, not a guaranteed outcome at any price.
- This is a one-off experimental device, not a wholesale/volume-production product.
  Do not optimize for production tooling, distribution, or speculative volume prices.
- School supplies/lab access may be possible after talking to staff; permission,
  equipment, availability, training, and charges are all unconfirmed.
- Home equipment is also an option, not a commitment to buy a workshop.
- The previous conversational $100 allocation was illustrative and unpriced. It is
  **not an approved bill of materials or validated purchasing baseline**.

## Option A — school-lab-supported build

Proposed arrangement: use approved school facilities for fabrication, assembly,
measurement, and testing; buy or borrow robot-specific components as permitted.

### Ask school staff

- Who authorizes access, provides training, and can advise or supervise?
- Which soldering equipment, multimeters, bench supplies, hand/measuring tools,
  printers, and machining facilities are actually available?
- What induction, supervision, booking, access hours, and exam/holiday limits apply?
- Are materials, printing, consumables, or machine time charged? Is funding available?
- Can the robot and practice-field sections be stored? Is there driving-test space?
- What battery charging/storage policies apply?
- May borrowed equipment/components leave the lab or travel to competition?
- Who owns funded parts and fabricated components? What must be returned, and when?
- What fallback is available if a key machine or lab session becomes unavailable?

Track robot purchases, fabrication/material charges, consumables, test fixtures,
spares, and any transport separately. Borrowed equipment is an access dependency
with return conditions, not owned equipment or guaranteed free access.

## Option B — home-supported build

Proposed arrangement: assemble, troubleshoot, and conduct suitable tests at home;
obtain specialized fabrication elsewhere as needed.

### Inventory and workspace checklist

- Record existing and borrowable tools before producing a shopping list.
- Identify electronics assembly/measurement needs: soldering equipment, multimeter,
  wire preparation, connectors, and other test equipment justified by experiments.
- Identify mechanical needs: drivers, cutters, measuring tools, clamps, workholding.
- Establish suitable workspace, lighting, ventilation, storage, and permission for use.
- Confirm a suitable battery/charger combination and applicable policies before
  purchase. This planning record is not an electrical or charging safety procedure.
- Identify driving-test space and practice-field storage.
- Separate reusable tools from robot hardware in the budget.

A home 3D printer, machine tools, and full-size practice field are **not automatic
purchases**. Compare school access, outsourcing, simpler fabrication, and small fixtures.

## Hybrid working proposal

Keep both options open: school facilities for specialized fabrication and larger
tests, with selective home assembly/troubleshooting capability. This is an agent
proposal, not confirmed access or owner approval to spend.

Choose after comparing access reliability, travel/setup time, recurring charges,
storage, and the ability to repeat experiments. Revisit if school access changes.

## Separate cost categories

| Category | Scope | Current status |
|---|---|---|
| Robot hardware | Drive, control, sensing, mechanisms, structure, power | Order A digital mule selected and archived at $177.25 before landed costs; remaining hardware unselected |
| Reusable tools | Owned assembly, measurement, workshop equipment | Inventory/access check pending |
| Field/test fixtures | Tire/docking fixtures, field sections, test materials | Scope pending |
| Consumables/spares | Wiring, fasteners, replacement parts, failed fabrication | Not priced |
| Shipping/tax | Actual landed costs of orders | Not quoted |
| Event/logistics | Registration, travel, transport, accommodation if applicable | Separate scope; unknown |

Archived supplier research and Order A subtotals are recorded above; these are not
live checkout quotes. No purchases, landed total, or authority for the agent to place orders have been approved. In hybrid
totals, count shared items once and identify borrowed resources explicitly.

### Later purchase record

```text
Item / quantity / specification / experiment enabled:
Owned, borrowed, donated, or to purchase:
Supplier / quote date / unit cost / shipping and tax / total:
Compatibility and performance evidence:
School access alternative / borrowing terms:
Lead time / replacement availability / fallback:
Decision owner / approval / actual spend:
```

Prioritize spending by experiment and risk retired, not cheapest unverified parts
or a claim that spending guarantees winning. Do not buy a complete chassis before
assessing drivetrain-constrained navigation and mechanism packaging against the
unresolved field assumptions. Differential drive remains a candidate, not a final design.

## Next actions

1. Owner: review the selected #4754/80 mm baseline in
   `derived/order-a-procurement-v4/README.md`, record any club/FAU substitution,
   refresh landed price/availability, and decide whether to place Order A. The agent
   has not placed an order.
2. Confirm FAU supervision, measurement equipment, lab procedures, test space and
   battery/charging policy in `derived/hardware-development-v3/owner-input.md`.
3. Engineering baseline completed: `hardware-development-v3.json` and its derived
   report define drivetrain requirements, component gates and E00–E05 experiments.
   They do not select final components or authorize spending.
4. Complete the readiness gates in `/workspace/ieee/ieee/derived/drivetrain-mule-v4/bench-readiness.md`:
   receipt/E02A → approved provisional bench setup → E02B → low-energy commissioning
   → E03 and final driver/power review. The provisional bench driver is a bounded
   experiment-setup choice, not a final robot component selection. No setup is approved.
   Run E01 tire characterization and the common E04 mechanism comparison before a
   mechanism freeze; use measured operating/transient evidence for final driver/battery decisions.
   Unprinted geometry coupons and true-scale alignment templates are prepared in
   `/workspace/ieee/ieee/derived/mechanism-prototyping-v3/`; their digital checks are
   not print, fit or mechanism validation.
5. Revisit the $750 working target and later reserves using actual landed costs and
   E02/E03 results. Do not convert the complete candidate into one large early order.

Related: `/workspace/ieee/ieee/EXECUTION.md`,
`/workspace/ieee/ieee/STRATEGY-AND-ARCHITECTURE.md`,
`/workspace/ieee/ieee/derived/navigation-v3/README.md`.