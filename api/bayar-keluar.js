// api/bayar-keluar.js - A2U LENGKAP MENGIKUT SOP PI NETWORK
import PiNetwork from 'pi-backend';

// Storage sementara (elak double payment)
const paymentStore = {};

export default async function handler(req, res) {
    // 1. HANYA TERIMA POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, amount, memo, accessToken, action, paymentId, txid } = req.body;

    // 2. DAPATKAN KREDENSIAL DARI ENVIRONMENT
    const apiKey = process.env.PI_API_KEY_TESTNET;
    const walletPrivateSeed = process.env.WALLET_PRIVATE_SEED;

    if (!apiKey || !walletPrivateSeed) {
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap" });
    }

    // 3. INIT SDK
    const pi = new PiNetwork(apiKey, walletPrivateSeed);

    // ============================================
    // CUCI REKOD LAMA (EXPIRED/PENDING)
    // ============================================
    if (action === 'clean' && paymentId) {
        try {
            const incompletePayments = await pi.getIncompleteServerPayments();
            for (const payment of incompletePayments) {
                if (payment.identifier === paymentId) {
                    if (payment.transaction?.txid) {
                        await pi.completePayment(payment.identifier, payment.transaction.txid);
                    } else if (!payment.status?.cancelled) {
                        await pi.cancelPayment(payment.identifier);
                    }
                    paymentStore[paymentId] = { status: 'cleaned' };
                    break;
                }
            }
            return res.status(200).json({ success: true, message: "Payment cleaned" });
        } catch (error) {
            return res.status(500).json({ error: "Gagal bersihkan payment" });
        }
    }

    // ============================================
    // COMPLETE (untuk A2U step akhir)
    // ============================================
    if (action === 'complete' && paymentId && txid) {
        try {
            await pi.completePayment(paymentId, txid);
            paymentStore[paymentId] = { status: 'completed' };
            return res.status(200).json({ success: true, message: "Completed" });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // ============================================
    // A2U: CREATE + SUBMIT + COMPLETE
    // ============================================
    if (!uid || !amount) {
        return res.status(400).json({ error: "Data tak lengkap (uid/amount)" });
    }

    if (!accessToken) {
        return res.status(400).json({ error: "Access token missing" });
    }

    // ✅ VALIDASI ACCESS TOKEN (BEARER)
    try {
        const meRes = await fetch("https://api.minepi.com/v2/me", {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
        if (!meRes.ok) {
            return res.status(401).json({ error: "Invalid access token" });
        }
    } catch (error) {
        return res.status(500).json({ error: "Token validation failed" });
    }

    try {
        // ✅ STEP 1: BERSIHKAN INCOMPLETE PAYMENTS
        const incompletePayments = await pi.getIncompleteServerPayments();
        for (const payment of incompletePayments) {
            if (payment.transaction?.txid) {
                await pi.completePayment(payment.identifier, payment.transaction.txid);
            } else if (!payment.status?.cancelled) {
                await pi.cancelPayment(payment.identifier);
            }
        }

        // ✅ STEP 2: CREATE PAYMENT
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

        // ✅ STEP 3: STORAGE – SIMPAN paymentId
        paymentStore[paymentId] = {
            uid: uid,
            amount: amount,
            status: 'created',
            createdAt: new Date().toISOString()
        };

        // ✅ STEP 4: SUBMIT PAYMENT KE BLOCKCHAIN
        const txid = await pi.submitPayment(paymentId);

        // ✅ STEP 5: STORAGE – SIMPAN txid
        paymentStore[paymentId].txid = txid;
        paymentStore[paymentId].status = 'submitted';

        // ✅ STEP 6: COMPLETE PAYMENT
        const completedPayment = await pi.completePayment(paymentId, txid);

        // ✅ STEP 7: STORAGE – KEMASKINI STATUS
        paymentStore[paymentId].status = 'completed';
        paymentStore[paymentId].completedAt = new Date().toISOString();

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
