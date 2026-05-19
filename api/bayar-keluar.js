import axios from 'axios';
import * as StellarSdk from 'stellar-sdk';

// SOP: WAJIB guna external storage untuk production. Memory akan hilang.
// Untuk Vercel, pakai Upstash Redis/Vercel KV/Supabase. Ni contoh pakai Map untuk dev je.
const paymentStorage = new Map(); 

const PI_API_BASE = 'https://api.minepi.com/v2/payments';
const HORIZON_URL = 'https://horizon-testnet.stellar.org'; // MAINNET: https://horizon.stellar.org
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET; // MAINNET: StellarSdk.Networks.PUBLIC
const COMPLETE_TIMEOUT_MS = 50000;
const XDR_EXPIRY_BUFFER_S = 30;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { amount, uid, metadata, accessToken, action, paymentId, txid } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;

    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ error: "Server config incomplete" });
    }

    const piApiHeaders = {
        'Authorization': `Key ${API_KEY}`,
        'Content-Type': 'application/json',
    };

    // ============================================
    // SOP: MANUAL ACTIONS
    // ============================================
    if (action === 'clean' && paymentId) {
        try {
            await axios.post(`${PI_API_BASE}/${paymentId}/cancel`, {}, { headers: piApiHeaders });
            paymentStorage.delete(paymentId);
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(error.response?.status || 500).json({ error: error.response?.data || error.message });
        }
    }

    if (action === 'complete' && paymentId && txid) {
        try {
            await axios.post(`${PI_API_BASE}/${paymentId}/complete`, { txid }, { headers: piApiHeaders });
            const p = paymentStorage.get(paymentId);
            if (p) paymentStorage.set(paymentId, { ...p, status: 'developer_completed', txid });
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(error.response?.status || 500).json({ error: error.response?.data || error.message });
        }
    }

    // ============================================
    // SOP A2U: START
    // ============================================
    if (!uid || amount === undefined || amount === null) {
        return res.status(400).json({ error: "uid and amount required" });
    }

    // SOP #1: BEARER TOKEN VALIDATION - WAJIB FIRST STEP
    if (!accessToken) {
        return res.status(400).json({ error: "Access token missing. Required by Pi SOP." });
    }

    const amountStr = Number.parseFloat(amount).toFixed(7);
    if (isNaN(amountStr) || Number.parseFloat(amountStr) <= 0) {
        return res.status(400).json({ error: "Invalid amount. Must be >0 and max 7 decimal places." });
    }

    try {
        // SOP #1A: Validate Bearer dengan Pi Server
        const meRes = await axios.get('https://api.minepi.com/v2/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (!meRes.data?.uid) throw new Error('Invalid bearer token: no uid returned');
        if (meRes.data.uid !== uid) throw new Error('Bearer token uid mismatch');

        // SOP #2: Handle Incomplete Payments - WAJIB sebelum create baru
        const searchRes = await axios.get(`${PI_API_BASE}?uid=${uid}&direction=app_to_user`, {
            headers: { 'Authorization': `Key ${API_KEY}` }
        });
        const incompletePayments = searchRes.data?.payments || [];

        for (const p of incompletePayments) {
            if (p.status?.developer_completed || p.status?.cancelled || p.status?.user_cancelled) continue;

            if (p.transaction?.txid) {
                // SOP: Kalau dah ada txid dari Stellar, wajib complete kat Pi
                await axios.post(`${PI_API_BASE}/${p.identifier}/complete`, 
                    { txid: p.transaction.txid }, 
                    { headers: piApiHeaders }
                );
            } else if (!p.transaction) {
                // SOP: Cancel kalau takde transaction langsung
                await axios.post(`${PI_API_BASE}/${p.identifier}/cancel`, {}, { headers: piApiHeaders });
            }
            // SOP: Kalau transaction: {} tapi txid null = JANGAN KACAU. Race condition.
        }

        // SOP #3: Idempotent - guna metadata untuk elak double create
        const idempotencyKey = metadata?.idempotency || `${uid}-${metadata?.source}-${amountStr}`;
        const existing = incompletePayments.find(p => 
            p.metadata?.idempotency === idempotencyKey && 
            !p.status?.developer_completed && 
            !p.status?.cancelled
        );
        
        if (existing) {
            return res.status(200).json({ 
                success: true, 
                message: "Payment already exists",
                paymentId: existing.identifier,
                status: existing.status
            });
        }

        // SOP #4: Create Payment - amount MESTI string
        const createResponse = await axios.post(
            PI_API_BASE,
            {
                amount: amountStr,
                memo: String(metadata?.memo || 'A2U').slice(0, 28), // SOP: max 28 bytes
                metadata: { ...metadata, idempotency: idempotencyKey },
                uid: uid,
            },
            { headers: piApiHeaders }
        );

        const paymentId = createResponse.data.identifier;
        const txXdr = createResponse.data.transaction?.to_sign;
        if (!txXdr) throw new Error('Pi did not return transaction XDR');

        // SOP #5: STELLAR SDK STORAGE - Simpan state sebelum sign
        paymentStorage.set(paymentId, {
            uid, amount: amountStr, status: 'created', 
            createdAt: Date.now(), idempotency: idempotencyKey
        });

        // SOP #6: STELLAR SDK - Parse & Check Expiry
        const transaction = new StellarSdk.Transaction(txXdr, NETWORK_PASSPHRASE);
        const now = Math.floor(Date.now() / 1000);
        const maxTime = Number.parseInt(transaction.timeBounds?.maxTime || '0');
        
        if (maxTime && maxTime - now < XDR_EXPIRY_BUFFER_S) {
            await axios.post(`${PI_API_BASE}/${paymentId}/cancel`, {}, { headers: piApiHeaders });
            paymentStorage.delete(paymentId);
            throw new Error('XDR near expiry. Retry payment.');
        }

        // SOP #7: STELLAR SDK - Sign dengan App Wallet Seed
        const keypair = StellarSdk.Keypair.fromSecret(WALLET_SEED);
        transaction.sign(keypair);

        // SOP #8: STELLAR SDK - Submit ke Horizon untuk dapat txid
        const server = new StellarSdk.Horizon.Server(HORIZON_URL);
        const horizonResult = await server.submitTransaction(transaction);
        const realTxid = horizonResult.hash; // SOP: Ni 64-char hash, bukan XDR

        // SOP #9: STELLAR SDK STORAGE - Update state dengan txid
        paymentStorage.set(paymentId, { 
            ...paymentStorage.get(paymentId), 
            status: 'submitted_to_stellar', 
            txid: realTxid,
            horizonLedger: horizonResult.ledger
        });

        // SOP #10: Submit txid ke Pi
        await axios.post(
            `${PI_API_BASE}/${paymentId}/submit`,
            { txid: realTxid },
            { headers: piApiHeaders }
        );

        paymentStorage.set(paymentId, { ...paymentStorage.get(paymentId), status: 'submitted_to_pi' });

        // SOP #11: Complete dalam 60s - WAJIB
        const completePromise = axios.post(
            `${PI_API_BASE}/${paymentId}/complete`,
            { txid: realTxid },
            { headers: piApiHeaders }
        );
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Complete timeout 50s exceeded')), COMPLETE_TIMEOUT_MS)
        );

        await Promise.race([completePromise, timeoutPromise]);

        paymentStorage.set(paymentId, { ...paymentStorage.get(paymentId), status: 'developer_completed' });

        return res.status(200).json({
            success: true,
            message: `${amountStr} Pi sent successfully`,
            paymentId: paymentId,
            txid: realTxid
        });

    } catch (error) {
        const status = error.response?.status;
        const data = error.response?.data;
        const msg = error.message;
        
        console.error("PI_A2U_SOP_ERROR", { 
            status, 
            piError: data, 
            msg, 
            uid, 
            amount: amountStr,
            stellarError: error.response?.data?.extras?.result_codes 
        });

        // SOP: Kalau fail lepas submit Stellar, paymentId + txid masih dalam storage untuk manual complete
        return res.status(status || 500).json({
            success: false,
            error: data?.error || msg || 'A2U process failed',
            detail: data,
            hint: 'Check server logs with paymentId for manual recovery'
        });
    }
                      }
