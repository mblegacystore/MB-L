import axios from 'axios';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Kaedah Tidak Dibenarkan' });
    }

    const { uid, amount, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    const BASE = 'https://api.minepi.com/v2';

    if (!uid || !amount || !accessToken) {
        return res.status(400).json({ error: "Parameter diperlukan" });
    }

    // 1. SAHKAN TOKEN (SOP)
    try {
        const meRes = await axios.get(`${BASE}/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!meRes.data?.uid || meRes.data.uid !== uid) {
            return res.status(401).json({ error: "Token tidak sah" });
        }
        console.log("✅ Token OK:", meRes.data.username);
    } catch (error) {
        return res.status(401).json({ error: "Gagal mengesahkan token" });
    }

    // 2. CREATE PAYMENT
    try {
        const idempotencyKey = `a2u-${uid}-${amount}-${Date.now()}`;
        
        const createRes = await axios.post(`${BASE}/payments`, {
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

        const paymentId = createRes.data.identifier;
        const txXdr = createRes.data.transaction?.to_sign;

        if (!txXdr) throw new Error('XDR missing');

        // 3. SIGN - STELLAR SDK
        const keypair = Keypair.fromSecret(WALLET_SEED);
        const tx = new Transaction(txXdr, Networks.PUBLIC);
        tx.sign(keypair);
        const signedTxXdr = tx.toEnvelope().toXDR('base64');

        // 4. SUBMIT
        const submitRes = await axios.post(
            `${BASE}/payments/${paymentId}/submit`,
            { txid: signedTxXdr },
            { headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' } }
        );

        // 5. COMPLETE
        await axios.post(
            `${BASE}/payments/${paymentId}/complete`,
            { txid: submitRes.data.txid },
            { headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' } }
        );

        return res.status(200).json({
            success: true,
            paymentId,
            txid: submitRes.data.txid
        });

    } catch (error) {
        return res.status(error.response?.status || 500).json({
            error: error.response?.data?.error || error.message
        });
    }
}
