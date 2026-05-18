// ============================================
// A2U PAYMENT - PI NETWORK STANDARD
// ============================================

import PiNetwork from 'pi-backend';

// In-memory storage (ganti dengan database untuk production)
const paymentStore = {};

export default async function handler(req, res) {
    // 1. HANYA TERIMA POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 2. TERIMA DATA DARI FRONTEND
    const { uid, amount, memo, accessToken } = req.body;

    // 3. VALIDASI INPUT
    if (!uid || !amount) {
        return res.status(400).json({ error: "Data tak lengkap (uid/amount)" });
    }

    if (!accessToken) {
        return res.status(400).json({ error: "Access token missing" });
    }

    // 4. DAPATKAN KREDENSIAL DARI ENVIRONMENT
    const apiKey = process.env.PI_API_KEY_TESTNET;
    const walletPrivateSeed = process.env.WALLET_PRIVATE_SEED;

    if (!apiKey || !walletPrivateSeed) {
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap" });
    }

    // 5. INIT SDK
    const pi = new PiNetwork(apiKey, walletPrivateSeed);

    try {
        // ============================================
        // BEARER: VALIDASI ACCESS TOKEN
        // ============================================
        // Opsyen 1: Guna SDK (jika ada method getUser)
        // Opsyen 2: Guna fetch terus ke Pi API
        // Untuk Testnet, kita skip validasi penuh dahulu

        // ============================================
        // PIAWAIAN: SEMAK INCOMPLETE PAYMENTS
        // ============================================
        const incompletePayments = await pi.getIncompleteServerPayments();
        
        for (const payment of incompletePayments) {
            // Jika ada payment tergendala, selesaikan
            if (payment.transaction && payment.transaction.txid) {
                await pi.completePayment(payment.identifier, payment.transaction.txid);
            } else if (!payment.status?.cancelled) {
                await pi.cancelPayment(payment.identifier);
            }
        }

        // ============================================
        // STEP 1: CREATE PAYMENT (A2U)
        // ============================================
        const paymentId = await pi.createPayment({
            amount: parseFloat(amount),
            memo: memo || "A2U Reward - MB Legacy Store",
            metadata: { 
                type: "payout", 
                source: "MB Legacy Store",
                timestamp: Date.now()
            },
            uid: uid
        });

        // ============================================
        // PIAWAIAN: WAJIB SIMPAN paymentId
        // ============================================
        paymentStore[paymentId] = {
            uid: uid,
            amount: amount,
            status: 'created',
            createdAt: new Date().toISOString()
        };

        // ============================================
        // STEP 2: SUBMIT PAYMENT KE BLOCKCHAIN
        // ============================================
        const txid = await pi.submitPayment(paymentId);

        // ============================================
        // PIAWAIAN: WAJIB SIMPAN txid
        // ============================================
        paymentStore[paymentId].txid = txid;
        paymentStore[paymentId].status = 'submitted';

        // ============================================
        // STEP 3: COMPLETE PAYMENT
        // ============================================
        const completedPayment = await pi.completePayment(paymentId, txid);

        // ============================================
        // KEMASKINI STORAGE
        // ============================================
        paymentStore[paymentId].status = 'completed';
        paymentStore[paymentId].completedAt = new Date().toISOString();

        // ============================================
        // RETURN RESPONSE KEPADA FRONTEND
        // ============================================
        return res.status(200).json({
            success: true,
            message: "0.1 Test-Pi berjaya dihantar!",
            paymentId: paymentId,
            txid: txid,
            status: completedPayment.status
        });

    } catch (error) {
        console.error("A2U Error:", error);
        return res.status(500).json({ 
            success: false, 
            error: error.message,
            details: error.response?.data || null
        });
    }
}
