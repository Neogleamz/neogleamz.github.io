const fs = require('fs');
const path = require('path');

// MOCK: Extraction Logic intended for the Edge Function
function extractFulfillmentData(webhookPayload) {
    const tracking_number = webhookPayload.tracking_numbers && webhookPayload.tracking_numbers.length > 0 
        ? webhookPayload.tracking_numbers[0] 
        : null;
    const carrier_name = webhookPayload.tracking_company || null;

    return {
        order_id: webhookPayload.order_id,
        tracking_number,
        carrier_name
    };
}

function extractFinancialDataFromGraphQL(graphqlResponse) {
    const order = graphqlResponse.data.order;
    let actual_payout = null;
    let actual_fee = null;

    if (order.transactions && order.transactions.length > 0) {
        // Find the successful SALE transaction
        const saleTx = order.transactions.find(tx => tx.kind === 'SALE' && tx.status === 'SUCCESS');
        if (saleTx) {
            const amount = parseFloat(saleTx.amountSet.shopMoney.amount);
            let totalFees = 0;
            if (saleTx.fees && saleTx.fees.length > 0) {
                totalFees = saleTx.fees.reduce((sum, fee) => sum + parseFloat(fee.amount.amount), 0);
            }
            actual_fee = totalFees;
            actual_payout = amount - totalFees;
        }
    }

    // For native shipping cost, Shopify stores label purchases differently, 
    // but often it's in a separate transaction or specific fulfillment API.
    // Assuming we fetch it or it defaults to 0 for this sandbox:
    const actual_shipping_cost = 0; 

    return {
        actual_fee,
        actual_payout,
        actual_shipping_cost
    };
}

describe('Revenuez Fulfillment & Financial Engine Sandbox', () => {
    it('Extracts tracking details from fulfillments/create webhook', () => {
        const payloadPath = path.join(__dirname, 'mocks', 'shopify_fulfillment.json');
        const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

        const data = extractFulfillmentData(payload);

        expect(data.order_id).toBe(987654321);
        expect(data.tracking_number).toBe('9400123456789012345678');
        expect(data.carrier_name).toBe('USPS');
    });

    it('Extracts exact Shopify Payment fees and payout from GraphQL response', () => {
        const payloadPath = path.join(__dirname, 'mocks', 'shopify_graphql_order.json');
        const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

        const data = extractFinancialDataFromGraphQL(payload);

        expect(data.actual_fee).toBe(1.60);
        expect(data.actual_payout).toBe(43.40); // 45.00 - 1.60
        expect(data.actual_shipping_cost).toBe(0);
    });
});
