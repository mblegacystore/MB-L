// api/bayar-keluar.js - A2U (App-to-User) untuk Testnet
export default async function handler(req, res) {
    // 1. Hanya terima POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // 2. Dapatkan data dari frontend
    const { uid, amount, memo } = req.body;
    
    // 3. Validasi input
    if (!uid || !amount) {
        return res.status(400).json({ error: "Data tak lengkap. uid dan amount diperlukan." });
    }
    
    // 4. Dapatkan kredensial dari Environment Variables
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    
    if (!API_KEY || !WALLET_SEED) {
        console.error("Missing API_KEY_TESTNET or WALLET_SEED");
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap." });
    }
    
    const BASE_URL = "https://api.minepi.com/v2";
    
    try {
        // ========== STEP 1: CREATE PAYMENT ==========
        const createResponse = await fetch(`${BASE_URL}/payments`, {
            method: "POST",
            headers: {
                "Authorization": `Key ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                amount: amount,
                memo: memo || "A2U Reward",
                metadata: { type: "payout", source: "MB Legacy Store" },
                uid: uid
            })
        });
        
        const createData = await createResponse.json();
        
        if (!createResponse.ok) {
            console.error("Create payment error:", createData);
            return res.status(400).json({ error: createData.error || "Gagal cipta payment" });
        }
        
        const paymentId = createData.identifier;
        console.log(`Payment created: ${paymentId}`);
        
        // ========== STEP 2: SUBMIT PAYMENT ==========
        const submitResponse = await fetch(`${BASE_URL}/payments/${paymentId}/submit`, {
            method: "POST",
            headers: {
                "Authorization": `Key ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ seed: WALLET_SEED })
        });
        
        const submitData = await submitResponse.json();
        
        if (!submitResponse.ok) {
            console.error("Submit payment error:", submitData);
            return res.status(400).json({ error: submitData.error || "Gagal submit payment" });
        }
        
        const txid = submitData.txid;
        console.log(`Payment submitted. TxID: ${txid}`);
        
        // ========== STEP 3: COMPLETE PAYMENT ==========
        const completeResponse = await fetch(`${BASE_URL}/payments/${paymentId}/complete`, {
            method: "POST",
            headers: {
                "Authorization": `Key ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ txid: txid })
        });
        
        if (!completeResponse.ok) {
            const completeData = await completeResponse.json();
            console.error("Complete payment error:", completeData);
            return res.status(400).json({ error: completeData.error || "Gagal complete payment" });
        }
        
        console.log(`Payment completed: ${paymentId}`);
        
        return res.status(200).json({ 
            success: true, 
            paymentId: paymentId,
            txid: txid,
            message: `${amount} Test-Pi dihantar ke pengguna.`
        });
        
    } catch (error) {
        console.error("A2U Error:", error);
        return res.status(500).json({ error: "Internal server error: " + error.message });
    }
}
