// api/bayar-keluar.js - A2U MENGIKUT SOP RASMI PI NETWORK
import PiNetwork from 'pi-backend';

const paymentStore = {};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, amount, memo, accessToken, action, paymentId, txid } = req.body;

    const apiKey = process.env.PI_API_KEY_TESTNET;
    const walletPrivateSeed = process.env.WALLET_PRIVATE_SEED;

    if (!apiKey || !walletPrivateSeed) {
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap" });
    }

    const pi = new PiNetwork(apiKey, walletPrivateSeed);

    // ============================================
    // 1. CUCI REKOD LAMA (untuk payment tertentu)
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
    // 2. COMPLETE (untuk A2U step akhir)
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
    // 3. A2U: CREATE + SUBMIT + COMPLETE (MENGIKUT SOP)
    // ============================================
    if (!uid || !amount) {
        return res.status(400).json({ error: "Data tak lengkap (uid/amount)" });
    }

    if (!accessToken) {
        return res.status(400).json({ error: "Access token missing" });
    }

    // ✅ SOP: VALIDASI ACCESS TOKEN
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
        // ✅ SOP: SEMAK INCOMPLETE PAYMENTS UNTUK USER YANG SAMA
        const incompletePayments = await pi.getIncompleteServerPayments();
        for (const payment of incompletePayments) {
            if (payment.user_uid === uid) {  // ✅ hanya untuk user ini
                if (payment.transaction?.txid) {
                    await pi.completePayment(payment.identifier, payment.transaction.txid);
                } else if (!payment.status?.cancelled) {
                    await pi.cancelPayment(payment.identifier);
                }
            }
        }

        // ✅ SOP: CREATE PAYMENT
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

        // ✅ SOP: STORAGE – SIMPAN paymentId
        paymentStore[paymentId] = {
            uid: uid,
            amount: amount,
            status: 'created',
            createdAt: new Date().toISOString()
        };

        // ✅ SOP: SUBMIT PAYMENT KE BLOCKCHAIN
        const txid = await pi.submitPayment(paymentId);

        // ✅ SOP: STORAGE – SIMPAN txid
        paymentStore[paymentId].txid = txid;
        paymentStore[paymentId].status = 'submitted';

        // ✅ SOP: COMPLETE PAYMENT
        const completedPayment = await pi.completePayment(paymentId, txid);

        // ✅ SOP: STORAGE – KEMASKINI STATUS
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
