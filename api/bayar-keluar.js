import axios from 'axios';
import * as StellarSdk from 'stellar-sdk';

// Storage untuk elak double payment
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
    // VALIDASI ACCESS TOKEN (WAJIB UNTUK A2U)
    // ============================================
    async function validateAccessToken(token) {
        if (!token) {
            throw new Error("Access token missing");
        }
        try {
            const meRes = await axios.get('https://api.minepi.com/v2/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!meRes.data?.uid) {
                throw new Error("Invalid access token");
            }
            return meRes.data.uid;
        } catch (error) {
            if (error.response?.status === 401) {
                throw new Error("Access token tidak sah atau telah tamat tempoh");
            }
            throw new Error("Gagal mengesahkan access token: " + error.message);
        }
    }

    // ============================================
    // 1. APPROVE - onReadyForServerApproval callback
    // ============================================
    if (action === 'approve' && paymentId) {
        try {
            // ✅ WAJIB: Validate access token
            const validatedUid = await validateAccessToken(accessToken);

            // ✅ WAJIB: Dapatkan payment details untuk disemak
            const paymentRes = await axios.get(`${PI_API_BASE}/${paymentId}`, {
                headers: { 'Authorization': `Key ${API_KEY}` }
            });

            const payment = paymentRes.data;

            // ✅ WAJIB: Sahkan payment milik user yang betul
            if (payment.uid !== validatedUid) {
                return res.status(403).json({ 
                    error: "Payment bukan milik user ini",
                    payment_uid: payment.uid,
                    token_uid: validatedUid
                });
            }

            // ✅ WAJIB: Sahkan payment belum di-approve
            if (payment.status?.developer_approved) {
                return res.status(200).json({ 
                    message: "Payment sudah di-approve",
                    payment: payment 
                });
            }

            // ✅ APPROVE payment
            const approveRes = await axios.post(
                `${PI_API_BASE}/${paymentId}/approve`,
                {},
                {
                    headers: {
                        'Authorization': `Key ${API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Simpan dalam paymentStore
            paymentStore[paymentId] = {
                uid: validatedUid,
                amount: payment.amount,
                status: 'approved',
                createdAt: Date.now()
            };

            console.log(`✅ Payment ${paymentId} approved untuk user ${validatedUid}`);

            return res.status(200).json({
                success: true,
                message: "Payment berjaya di-approve",
                payment: approveRes.data
            });

        } catch (error) {
            console.error("Approve Error:", error.response?.data || error.message);
            return res.status(500).json({
                success: false,
                error: error.response?.data?.error || error.message
            });
        }
    }

    // ============================================
    // 2. COMPLETE - onReadyForServerCompletion callback
    // ============================================
    if (action === 'complete' && paymentId && txid) {
        try {
            // ✅ WAJIB: Validate access token
            const validatedUid = await validateAccessToken(accessToken);

            // ✅ WAJIB: Dapatkan payment details
            const paymentRes = await axios.get(`${PI_API_BASE}/${paymentId}`, {
                headers: { 'Authorization': `Key ${API_KEY}` }
            });

            const payment = paymentRes.data;

            // ✅ WAJIB: Sahkan payment milik user
            if (payment.uid !== validatedUid) {
                return res.status(403).json({ 
                    error: "Payment bukan milik user ini" 
                });
            }

            // ✅ WAJIB: Sahkan payment belum completed
            if (payment.status?.developer_completed) {
                return res.status(200).json({ 
                    message: "Payment sudah completed",
                    txid: payment.transaction?.txid
                });
            }

            // ✅ COMPLETE payment
            const completeRes = await axios.post(
                `${PI_API_BASE}/${paymentId}/complete`,
                { txid: txid },
                {
                    headers: {
                        'Authorization': `Key ${API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Update paymentStore
            if (paymentStore[paymentId]) {
                paymentStore[paymentId].status = 'completed';
                paymentStore[paymentId].txid = txid;
            }

            console.log(`✅ Payment ${paymentId} completed. TxID: ${txid}`);

            return res.status(200).json({
                success: true,
                message: "Payment berjaya diselesaikan",
                txid: txid,
                payment: completeRes.data
            });

        } catch (error) {
            console.error("Complete Error:", error.response?.data || error.message);
            return res.status(500).json({
                success: false,
                error: error.response?.data?.error || error.message
            });
        }
    }

    // ============================================
    // 3. CANCEL / CLEAN - Untuk pembersihan
    // ============================================
    if (action === 'cancel' && paymentId) {
        try {
            await axios.post(
                `${PI_API_BASE}/${paymentId}/cancel`,
                {},
                {
                    headers: { 'Authorization': `Key ${API_KEY}` }
                }
            );

            delete paymentStore[paymentId];
            console.log(`🧹 Payment ${paymentId} dibatalkan`);

            return res.status(200).json({ 
                success: true, 
                message: "Payment dibatalkan" 
            });

        } catch (error) {
            console.error("Cancel Error:", error.response?.data || error.message);
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    }

    // ============================================
    // 4. CREATE A2U - Flow penuh (FALLBACK)
    // ============================================
    // Ini hanya backup kalau client perlu server create payment
    if (!uid || !amount) {
        return res.status(400).json({ 
            error: "Data tidak lengkap. uid dan amount diperlukan untuk create A2U" 
        });
    }

    try {
        // ✅ WAJIB: Validate access token
        const validatedUid = await validateAccessToken(accessToken);

        // ✅ WAJIB: Pastikan uid dalam request sama dengan token
        if (validatedUid !== uid) {
            return res.status(403).json({
                error: "UID tidak sepadan dengan access token"
            });
        }

        // ✅ WAJIB: Cek incomplete payments dan selesaikan
        const searchRes = await axios.get(
            `${PI_API_BASE}?uid=${uid}&direction=app_to_user`,
            { headers: { 'Authorization': `Key ${API_KEY}` } }
        );

        const incompletePayments = (searchRes.data.payments || []).filter(
            p => !p.status?.developer_completed && !p.status?.cancelled
        );

        for (const p of incompletePayments) {
            try {
                if (p.transaction?.txid) {
                    await axios.post(
                        `${PI_API_BASE}/${p.identifier}/complete`,
                        { txid: p.transaction.txid },
                        { headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' } }
                    );
                    console.log(`✅ Completed pending payment: ${p.identifier}`);
                } else {
                    await axios.post(
                        `${PI_API_BASE}/${p.identifier}/cancel`,
                        {},
                        { headers: { 'Authorization': `Key ${API_KEY}` } }
                    );
                    console.log(`🧹 Cancelled pending payment: ${p.identifier}`);
                }
            } catch (err) {
                console.error(`Gagal proses payment ${p.identifier}:`, err.message);
            }
        }

        // ✅ CREATE payment
        const createResponse = await axios.post(
            PI_API_BASE,
            {
                amount: amount,
                memo: 'MB-LEGACY-A2U',
                metadata: metadata || { 
                    source: 'claim_reward', 
                    timestamp: Date.now() 
                },
                uid: uid
            },
            {
                headers: {
                    'Authorization': `Key ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const newPaymentId = createResponse.data.identifier;
        const txXdr = createResponse.data.transaction?.to_sign;

        if (!txXdr) {
            throw new Error('Transaction XDR missing dari response create');
        }

        // Simpan dalam paymentStore
        paymentStore[newPaymentId] = {
            uid: uid,
            amount: amount,
            status: 'created',
            createdAt: Date.now()
        };

        // ✅ SIGN transaction
        const networkPassphrase = StellarSdk.Networks.TESTNET;
        const keypair = StellarSdk.Keypair.fromSecret(WALLET_SEED);
        const transaction = new StellarSdk.Transaction(txXdr, networkPassphrase);
        transaction.sign(keypair);
        const signedTxXdr = transaction.toEnvelope().toXDR('base64');

        // ✅ SUBMIT payment
        const submitResponse = await axios.post(
            `${PI_API_BASE}/${newPaymentId}/submit`,
            { txid: signedTxXdr },
            {
                headers: {
                    'Authorization': `Key ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const submitTxid = submitResponse.data.txid;
        paymentStore[newPaymentId].txid = submitTxid;
        paymentStore[newPaymentId].status = 'submitted';

        // ✅ COMPLETE payment
        await axios.post(
            `${PI_API_BASE}/${newPaymentId}/complete`,
            { txid: submitTxid },
            {
                headers: {
                    'Authorization': `Key ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        paymentStore[newPaymentId].status = 'completed';

        console.log(`✅ A2U Payment berjaya: ${newPaymentId} | TxID: ${submitTxid}`);

        return res.status(200).json({
            success: true,
            message: "0.1 Test-Pi berjaya dihantar!",
            paymentId: newPaymentId,
            txid: submitTxid
        });

    } catch (error) {
        console.error("A2U Create Error:", error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            error: error.response?.data?.error || error.message
        });
    }
                }
