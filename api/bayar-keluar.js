import axios from 'axios';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

export default async function handler(req, res) {
    console.log("================== START A2U ==================");
    console.log("1. Method:", req.method);
    
    if (req.method !== 'POST') {
        console.log("ERROR: Method not allowed -", req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { amount, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    const BASE = 'https://api.minepi.com/v2';
    const NETWORK = Networks.TESTNET;

    console.log("2. API_KEY exists:", API_KEY ? "YES" : "NO");
    console.log("3. WALLET_SEED exists:", WALLET_SEED ? "YES" : "NO");
    console.log("4. amount:", amount);
    console.log("5. accessToken length:", accessToken ? accessToken.length : 0);
    console.log("6. metadata:", metadata);

    if (!API_KEY || !WALLET_SEED) {
        console.log("ERROR: Server config error");
        return res.status(500).json({ error: 'Server config error' });
    }

    // STEP 1: Verify user
    console.log("\n--- STEP 1: GET /me ---");
    let uid;
    try {
        const meRes = await axios.get(`${BASE}/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        uid = meRes.data.uid;
        console.log("✅ GET /me SUCCESS");
        console.log("   uid:", uid);
        console.log("   username:", meRes.data.username);
        console.log("   full response:", JSON.stringify(meRes.data, null, 2));
    } catch (error) {
        console.log("❌ GET /me FAILED");
        console.log("   status:", error.response?.status);
        console.log("   data:", error.response?.data);
        console.log("   message:", error.message);
        return res.status(401).json({ error: 'Invalid token' });
    }

    try {
        // STEP 2: Create payment
        console.log("\n--- STEP 2: POST /payments ---");
        const createPayload = {
            amount: parseFloat(amount),
            memo: 'A2U REWARD',
            metadata: metadata || {},
            uid: uid
        };
        console.log("   payload:", JSON.stringify(createPayload, null, 2));
        
        const createRes = await axios.post(`${BASE}/payments`, createPayload, {
            headers: {
                'Authorization': `Key ${API_KEY}`,
                'Content-Type': 'application/json',
                'Idempotency-Key': `reward-${uid}-${Date.now()}`
            }
        });

        const paymentId = createRes.data.identifier;
        console.log("✅ POST /payments SUCCESS");
        console.log("   paymentId:", paymentId);
        console.log("   full response:", JSON.stringify(createRes.data, null, 2));

        // STEP 3: Sign transaction
        console.log("\n--- STEP 3: Sign Transaction (Stellar SDK) ---");
        console.log("   WALLET_SEED (first 10 chars):", WALLET_SEED.substring(0, 10) + "...");
        console.log("   to_sign exists:", createRes.data.transaction?.to_sign ? "YES" : "NO");
        
        if (!createRes.data.transaction?.to_sign) {
            console.log("❌ No to_sign in response");
            throw new Error("No transaction to sign");
        }
        
        console.log("   to_sign length:", createRes.data.transaction.to_sign.length);
        
        const keypair = Keypair.fromSecret(WALLET_SEED);
        console.log("   keypair created, public key:", keypair.publicKey());
        
        const tx = new Transaction(createRes.data.transaction.to_sign, NETWORK);
        console.log("   transaction created");
        
        tx.sign(keypair);
        console.log("   transaction signed");
        
        const signedTxXdr = tx.toEnvelope().toXDR('base64');
        console.log("   signedTxXdr length:", signedTxXdr.length);
        console.log("✅ Signing complete");

        // STEP 4: Submit
        console.log("\n--- STEP 4: POST /submit ---");
        const submitPayload = { txid: signedTxXdr };
        console.log("   payload: { txid: '...(hidden)' }");
        
        const submitRes = await axios.post(`${BASE}/payments/${paymentId}/submit`, submitPayload, {
            headers: { 'Authorization': `Key ${API_KEY}` }
        });

        const txid = submitRes.data.transaction?.txid;
        console.log("✅ POST /submit SUCCESS");
        console.log("   txid:", txid);
        console.log("   full response:", JSON.stringify(submitRes.data, null, 2));

        // STEP 5: Complete
        console.log("\n--- STEP 5: POST /complete ---");
        const completePayload = { txid: txid };
        console.log("   payload:", completePayload);
        
        await axios.post(`${BASE}/payments/${paymentId}/complete`, completePayload, {
            headers: { 'Authorization': `Key ${API_KEY}` }
        });
        console.log("✅ POST /complete SUCCESS");

        console.log("\n================== A2U SUCCESS ==================");
        console.log("   paymentId:", paymentId);
        console.log("   txid:", txid);
        console.log("   amount:", amount);
        
        return res.status(200).json({
            success: true,
            paymentId,
            txid,
            amount: parseFloat(amount)
        });

    } catch (error) {
        console.log("\n================== A2U FAILED ==================");
        console.log("ERROR DETAILS:");
        console.log("   status:", error.response?.status);
        console.log("   data:", JSON.stringify(error.response?.data, null, 2));
        console.log("   message:", error.message);
        console.log("   stack:", error.stack);
        
        return res.status(error.response?.status || 500).json({
            error: error.response?.data?.error || error.message
        });
    }
                }
