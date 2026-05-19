import axios from 'axios';
import * as StellarSdk from '@stellar/stellar-sdk';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { uid, amount, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    const PI_API_BASE = 'https://api.testnet.minepi.com/v2';

    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap" });
    }

    // 1. Validate token
    try {
        const meRes = await axios.get('https://api.minepi.com/v2/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (meRes.data.uid !== uid) {
            return res.status(401).json({ error: "UID tidak match dengan token" });
        }
    } catch (e) {
        return res.status(401).json({ error: "Token invalid" });
    }

    // 2. Check payment pending sedia ada
    try {
        const listRes = await axios.get(`${PI_API_BASE}/payments`, {
            headers: { 'Authorization': `Key ${API_KEY}` },
            params: { uid: uid, status: 'pending' }
        });
        
        const pendingPayment = listRes.data.find(p => 
            p.amount == amount && p.memo === 'MB-LEGACY-A2U'
        );
        
        if (pendingPayment) {
            console.log("Found pending payment:", pendingPayment.identifier);
            // Terus cuba complete kalau ada txid
            if (pendingPayment.txid) {
                await completePayment(pendingPayment.identifier, pendingPayment.txid, API_KEY, PI_API_BASE);
                return res.status(200).json({ success: true, paymentId: pendingPayment.identifier, txid: pendingPayment.txid });
            }
        }
    } catch (e) {
        console.log("Check pending failed:", e.message);
    }

    // 3. Create payment baru dengan idempotency key
    const idempotencyKey = `${uid}-${amount}-${Date.now()}`;
    let paymentId, txXdr;

    try {
        const createRes = await axios.post(`${PI_API_BASE}/payments`, {
            amount: parseFloat(amount),
            memo: 'MB-LEGACY-A2U',
            metadata: metadata || {},
            uid: uid
        }, {
            headers: {
                'Authorization': `Key ${API_KEY}`,
                'Content-Type': 'application/json',
                'Idempotency-Key': idempotencyKey
            }
        });

        paymentId = createRes.data.identifier;
        txXdr = createRes.data.transaction?.to_sign;
        
        if (!txXdr) throw new Error('Transaction XDR missing');

        // 4. Sign & submit
        const keypair = StellarSdk.Keypair.fromSecret(WALLET_SEED);
        const tx = new StellarSdk.Transaction(txXdr, StellarSdk.Networks.TESTNET);
        tx.sign(keypair);
        const signedTxXdr = tx.toEnvelope().toXDR('base64');

        const submitRes = await axios.post(`${PI_API_BASE}/payments/${paymentId}/submit`, 
            { txid: signedTxXdr }, 
            { headers: { 'Authorization': `Key ${API_KEY}` } }
        );

        const txid = submitRes.data.txid;

        // 5. Complete dengan retry 3 kali
        await completePayment(paymentId, txid, API_KEY, PI_API_BASE);

        return res.status(200).json({ success: true, paymentId, txid });

    } catch (error) {
        console.error("A2U Error:", error.response?.data || error.message);
        return res.status(500).json({ error: error.response?.data?.error || error.message });
    }
}

async function completePayment(paymentId, txid, API_KEY, PI_API_BASE) {
    let attempts = 0;
    while (attempts < 3) {
        try {
            await axios.post(`${PI_API_BASE}/payments/${paymentId}/complete`, 
                { txid }, 
                { headers: { 'Authorization': `Key ${API_KEY}` } }
            );
            console.log("Complete success:", paymentId);
            return;
        } catch (e) {
            attempts++;
            console.log(`Complete attempt ${attempts} failed:`, e.message);
            if (attempts === 3) throw e;
            await new Promise(r => setTimeout(r, 1000)); // wait 1s sebelum retry
        }
    }
}
