// Storan sementara (guna pangkalan data sebenar di produksi)
let paymentStore = {};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, amount, memo, accessToken } = req.body;
    
    console.log('DEBUG - Request body:', { uid, amount, memo, accessToken: accessToken ? 'ADA' : 'TIADA' });

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
        // ========== AUTHENTICATE + BEARER ==========
        console.log('DEBUG - Calling /me with Bearer token');
        
        const meRes = await fetch(`${BASE_URL}/me`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        console.log('DEBUG - /me response status:', meRes.status);

        if (!meRes.ok) {
            return res.status(401).json({ success: false, error: 'Token tidak sah' });
        }

        const meData = await meRes.json();
        console.log('DEBUG - /me response uid:', meData.uid);

        if (meData.uid !== uid) {
            return res.status(401).json({ success: false, error: 'UID tidak sepadan' });
        }

        // ========== CIPTA PEMBAYARAN ==========
        const paymentBody = {
            amount: parseFloat(amount),
            memo: memo || 'A2U Reward',
            uid: uid,
            metadata: JSON.stringify({ source: 'claim_reward' })
        };
        
        console.log('DEBUG - Payment URL:', `${BASE_URL}/payments`);
        console.log('DEBUG - Payment body:', JSON.stringify(paymentBody));
        console.log('DEBUG - API Key prefix:', API_KEY.substring(0, 10) + '...');

        const createRes = await fetch(`${BASE_URL}/payments`, {
            method: 'POST',
            headers: {
                Authorization: `Key ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentBody)
        });

        console.log('DEBUG - Create payment status:', createRes.status);
        console.log('DEBUG - Create payment headers:', JSON.stringify(Object.fromEntries(createRes.headers)));

        const createData = await createRes.json();
        console.log('DEBUG - Create payment response:', JSON.stringify(createData));

        if (!createRes.ok) {
            return res.status(400).json({ 
                success: false, 
                error: createData.message || 'Create failed',
                detail: createData
            });
        }

        const paymentId = createData.identifier;
        console.log('DEBUG - Payment ID:', paymentId);

        // ========== SIMPAN PAYMENT ID ==========
        paymentStore[paymentId] = {
            uid: uid,
            amount: amount,
            memo: memo,
            status: 'created',
            createdAt: new Date().toISOString()
        };

        // ========== SUBMIT ==========
        console.log('DEBUG - Submitting payment:', paymentId);
        
        const submitRes = await fetch(`${BASE_URL}/payments/${paymentId}/submit`, {
            method: 'POST',
            headers: {
                Authorization: `Key ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ seed: WALLET_SEED })
        });

        const submitData = await submitRes.json();
        console.log('DEBUG - Submit response:', JSON.stringify(submitData));

        if (!submitRes.ok || !submitData.txid) {
            paymentStore[paymentId].status = 'submit_failed';
            paymentStore[paymentId].error = submitData.message || 'Submit failed';
            
            return res.status(400).json({ success: false, error: 'Submit failed' });
        }

        const txid = submitData.txid;
        console.log('DEBUG - TXID:', txid);

        paymentStore[paymentId].txid = txid;
        paymentStore[paymentId].status = 'submitted';

        // ========== COMPLETE ==========
        console.log('DEBUG - Completing payment:', paymentId, txid);
        
        const completeRes = await fetch(`${BASE_URL}/payments/${paymentId}/complete`, {
            method: 'POST',
            headers: {
                Authorization: `Key ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ txid: txid })
        });

        const completeData = await completeRes.json();
        console.log('DEBUG - Complete response:', JSON.stringify(completeData));

        paymentStore[paymentId].status = 'completed';
        paymentStore[paymentId].completedAt = new Date().toISOString();
        paymentStore[paymentId].completeData = completeData;

        // ========== BERJAYA ==========
        return res.status(200).json({
            success: true,
            message: '0.1 Pi berjaya dihantar!',
            paymentId: paymentId,
            txid: txid,
            stored: paymentStore[paymentId]
        });

    } catch (error) {
        console.log('DEBUG - Error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
            }
