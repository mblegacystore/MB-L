import axios from 'axios';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Kaedah Tidak Dibenarkan' });
    }

    const { uid, amount, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    const BASE = 'https://api.minepi.com/v2';
    const NETWORK = process.env.PI_NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

    // Validasi konfigurasi
    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap" });
    }

    if (!uid || !amount || !accessToken) {
        return res.status(400).json({ error: "Parameter uid, amount, accessToken diperlukan" });
    }

    // Verify access token
    try {
        const meRes = await axios.get(`${BASE}/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!meRes.data?.uid || meRes.data.uid !== uid) {
            return res.status(401).json({ error: "Access token tidak sah" });
        }
        console.log("✅ Token sah untuk user:", meRes.data.username);
    } catch (error) {
        console.error("Token verification failed:", error.response?.data);
        return res.status(401).json({ error: "Gagal mengesahkan access token" });
    }

    // Proses A2U payment
    try {
        const idempotencyKey = `a2u-${uid}-${amount}-${Date.now()}`;
        
        // 1. Create payment
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
        
        // 2. Sign transaction if needed
        let signedTxXdr = null;
        if (createRes.data.transaction?.to_sign) {
            const keypair = Keypair.fromSecret(WALLET_SEED);
            const tx = new Transaction(createRes.data.transaction.to_sign, NETWORK);
            tx.sign(keypair);
            signedTxXdr = tx.toEnvelope().toXDR('base64');
        }

        // 3. Approve payment (server-side)
        await axios.post(
            `${BASE}/payments/${paymentId}/approve`,
            {},
            { headers: { 'Authorization': `Key ${API_KEY}` } }
        );

        // 4. Complete payment with txid
        if (signedTxXdr) {
            await axios.post(
                `${BASE}/payments/${paymentId}/complete`,
                { txid: signedTxXdr },
                { headers: { 'Authorization': `Key ${API_KEY}` } }
            );
        }

        console.log("✅ A2U payment completed:", paymentId);
        
        return res.status(200).json({
            success: true,
            paymentId,
            amount: parseFloat(amount),
            userUid: uid
        });

    } catch (error) {
        console.error("Payment error:", {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        
        return res.status(error.response?.status || 500).json({
            error: error.response?.data?.error || error.message
        });
    }
}
