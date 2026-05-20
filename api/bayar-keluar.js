import axios from 'axios';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

export default async function handler(req, res) {
    console.log("================== START A2U ==================");
    
    if (req.method !== 'POST') {
        console.log("ERROR: Method not allowed -", req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { amount, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    const BASE = 'https://api.minepi.com/v2';
    const NETWORK = process.env.PI_NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

    console.log("1. Check API_KEY:", API_KEY ? "ADA" : "TIADA");
    console.log("2. Check WALLET_SEED:", WALLET_SEED ? "ADA" : "TIADA");
    console.log("3. amount:", amount);
    console.log("4. accessToken length:", accessToken ? accessToken.length : 0);

    if (!API_KEY || !WALLET_SEED) {
        console.log("ERROR: Server config error");
        return res.status(500).json({ error: 'Server config error' });
    }

    // STEP 1: Verify user
    let uid;
    console.log("\n--- STEP 1: GET /me ---");
    try {
        const meRes = await axios.get(`${BASE}/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        uid = meRes.data.uid;
        console.log("SUCCESS: User verified, uid:", uid);
        console.log("username:", meRes.data.username);
    } catch (error) {
        console.log("ERROR: GET /me failed");
        console.log("status:", error.response?.status);
        console.log("data:", error.response?.data);
        return res.status(401).json({ error: 'Invalid token' });
    }

    try {
        // STEP 2: Create payment
        console.log("\n--- STEP 2: POST /payments ---");
        const createRes = await axios.post(`${BASE}/payments`, {
            amount: parseFloat(amount),
            memo: 'A2U REWARD',
            metadata: metadata || {},
            uid: uid
        }, {
            headers: {
                'Authorization': `Key ${API_KEY}`,
                'Idempotency-Key': `reward-${uid}-${Date.now()}`
            }
        });

        const paymentId = createRes.data.identifier;
        console.log("SUCCESS: Payment created, paymentId:", paymentId);

        // STEP 3: Sign transaction
        console.log("\n--- STEP 3: Sign Transaction ---");
        let signedTxXdr = null;
        if (createRes.data.transaction?.to_sign) {
            console.log("to_sign exists, length:", createRes.data.transaction.to_sign.length);
            const keypair = Keypair.fromSecret(WALLET_SEED);
            const tx = new Transaction(createRes.data.transaction.to_sign, NETWORK);
            tx.sign(keypair);
            signedTxXdr = tx.toEnvelope().toXDR('base64');
            console.log("SUCCESS: Transaction signed");
        } else {
            console.log("No to_sign, skip signing");
        }

        // STEP 4: Submit
        console.log("\n--- STEP 4: POST /submit ---");
        const submitRes = await axios.post(`${BASE}/payments/${paymentId}/submit`, 
            signedTxXdr ? { txid: signedTxXdr } : {},
            { headers: { 'Authorization': `Key ${API_KEY}` } }
        );

        const txid = submitRes.data.transaction?.txid;
        console.log("SUCCESS: Submitted, txid:", txid);

        // STEP 5: Complete
        console.log("\n--- STEP 5: POST /complete ---");
        await axios.post(`${BASE}/payments/${paymentId}/complete`, { txid }, {
            headers: { 'Authorization': `Key ${API_KEY}` }
        });
        console.log("SUCCESS: Payment completed!");

        console.log("================== SUCCESS ==================");
        return res.status(200).json({
            success: true,
            paymentId,
            txid,
            amount: parseFloat(amount)
        });

    } catch (error) {
        console.log("\n--- ERROR ---");
        console.log("status:", error.response?.status);
        console.log("data:", error.response?.data);
        console.log("message:", error.message);
        console.log("================== FAILED ==================");
        
        return res.status(error.response?.status || 500).json({
            error: error.response?.data?.error || error.message
        });
    }
}
