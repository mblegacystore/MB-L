import axios from 'axios';
import * as StellarSdk from '@stellar/stellar-sdk';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { uid, amount, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    
    // URL dah dibetulkan
    const PI_API_CREATE = 'https://api.testnet.minepi.com/v2/payments/create';
    const PI_API_PAYMENTS = 'https://api.testnet.minepi.com/v2/payments';

    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap" });
    }

    if (!uid || !amount || !accessToken) {
        return res.status(400).json({ error: "Parameter uid, amount, accessToken diperlukan" });
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
        const status = error.response?.status || 500;
        const msg = error.response?.data?.error || "Token validation failed";
        return res.status(status).json({ error: msg });
    }

    try {
        // 1. CREATE PAYMENT
        const createRes = await axios.post(PI_API_CREATE, {
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
        if (!txXdr) throw new Error('Transaction XDR missing dari Pi API');

        // 2. SIGN TRANSACTION
        const keypair = StellarSdk.Keypair.fromSecret(WALLET_SEED);
        const tx = new StellarSdk.Transaction(txXdr, StellarSdk.Networks.TESTNET);
        tx.sign(keypair);
        const signedTxXdr = tx.toEnvelope().toXDR('base64');

        // 3. SUBMIT TRANSACTION
        const submitRes = await axios.post(`${PI_API_PAYMENTS}/${paymentId}/submit`, 
            { txid: signedTxXdr }, 
            {
                headers: {
                    'Authorization': `Key ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const txid = submitRes.data.txid;

        // 4. COMPLETE PAYMENT
        await axios.post(`${PI_API_PAYMENTS}/${paymentId}/complete`, 
            { txid }, 
            {
                headers: {
                    'Authorization': `Key ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return res.status(200).json({ 
            success: true, 
            paymentId, 
            txid 
        });

    } catch (error) {
        console.error("A2U Error:", error.response?.data || error.message);
        const msg = error.response?.data?.error || error.message;
        return res.status(500).json({ error: msg });
    }
}
