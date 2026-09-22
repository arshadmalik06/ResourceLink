import { paymentMiddleware, x402ResourceServer } from '@x402-avm/express';
import { HTTPFacilitatorClient } from '@x402-avm/core/server';
import { registerExactAvmScheme } from '@x402-avm/avm/exact/server';
import { supabase } from './supabase.js';
import 'dotenv/config';

const facilitator = new HTTPFacilitatorClient({
    url: process.env.FACILITATOR_URL || 'https://facilitator.goplausible.xyz'
});
const x402Server = new x402ResourceServer(facilitator);
registerExactAvmScheme(x402Server);

const ALGORAND_TESTNET = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";

export const requirePayment = (amount) => {
    return paymentMiddleware(
        {
            "*": {
                accepts: [
                    {
                        scheme: 'exact',
                        network: ALGORAND_TESTNET,
                        payTo: process.env.ALGORAND_RECEIVER_WALLET,
                        price: amount.toString()
                    }
                ],
                description: "Booking settlement"
            }
        },
        x402Server
    );
};

export const requireDynamicPayment = async (req, res, next) => {
    try {
        const { slotId } = req.body;

        if (!slotId) {
            return res.status(400).json({ success: false, error: "slotId is required for payment settlement." });
        }

        // Fetch the time slot and resource rate
        const { data: slot, error: slotError } = await supabase
            .from('time_slots')
            .select(`
                id,
                resources (
                    hourly_rate_algo
                )
            `)
            .eq('id', slotId)
            .single();

        if (slotError || !slot || !slot.resources) {
            return res.status(404).json({ success: false, error: "Time slot or resource not found to determine payment." });
        }

        const price = slot.resources.hourly_rate_algo;

        if (price === undefined || price === null) {
            return res.status(400).json({ success: false, error: "Resource does not have a valid algo rate." });
        }

        // MVP DEMO MODE: Route all payments to the central ALGORAND_RECEIVER_WALLET
        // so you can show the ALGO accumulating in one place during the demo.
        const paymentMiddlewareInstance = requirePayment(price);

        return paymentMiddlewareInstance(req, res, next);
    } catch (error) {
        return res.status(500).json({ success: false, error: "Failed to resolve payment rate dynamically: " + error.message });
    }
};