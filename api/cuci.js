import axios from 'axios';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { paymentId } = req.body || {};
    
    if (!paymentId) {
        return res.status(200).json({ success: true, message: "Tiada paymentId" });
    }

    // ✅ Guna nama yang betul dari env
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const BASE = 'https://api.minepi.com/v2';

    if (!API_KEY) {
        console.error('PI_API_KEY_TESTNET not configured');
        return res.status(500).json({ error: 'Server config error' });
    }

    console.log(`🧹 [CLEANUP] Processing: ${paymentId}`);

    try {
        // Cancel payment sahaja (paling selamat untuk cleanup)
        await axios.post(
            `${BASE}/payments/${paymentId}/cancel`,
            {},
            { headers: { 'Authorization': `Key ${API_KEY}` } }
        );
        
        console.log(`✅ [CLEANUP] Cancelled: ${paymentId}`);
        return res.status(200).json({ success: true, action: 'cancelled' });

    } catch (error) {
        // Kalau cancel gagal, mungkin payment dah selesai
        console.log(`⚠️ [CLEANUP] Cancel failed, maybe already completed:`, error.response?.data || error.message);
        return res.status(200).json({ success: true, action: 'already_processed' });
    }
}
