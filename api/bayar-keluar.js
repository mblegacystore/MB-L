import axios from 'axios';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

// Database functions (implement mengikut database anda)
const db = {
    async getPendingPayment(uid) {
        // SELECT * FROM pi_payments WHERE user_uid = ? AND status IN ('pending', 'submitted')
    },
    async savePayment(data) {
        // INSERT INTO pi_payments ...
    },
    async updatePaymentStatus(paymentId, status, txid = null) {
        // UPDATE pi_payments SET status = ?, txid = ? WHERE payment_id = ?
    }
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, amount, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    const BASE = 'https://api.minepi.com/v2';

    // Validation
    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ error: "Server config incomplete" });
    }

    // ========== STEP 0: CHECK EXISTING PENDING PAYMENT ==========
    const existingPayment = await db.getPendingPayment(uid);
    
    if (existingPayment && existingPayment.status === 'pending') {
        // Ada payment pending - jangan create baru
        return res.status(409).json({
            error: "Pending payment exists",
            paymentId: existingPayment.payment_id,
            action: "Complete or cancel existing payment first"
        });
    }
    
    if (existingPayment && existingPayment.status === 'submitted') {
        // Ada payment dah submit tapi belum complete - try complete semula
        try {
            const completeRes = await axios.post(
                `${BASE}/payments/${existingPayment.payment_id}/complete`,
                { txid: existingPayment.txid },
                { headers: { 'Authorization': `Key ${API_KEY}` } }
            );
            
            await db.updatePaymentStatus(existingPayment.payment_id, 'completed');
            
            return res.status(200).json({
                success: true,
                paymentId: existingPayment.payment_id,
                txid: existingPayment.txid,
                recovered: true
            });
        } catch (error) {
            return res.status(500).json({
                error: "Stuck payment detected. Please contact support.",
                paymentId: existingPayment.payment_id
            });
        }
    }

    // Verify access token
    try {
        const meRes = await axios.get(`${BASE}/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (meRes.data?.uid !== uid) {
            return res.status(401).json({ error: "Invalid access token" });
        }
    } catch (error) {
        return res.status(401).json({ error: "Token verification failed" });
    }

    // ========== STEP 1: CREATE PAYMENT ==========
    let paymentId;
    try {
        const idempotencyKey = `a2u-${uid}-${amount}-${Date.now()}`;
        
        // Simpan pending record dulu sebelum API call
        const tempId = `temp-${Date.now()}`;
        await db.savePayment({
            user_uid: uid,
            amount: parseFloat(amount),
            memo: 'MB-LEGACY-A2U',
            metadata: metadata || {},
            payment_id: tempId,
            status: 'pending'
        });

        const createRes = await axios.post(`${BASE}/payments`, {
            amount: parseFloat(amount),
            memo: 'MB-LEGACY-A2U',
            metadata: { ...metadata, db_id: tempId },
            uid: uid
        }, {
            headers: {
                'Authorization': `Key ${API_KEY}`,
                'Content-Type': 'application/json',
                'Idempotency-Key': idempotencyKey
            }
        });

        paymentId = createRes.data.identifier;
        
        // Update dengan payment_id sebenar
        await db.updatePaymentStatus(tempId, 'pending', null, paymentId);
        
    } catch (error) {
        await db.updatePaymentStatus(tempId, 'cancelled');
        throw error;
    }

    // ========== STEP 2: SUBMIT TO BLOCKCHAIN ==========
    let txid;
    try {
        const submitRes = await axios.post(
            `${BASE}/payments/${paymentId}/submit`,
            {},
            { headers: { 'Authorization': `Key ${API_KEY}` } }
        );
        
        txid = submitRes.data.transaction?.txid;
        
        // Update status ke 'submitted' dengan txid
        await db.updatePaymentStatus(paymentId, 'submitted', txid);
        
    } catch (error) {
        // Submit gagal - payment masih dalam status 'pending' di database
        await db.updatePaymentStatus(paymentId, 'pending');
        throw error;
    }

    // ========== STEP 3: COMPLETE PAYMENT ==========
    try {
        await axios.post(
            `${BASE}/payments/${paymentId}/complete`,
            { txid: txid },
            { headers: { 'Authorization': `Key ${API_KEY}` } }
        );
        
        // Complete success - update ke 'completed'
        await db.updatePaymentStatus(paymentId, 'completed', txid);
        
    } catch (error) {
        // Complete gagal TAPI transaction dah submit ke blockchain
        // Status kekal 'submitted' - recovery nanti akan handle
        console.error("Complete failed but txid exists:", txid);
        throw error;
    }

    return res.status(200).json({
        success: true,
        paymentId,
        txid,
        amount: parseFloat(amount),
        userUid: uid
    });
            }
