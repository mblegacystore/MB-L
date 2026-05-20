import axios from 'axios';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, amount, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY;
    const BASE = 'https://api.minepi.com/v2';

    // Validation
    if (!API_KEY) return res.status(500).json({ error: 'Server config error' });
    if (!uid || !amount || !accessToken) {
        return res.status(400).json({ error: 'uid, amount, accessToken required' });
    }

    // STEP 1: Verify user (SOP: wajib)
    try {
        const me = await axios.get(`${BASE}/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (me.data?.uid !== uid) {
            return res.status(401).json({ error: 'Invalid access token' });
        }
        console.log(`✅ User verified: ${me.data.username}`);
    } catch (e) {
        return res.status(401).json({ error: 'Token verification failed' });
    }

    // STEP 2: Check existing pending payment (cegah double claim)
    try {
        const incomplete = await axios.get(`${BASE}/payments/incomplete_server_payments`, {
            headers: { 'Authorization': `Key ${API_KEY}` }
        });
        
        const existing = incomplete.data.incomplete_server_payments?.find(p => p.user_uid === uid);
        if (existing && existing.transaction?.txid) {
            // Complete existing payment
            await axios.post(`${BASE}/payments/${existing.identifier}/complete`, 
                { txid: existing.transaction.txid },
                { headers: { 'Authorization': `Key ${API_KEY}` } }
            );
            return res.status(200).json({ 
                success: true, 
                paymentId: existing.identifier,
                recovered: true 
            });
        }
    } catch (e) {
        // No incomplete payments - proceed
    }

    try {
        // STEP 3: Create A2U payment
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

        // STEP 4: Submit to blockchain
        const submitRes = await axios.post(`${BASE}/payments/${paymentId}/submit`, {}, {
            headers: { 'Authorization': `Key ${API_KEY}` }
        });

        const txid = submitRes.data.transaction?.txid;

        // STEP 5: Complete payment
        await axios.post(`${BASE}/payments/${paymentId}/complete`, { txid }, {
            headers: { 'Authorization': `Key ${API_KEY}` }
        });

        console.log(`🎉 A2U success: ${paymentId} | ${txid}`);

        return res.status(200).json({
            success: true,
            paymentId,
            txid,
            amount: parseFloat(amount)
        });

    } catch (error) {
        console.error('A2U Error:', error.response?.data || error.message);
        
        // Handle "already linked" error - try complete
        if (error.response?.data?.error === 'payment_already_linked_with_a_tx') {
            try {
                const paymentId = error.response?.data?.payment_id;
                const getRes = await axios.get(`${BASE}/payments/${paymentId}`, {
                    headers: { 'Authorization': `Key ${API_KEY}` }
                });
                const txid = getRes.data.transaction?.txid;
                if (txid) {
                    await axios.post(`${BASE}/payments/${paymentId}/complete`, { txid }, {
                        headers: { 'Authorization': `Key ${API_KEY}` }
                    });
                    return res.status(200).json({ success: true, paymentId, txid, recovered: true });
                }
            } catch (e) {}
        }
        
        return res.status(error.response?.status || 500).json({
            error: error.response?.data?.error || error.message
        });
    }
}
