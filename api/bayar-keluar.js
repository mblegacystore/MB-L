export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, amount, memo, accessToken } = req.body;
    
    console.log('DEBUG - Request body:', JSON.stringify({ uid, amount, memo, hasToken: !!accessToken }));

    if (!uid || !amount) {
        return res.status(400).json({ success: false, error: 'Data tak lengkap' });
    }

    if (!accessToken) {
        return res.status(400).json({ success: false, error: 'Access token missing' });
    }

    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;

    if (!API_KEY) return res.status(500).json({ success: false, error: 'API Key missing' });
    if (!WALLET_SEED) return res.status(500).json({ success: false, error: 'Wallet Seed missing' });

    const BASE_URL = 'https://api.minepi.com/v2';

    try {
        const meRes = await fetch(`${BASE_URL}/me`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        console.log('DEBUG - /me status:', meRes.status);

        if (!meRes.ok) {
            return res.status(401).json({ success: false, error: 'Token tidak sah' });
        }

        const meData = await meRes.json();
        console.log('DEBUG - /me uid:', meData.uid);

        const payload = {
            amount: parseFloat(amount),
            memo: memo || 'A2U Reward',
            uid: uid,
            metadata: { source: 'claim_reward' }
        };
        
        console.log('DEBUG - URL:', `${BASE_URL}/payments`);
        console.log('DEBUG - Payload:', JSON.stringify(payload));

        const createRes = await fetch(`${BASE_URL}/payments`, {
            method: 'POST',
            headers: {
                Authorization: `Key ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('DEBUG - Create status:', createRes.status);

        const createText = await createRes.text();
        console.log('DEBUG - Create raw response:', createText);

        let createData;
        try {
            createData = JSON.parse(createText);
        } catch {
            console.log('DEBUG - Response bukan JSON');
            return res.status(400).json({ success: false, error: 'Invalid response' });
        }

        if (!createRes.ok) {
            return res.status(400).json({ 
                success: false, 
                error: createData.message || createData.error || 'Create failed',
                detail: createData
            });
        }

        const paymentId = createData.identifier;
        console.log('DEBUG - Payment ID:', paymentId);

        const submitRes = await fetch(`${BASE_URL}/payments/${paymentId}/submit`, {
            method: 'POST',
            headers: {
                Authorization: `Key ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ seed: WALLET_SEED })
        });

        const submitData = await submitRes.json();
        console.log('DEBUG - Submit status:', submitRes.status);

        if (!submitRes.ok || !submitData.txid) {
            return res.status(400).json({ success: false, error: 'Submit failed', detail: submitData });
        }

        console.log('DEBUG - TXID:', submitData.txid);

        await fetch(`${BASE_URL}/payments/${paymentId}/complete`, {
            method: 'POST',
            headers: {
                Authorization: `Key ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ txid: submitData.txid })
        });

        console.log('DEBUG - Complete done');

        return res.status(200).json({
            success: true,
            message: '0.1 Pi berjaya dihantar!',
            paymentId: paymentId,
            txid: submitData.txid
        });

    } catch (error) {
        console.log('DEBUG - Error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}
