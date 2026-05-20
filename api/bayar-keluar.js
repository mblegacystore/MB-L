import axios from 'axios';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, amount, accessToken, metadata } = req.body;
    
    // ✅ Guna nama yang betul
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const BASE = 'https://api.minepi.com/v2';

    if (!API_KEY) return res.status(500).json({ error: 'Server config error' });
    if (!uid || !amount || !accessToken) {
        return res.status(400).json({ error: 'uid, amount, accessToken required' });
    }

    // STEP 1: Verify user
    try {
        const me = await axios.get(`${BASE}/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (me.data?.uid !== uid) {
            return res.status(401).json({ error: 'Invalid access token' });
        }
    } catch (e) {
        return res.status(401).json({ error: 'Token verification failed' });
    }

    try {
        // STEP 2: Create payment
        const createRes = await axios.post(`${BASE}/payments`, {
            amount: parseFloat(amount),
            memo: 'MB-LEGACY-A2U-REWARD',
            metadata: metadata || {},
            uid: uid
        }, {
            headers: {
                'Authorization': `Key ${API_KEY}`,
                'Idempotency-Key': `claim-${uid}-${Date.now()}`
            }
        });

        const paymentId = createRes.data.identifier;

        // STEP 3: Submit to blockchain
        const submitRes = await axios.post(`${BASE}/payments/${paymentId}/submit`, {}, {
            headers: { 'Authorization': `Key ${API_KEY}` }
        });

        const txid = submitRes.data.transaction?.txid;

        // STEP 4: Complete payment
        await axios.post(`${BASE}/payments/${paymentId}/complete`, { txid }, {
            headers: { 'Authorization': `Key ${API_KEY}` }
        });

        return res.status(200).json({
            success: true,
            paymentId,
            txid,
            amount: parseFloat(amount)
        });

    } catch (error) {
        console.error('A2U Error:', error.response?.data || error.message);
        return res.status(error.response?.status || 500).json({
            error: error.response?.data?.error || error.message
        });
    }
}
