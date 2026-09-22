import { supabase } from '../config/supabase.js';

// GET: Fetch all resources for the frontend map and AI matching engine
export const getAllResources = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('resources')
            .select(`
                *,
                institutions (
                    name,
                    is_verified,
                    trust_score,
                    latitude,
                    longitude
                ),
                time_slots (*)
            `);
            
        if (error) throw error;
        
        // Map to ResourceAllocationDto expected by frontend
        const mappedData = data.map(resource => ({
            id: resource.id,
            name: resource.name,
            institution: resource.institutions?.name || 'Unknown Institution',
            location: resource.facility_name || 'Unknown Location',
            images: [], // Supabase doesn't seem to have images yet
            category: resource.category,
            notes: resource.capability_tags ? resource.capability_tags.join(', ') : '',
            specs: { "Make/Model": resource.make_model || 'N/A' },
            operatorRequired: resource.operator_required || false,
            ratePerHour: resource.hourly_rate_algo || 0,
            status: resource.status || 'Active'
        }));
        
        res.status(200).json({ success: true, data: mappedData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// PATCH: Update resource status
export const updateResourceStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    try {
        const { data, error } = await supabase
            .from('resources')
            .update({ status })
            .eq('id', id)
            .select();
            
        if (error) throw error;
        
        res.status(200).json({ success: true, data: data[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST: Add new equipment (Protected by requireAuth middleware)
export const addResource = async (req, res) => {
    const institutionId = req.user.id; 
    const { 
        name, 
        facility_name, 
        category,
        capability_tags, 
        make_model,
        requires_approval, 
        operator_required,
        hourly_rate_algo 
    } = req.body;

    try {
        const { data, error } = await supabase
            .from('resources')
            .insert({
                institution_id: institutionId,
                name,
                facility_name,
                category,
                capability_tags,
                make_model, 
                requires_approval,
                operator_required,
                hourly_rate_algo
            })
            .select();

        if (error) throw error;
        
        res.status(201).json({ 
            success: true, 
            message: "Resource successfully published to the network.",
            resource: data[0] 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};