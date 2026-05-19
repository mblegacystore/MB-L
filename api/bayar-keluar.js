import axios from 'axios';
import * as StellarSdk from 'stellar-sdk';

// Storage sementara (ganti dengan database untuk production)
const paymentStore = {};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { amount, uid, metadata, accessToken, action, paymentId, txid } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    const PI_API_BASE = 'https://api.minepi.com/v2/payments';

    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap" });
    }

    // ============================================
    // 1. CLEAN (untuk expired/pending)
    // ============================================
    if (action === 'clean' && paymentId) {
        try {
            await axios.post(`${PI_API_BASE}/${paymentId}/cancel`, {}, {
                headers: { 'Authorization': `Key ${API_KEY}` }
            });
            delete paymentStore[paymentId];
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // ============================================
    // 2. COMPLETE (A2U step akhir)
    // ============================================
    if (action === 'complete' && paymentId && txid) {
        try {
            await axios.post(`${PI_API_BASE}/${paymentId}/complete`, { txid }, {
                headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' }
            });
            paymentStore[paymentId].status = 'completed';
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // ============================================
    // 3. A2U: CREATE → SIGN → SUBMIT → COMPLETE
    // ============================================
    if (!uid || !amount) {
        return res.status(400).json({ error: "Data tak lengkap" });
    }

    if (!accessToken) {
        return res.status(400).json({ error: "Access token missing" });
    }

    try {
        // ========== VALIDASI BEARER TOKEN ==========
        const meRes = await axios.get('https://api.minepi.com/v2/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!meRes.data?.uid) {
            return res.status(401).json({ error: "Invalid access token" });
        }

        // ========== CEK INCOMPLETE PAYMENTS (SOP) ==========
        const searchRes = await axios.get(`${PI_API_BASE}?uid=${uid}&direction=app_to_user`, {
            headers: { 'Authorization': `Key ${API_KEY}` }
        });
        const incompletePayments = searchRes.data.payments || [];

        for (const p of incompletePayments) {
            if (p.status?.developer_completed || p.status?.cancelled) continue;
            if (p.transaction?.txid) {
                await axios.post(`${PI_API_BASE}/${p.identifier}/complete`, { txid: p.transaction.txid }, {
                    headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' }
                });
            } else {
                await axios.post(`${PI_API_BASE}/${p.identifier}/cancel`, {}, {
                    headers: { 'Authorization': `Key ${API_KEY}` }
                });
            }
        }

        // ========== CREATE PAYMENT ==========
        const createResponse = await axios.post(
            PI_API_BASE,
            {
                amount,
                memo: 'MB-LEGACY-A2U',
                metadata: metadata || { source: 'claim_reward', timestamp: Date.now() },
                uid
            },
            {
                headers: {
                    'Authorization': `Key ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const paymentId = createResponse.data.identifier;
        const txXdr = createResponse.data.transaction?.to_sign;

        if (!txXdr) {
            throw new Error('Transaction XDR missing from creation response.');
        }

        // ========== SIMPAN paymentId (elak double payment) ==========
        paymentStore[paymentId] = {
            uid,
            amount,
            status: 'created',
            createdAt: Date.now()
        };

        // ========== SIGN TRANSACTION (Stellar SDK) ==========
        const networkPassphrase = StellarSdk.Networks.TESTNET;
        const keypair = StellarSdk.Keypair.fromSecret(WALLET_SEED);
        const transaction = new StellarSdk.Transaction(txXdr, networkPassphrase);
        transaction.sign(keypair);
        const signedTxXdr = transaction.toEnvelope().toXDR('base64');

        // ========== SUBMIT PAYMENT ==========
        const submitResponse = await axios.post(
            `${PI_API_BASE}/${paymentId}/submit`,
            { txid: signedTxXdr },
            {
                headers: {
                    'Authorization': `Key ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const txid = submitResponse.data.txid;
        paymentStore[paymentId].txid = txid;
        paymentStore[paymentId].status = 'submitted';

        // ========== COMPLETE PAYMENT ==========
        await axios.post(
            `${PI_API_BASE}/${paymentId}/complete`,
            { txid },
            {
                headers: {
                    'Authorization': `Key ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        paymentStore[paymentId].status = 'completed';

        return res.status(200).json({
            success: true,
            message: "0.1 Test-Pi berjaya dihantar!",
            paymentId,
            txid
        });

    } catch (error) {
        console.error("A2U Error:", error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            error: error.response?.data?.error || error.message
        });
    }
}
