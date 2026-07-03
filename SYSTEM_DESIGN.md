# System Design Write-up — LastMile Delivery Tracker

## Rate Calculation Engine

The pricing engine lives entirely in one module (`rateEngine.js`) so the same logic can be reused for both the pre-confirmation preview and the actual order creation, guaranteeing the customer never sees a quoted price that differs from what they're charged.

The calculation runs in a fixed sequence. First, volumetric weight is derived from the package dimensions using the standard `(L × B × H) / 5000` formula — this is the convention most Indian logistics providers use, since it approximates how much truck/van space a package occupies relative to its actual mass. Second, the system bills on whichever is greater: actual weight or volumetric weight. This protects revenue on bulky-but-light shipments (think a large box of pillows) that would otherwise be drastically underpriced if billed purely on a kitchen scale reading.

Third, the engine looks up a rate card keyed on three dimensions: pickup zone, drop zone, and order type (B2B or B2C). This was a deliberate design choice — rather than a flat "intra-zone vs inter-zone" multiplier, every zone-to-zone pair gets its own row in the `rate_cards` table, configurable independently by an admin. This means a "Central → East" lane can be priced differently from "East → Central" if traffic patterns or operational cost actually differ between the two, which happens in real logistics networks. Nothing is hardcoded in application code; an admin can add new zones and rate cards without a deployment.

Finally, COD surcharge is applied conditionally based on payment type, again read directly from the matched rate card rather than a global constant, since COD risk/cost can reasonably vary by lane.

## Zone Detection Approach

Given the scope of this assignment, true geocoding (calling out to a maps API for every address) felt like overkill and would introduce an external dependency and cost for something that can be solved more simply. Instead, zone detection works in two passes. The primary method extracts a 6-digit pincode from the free-text address using a regex, then looks it up directly against the `areas` table, where each area is pre-mapped to a zone by an admin. This is fast, deterministic, and mirrors how courier companies have historically built pincode-based serviceability and zone maps long before live geocoding was affordable at scale.

If no pincode is found or it doesn't match a configured area, the system falls back to a substring match against known area names. This fallback exists mainly for demo robustness — production would likely reject addresses without pincodes at form validation, but here I wanted failed zone detection to be visible and debuggable rather than a silent wrong guess, so it returns a clear error asking for a pincode.

## Auto-Assignment Logic

The assignment engine optimizes for two factors in priority order: zone match, then proximity. The SQL query that pulls candidate agents sorts by `(zone_id = pickup_zone_id) DESC` first — this means an agent already operating in the pickup zone is always preferred over a geographically closer agent from a different zone, on the assumption that zone familiarity (knowledge of local streets, traffic patterns, building access) outweighs raw distance in most last-mile contexts.

Within that candidate pool, the Haversine formula computes great-circle distance between each agent's last known GPS coordinates and the pickup point, and the closest available agent is selected. If no agent has reported GPS yet, the system degrades gracefully to the first zone-matched agent rather than failing the assignment.

Agent availability is a simple boolean flag flipped to `false` the moment they're assigned and back to `true` only when the order reaches "Delivered" — deliberately not flipped on "Failed," since a failed delivery still occupied the agent's day and shouldn't make them immediately eligible for a fresh assignment without an explicit reschedule cycle.

## Failed Delivery Handling

A failed delivery is treated as a distinct, recoverable lifecycle branch rather than a dead end. When an agent marks a delivery "Failed," the order's tracking history logs the failure with whatever note the agent provides (e.g. "customer unreachable"), and an email goes out to the customer immediately rather than waiting for them to check a dashboard.

The reschedule flow intentionally resets the order to "Pending" and clears the previously assigned agent, rather than keeping the same agent locked in. This was a conscious tradeoff: keeping continuity with the same agent might feel more "personal," but in practice a failed delivery often means the original agent's route or schedule no longer fits, so giving the system a clean slate to re-run auto-assignment (or let an admin pick deliberately) produces a more reliable second attempt. The `reschedules` table keeps every reschedule request as its own audit row, separate from the immutable `order_tracking` log, so the system can answer "how many times has this order failed" as a first-class query rather than parsing free-text notes.
