### Design Decisions & Rationale
We investigated building a native Shopify Flow to automatically tag orders with the shipping label cost (`Label: <price>`). Extensive research confirms this is **impossible** because Shopify Flow does not expose label costs or native "label created" triggers; label costs are sequestered in Shopify Billing data.

You are completely correct: we *already* capture tracking numbers and carrier names natively in our `fulfillments/create` webhook. The only missing piece of the puzzle is the **Label Cost**, which Shopify deliberately hides from Webhook payloads and Shopify Flow variables.

## Research Findings
1. **Missing Trigger**: Shopify Flow lacks a "Shipping Label Created" trigger. "Fulfillment created" is the closest proxy, but it doesn't isolate the actual label purchase event reliably.
2. **Missing Data Payload**: Shipping label costs are classified as internal billing charges by Shopify. They are not exposed in the standard GraphQL `Fulfillment` or `Order` payloads accessible to Shopify Flow variables.
3. **Conclusion**: We cannot build a zero-code Shopify Flow to achieve the `Label: <price>` tagging requirement.

## Proposed Alternative
Since Shopify absolutely refuses to hand over the Shipping Label cost in Webhooks or Flow, we only have two remaining options to achieve 100% accurate financial tracking:

1. **The CSV Route (Already Built)**: You continue using the `feat/billing-csv-importer` we built to periodically upload Shopify's billing CSV, which natively matches exact label costs to orders in the database.
2. **The 3rd Party API Route**: If you use a 3rd party tool to buy labels (like PirateShip, ShipStation, or Shippo), we can bypass Shopify entirely and write a webhook to intercept *their* payloads, which usually contain exact label costs. If you buy labels directly through Shopify, option 1 is the only reliable way.

## User Review Required
> [!WARNING]
> Native Shopify Flow cannot solve this requirement. I recommend we mark this `research/shopify-flow-auto-tag` task as complete (finding: impossible).
> 
> Please review this updated finding. If you agree that we must rely on the CSV importer (or a 3rd party integration later), type **proceed** to conclude this research branch and archive the task.
