import axios from 'axios';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

// Simpanan sementara (guna database sebenar untuk production)
const paymentStore = new Map();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Kaedah Tidak Dibenarkan' });
    }

    const { uid, amount, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    
    const ME_URL = 'https://api.minepi.com/v2';
    const PAY_URL = 'https://api.testnet.minepi.com';

    if (!uid || !amount || !accessToken) {
        return res.status(400).json({ error: "Parameter diperlukan" });
    }

    // 1. SAHKAN TOKEN
    try {
        const meRes = await axios.get(`${ME_URL}/me`, {
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
        
        const createRes = await axios.post(`${PAY_URL}/payments`, {
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

        // 3. SIMPAN PAYMENT ID (SOP - KRITIKAL)
        paymentStore.set(paymentId, {
            uid: uid,
            amount: parseFloat(amount),
            memo: 'MB-LEGACY-A2U',
            metadata: metadata || {},
            paymentId: paymentId,
            txid: null,
            status: 'created',
            createdAt: new Date().toISOString()
        });
        console.log("💾 Disimpan:", paymentId);

        // 4. SIGN
        const keypair = Keypair.fromSecret(WALLET_SEED);
        const tx = new Transaction(txXdr, Networks.TESTNET);
        tx.sign(keypair);
        const signedTxXdr = tx.toEnvelope().toXDR('base64');

        // 5. SUBMIT
        const submitRes = await axios.post(
            `${PAY_URL}/payments/${paymentId}/submit`,
            { txid: signedTxXdr },
            { headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' } }
        );

        const txid = submitRes.data.txid;

        // 6. KEMASKINI STORAGE (SOP - DISYORKAN)
        const payment = paymentStore.get(paymentId);
        payment.txid = txid;
        payment.status = 'submitted';
        paymentStore.set(paymentId, payment);
        console.log("💾 Dikemaskini:", paymentId, txid);

        // 7. COMPLETE
        await axios.post(
            `${PAY_URL}/payments/${paymentId}/complete`,
            { txid },
            { headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' } }
        );

        // 8. KEMASKINI STATUS
        payment.status = 'completed';
        payment.completedAt = new Date().toISOString();
        paymentStore.set(paymentId, payment);
        console.log("💾 Selesai:", paymentId);

        return res.status(200).json({
            success: true,
            paymentId,
            txid
        });

    } catch (error) {
        return res.status(error.response?.status || 500).json({
            error: error.response?.data?.error || error.message
        });
    }
}
