import axios from 'axios';
import * as StellarSdk from 'stellar-sdk';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { uid, amount, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    const PI_API_BASE = 'https://api.testnet.minepi.com/v2/payments';

    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap" });
    }

    // VALIDASI ACCESS TOKEN
    try {
        const meRes = await axios.get('https://api.minepi.com/v2/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!meRes.data?.uid) {
            return res.status(401).json({ error: "Invalid access token" });
        }
    } catch (error) {
        return res.status(500).json({ error: "Token validation failed" });
    }

    try {
        // 1. CREATE
        const createRes = await axios.post(PI_API_BASE, {
            amount: parseFloat(amount),
            memo: 'MB-LEGACY-A2U',
            metadata: metadata || {},
            uid: uid
        }, {
            headers: {
                'Authorization': `Key ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const paymentId = createRes.data.identifier;
        const txXdr = createRes.data.transaction?.to_sign;
        if (!txXdr) throw new Error('Transaction XDR missing');

        // 2. SIGN
        const keypair = StellarSdk.Keypair.fromSecret(WALLET_SEED);
        const tx = new StellarSdk.Transaction(txXdr, StellarSdk.Networks.TESTNET);
        tx.sign(keypair);
        const signedTxXdr = tx.toEnvelope().toXDR('base64');

        // 3. SUBMIT
        const submitRes = await axios.post(`${PI_API_BASE}/${paymentId}/submit`, { txid: signedTxXdr }, {
            headers: {
                'Authorization': `Key ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const txid = submitRes.data.txid;

        // 4. COMPLETE
        await axios.post(`${PI_API_BASE}/${paymentId}/complete`, { txid }, {
            headers: {
                'Authorization': `Key ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return res.status(200).json({ success: true, paymentId, txid });

    } catch (error) {
        console.error("A2U Error:", error.response?.data || error.message);
        return res.status(500).json({ error: error.message });
    }
}
