const axios = require('axios');
const StellarSdk = require('stellar-sdk');

const keypair = StellarSdk.Keypair.fromSecret(process.env.WALLET_PRIVATE_SEED);
const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

module.exports = async function handler(req, res) {
    console.log('A2U_START:', req.body);
    
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { amount, uid, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const idempotency = metadata?.idempotency || `payout-${uid}-${Date.now()}`;

    if (!amount ||!uid ||!accessToken) {
        return res.status(400).json({ error: 'amount, uid, accessToken required' });
    }

    const headers = { Authorization: `Key ${API_KEY}` };

    try {
        // 1. Validate Bearer - WAJIB SOP
        await axios.get('https://api.minepi.com/v2/me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        // 2. CHECK PENDING DULU - NI YANG BUAT BEBAS RISIKO
        const searchRes = await axios.get(`https://api.minepi.com/v2/payments?uid=${uid}&direction=app_to_user`, { headers });
        const incomplete = (searchRes.data?.data || []).filter(p => 
            !p.transaction || (p.transaction && !p.transaction.txid)
        );

        // Clean semua pending sebelum create baru
        for (const p of incomplete) {
            try {
                if (!p.transaction) {
                    await axios.post(`https://api.minepi.com/v2/payments/${p.identifier}/cancel`, {}, { headers });
                } else {
                    await axios.post(`https://api.minepi.com/v2/payments/${p.identifier}/complete`, { txid: p.transaction.txid }, { headers });
                }
                console.log('A2U_CLEANED:', p.identifier);
            } catch (e) {
                console.error('A2U_CLEAN_FAIL:', p.identifier, e.response?.data);
            }
        }

        // 3. Create Pi Payment - amount WAJIB string 7dp
        const amountStr = Number(amount).toFixed(7);
        const { data: { identifier: paymentId, transaction: { to_sign: xdr } } } = await axios.post(
            'https://api.minepi.com/v2/payments',
            { 
                amount: amountStr, 
                memo: 'Payout', 
                uid,
                metadata: { ...metadata, idempotency } 
            },
            { headers }
        );

        // 4. Sign Stellar - WAJIB SOP
        const tx = new StellarSdk.Transaction(xdr, StellarSdk.Networks.TESTNET);
        tx.sign(keypair);
        const { hash: txid } = await server.submitTransaction(tx);

        // 5. Submit + Complete Pi - WAJIB SOP
        await axios.post(`https://api.minepi.com/v2/payments/${paymentId}/submit`, { txid }, { headers });
        await axios.post(`https://api.minepi.com/v2/payments/${paymentId}/complete`, { txid }, { headers });

        console.log('A2U_SUCCESS:', paymentId, txid);
        return res.json({ success: true, paymentId, txid });

    } catch (e) {
        console.error('A2U_ERROR:', e.response?.data || e.message);
        return res.status(500).json({ 
            error: e.response?.data?.error || e.message,
            detail: e.response?.data 
        });
    }
}
