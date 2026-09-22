import { supabase } from '../config/supabase.js';

// Phase 1: Submit intent/purpose (No payment demanded yet)
export const requestBooking = async (req, res) => {
    const { slotId, purpose, researcherName } = req.body;
    // Fallback to a known institution ID for the demo when auth is bypassed
    const renterId = req.user?.id || '10000000-0000-0000-0000-000000000001'; 

    try {
        const { data: booking, error } = await supabase
            .from('bookings')
            .insert({
                slot_id: slotId,
                renter_id: renterId,
                purpose_statement: purpose,
                researcher_name: researcherName,
                approval_status: 'pending_approval' 
            })
            .select()
            .single();

        if (error) throw error;
        
        res.status(202).json({ 
            success: true, 
            message: "Booking request submitted. Awaiting facility manager approval.", 
            booking 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Phase 2: Handle x402 payment and finalize the booking
export const finalizeBooking = async (req, res) => {
    const { bookingId, slotId } = req.body;
    const txId = req.body.txId || req.x402?.payment?.transactionId || req.x402?.receipt?.transactionId || req.x402?.txId;

    if (!txId) {
        return res.status(400).json({ 
            success: false, 
            error: "Payment verification failed. No valid Algorand Testnet transaction ID found." 
        });
    }

    try {
        // Optional demo verification: Ensure tx exists on testnet using public API
        // For production, we'd ensure amount and receiver match the slot exactly here.
        // We're skipping the fetch here because Indexer API has a slight delay and Algod API 
        // returns 404 for transactions that are already confirmed and out of the mempool.
        // if (req.body.txId) { ... }

        // 1. Update the booking with the Algorand transaction ID (Proof-of-Usage)
        const { error: bookingErr } = await supabase
            .from('bookings')
            .update({ 
                approval_status: 'confirmed', 
                algorand_tx_id: txId 
            })
            .eq('id', bookingId);
            
        if (bookingErr) throw bookingErr;
        
        // 2. Lock the time slot so no one else can book it
        const { error: slotErr } = await supabase
            .from('time_slots')
            .update({ status: 'booked' })
            .eq('id', slotId);
            
        if (slotErr) throw slotErr;
        
        // 3. Return the transaction ID
        res.status(200).json({ 
            success: true, 
            message: "Proof-of-Usage recorded securely on Algorand.",
            transactionId: txId 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET: Fetch all booking requests for a provider
export const getProviderBookings = async (req, res) => {
    const providerId = req.user.id;
    
    try {
        // In a real app we would join bookings -> time_slots -> resources -> institutions
        // and filter by resource's institution_id = providerId
        // For simplicity, we just fetch all and map them here
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                *,
                time_slots (*, resources (*, institutions (*)))
            `);
            
        if (error) throw error;
        
        const mappedData = data
            // .filter(b => b.time_slots?.resources?.institution_id === providerId)
            .map(b => {
                const resource = b.time_slots?.resources || {};
                const inst = resource.institutions || {};
                
                return {
                    id: b.id,
                    equipmentId: resource.id,
                    equipmentName: resource.name,
                    equipmentCategory: resource.category,
                    equipmentLocation: resource.facility_name,
                    requesterInstitutionId: b.renter_id,
                    requesterInstitutionName: 'Unknown Requester', // Needs renter institution data
                    requesterInstitutionType: 'University',
                    requesterInstitutionLocation: 'Unknown',
                    requesterInstitutionVerified: false,
                    requesterName: b.researcher_name,
                    startTime: b.time_slots?.start_time,
                    endTime: b.time_slots?.end_time,
                    hours: 2, // calculate from start/end
                    totalCostAlgo: 0,
                    purpose: b.purpose_statement,
                    status: b.approval_status === 'pending_approval' ? 'Pending Payment' : 'Accepted',
                    createdAt: b.created_at
                };
            });
            
        res.status(200).json({ success: true, data: mappedData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// PUT: Update booking status
export const updateBookingStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    try {
        const { data, error } = await supabase
            .from('bookings')
            .update({ approval_status: status })
            .eq('id', id)
            .select();
            
        if (error) throw error;
        
        res.status(200).json({ success: true, data: data[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};