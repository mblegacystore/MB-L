import axios from 'axios';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

export default async function handler(req, res) {
    // 1. METHOD CHECK
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Kaedah Tidak Dibenarkan' });
    }

    const { uid, amount, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    const PI_ME = 'https://api.minepi.com/v2';
    const PI_PAY = 'https://api.testnet.minepi.com';

    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap" });
    }

    if (!uid || !amount || !accessToken) {
        return res.status(400).json({ error: "Parameter uid, amount, accessToken diperlukan" });
    }

    // 2. SAHKAN TOKEN (SOP)
    try {
        const meRes = await axios.get(`${PI_ME}/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!meRes.data?.uid || meRes.data.uid !== uid) {
            return res.status(401).json({ error: "Access token tidak sah" });
        }

        console.log("✅ Token sah:", meRes.data.username);
    } catch (error) {
        return res.status(401).json({ error: "Gagal mengesahkan access token" });
    }

    // 3. CIPTA, SIGN, SUBMIT, COMPLETE (SOP)
    try {
        // CIPTA
        const idempotencyKey = `a2u-${uid}-${amount}-${Date.now()}`;
        const createRes = await axios.post(`${PI_PAY}/payments`, {
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

        // SIGN
        const keypair = Keypair.fromSecret(WALLET_SEED);
        const tx = new Transaction(txXdr, Networks.TESTNET);
        tx.sign(keypair);
        const signedTxXdr = tx.toEnvelope().toXDR('base64');

        // SUBMIT
        const submitRes = await axios.post(
            `${PI_PAY}/payments/${paymentId}/submit`,
            { txid: signedTxXdr },
            { headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' } }
        );

        // COMPLETE
        await axios.post(
            `${PI_PAY}/payments/${paymentId}/complete`,
            { txid: submitRes.data.txid },
            { headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' } }
        );

        return res.status(200).json({
            success: true,
            paymentId,
            txid: submitRes.data.txid
        });

    } catch (error) {
        const status = error.response?.status || 500;
        const msg = error.response?.data?.error || error.message;
        return res.status(status).json({ error: msg });
    }
}
