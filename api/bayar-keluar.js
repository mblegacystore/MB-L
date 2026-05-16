// api/bayar-keluar.js - A2U (App-to-User) dengan handling expired/pending
export default async function handler(req, res) {
    // 1. Hanya terima POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // 2. Dapatkan data dari frontend
    const { uid, amount, memo, paymentId: existingPaymentId, action, txid } = req.body;
    
    // 3. Dapatkan kredensial dari Environment Variables
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    
    if (!API_KEY || !WALLET_SEED) {
        console.error("Missing API_KEY_TESTNET or WALLET_SEED");
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap." });
    }
    
    const BASE_URL = "https://api.minepi.com/v2";
    
    // ========== HANDLE INCOMPLETE PAYMENT (EXPIRED/PENDING) ==========
    if (action === 'clean' && existingPaymentId) {
        try {
            // Bersihkan payment yang tergendala
            const cleanResponse = await fetch(`${BASE_URL}/payments/${existingPaymentId}/cancel`, {
                method: "POST",
                headers: { "Authorization": `Key ${API_KEY}` }
            });
            return res.status(200).json({ success: true, message: "Payment cancelled/cleaned" });
        } catch (error) {
            return res.status(500).json({ error: "Gagal membersihkan payment" });
        }
    }
    
    // ========== HANDLE APPROVE (untuk U2A compatibility) ==========
    if (action === 'approve' && existingPaymentId) {
        try {
            await fetch(`${BASE_URL}/payments/${existingPaymentId}/approve`, {
                method: "POST",
                headers: { "Authorization": `Key ${API_KEY}` }
            });
            return res.status(200).json({ success: true, message: "Approved" });
        } catch (error) {
            return res.status(500).json({ error: "Gagal approve payment" });
        }
    }
    
    // ========== HANDLE COMPLETE (untuk U2A compatibility) ==========
    if (action === 'complete' && existingPaymentId && txid) {
        try {
            await fetch(`${BASE_URL}/payments/${existingPaymentId}/complete`, {
                method: "POST",
                headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ txid: txid })
            });
            return res.status(200).json({ success: true, message: "Completed" });
        } catch (error) {
            return res.status(500).json({ error: "Gagal complete payment" });
        }
    }
    
    // ========== A2U: CREATE NEW PAYMENT ==========
    if (!uid || !amount) {
        return res.status(400).json({ error: "Data tak lengkap. uid dan amount diperlukan." });
    }
    
    try {
        // STEP 1: CREATE PAYMENT
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
            // Jika payment sudah wujud (pending/expired)
            if (createData.identifier) {
                // Cuba bersihkan dulu
                await fetch(`${BASE_URL}/payments/${createData.identifier}/cancel`, {
                    method: "POST",
                    headers: { "Authorization": `Key ${API_KEY}` }
                });
                // Re-try create (panggil semula fungsi ini)
                return handler(req, res);
            }
            console.error("Create payment error:", createData);
            return res.status(400).json({ error: createData.error || "Gagal cipta payment" });
        }
        
        const paymentId = createData.identifier;
        console.log(`Payment created: ${paymentId}`);
        
        // STEP 2: SUBMIT PAYMENT
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
        
        const submittedTxid = submitData.txid;
        console.log(`Payment submitted. TxID: ${submittedTxid}`);
        
        // STEP 3: COMPLETE PAYMENT
        const completeResponse = await fetch(`${BASE_URL}/payments/${paymentId}/complete`, {
            method: "POST",
            headers: {
                "Authorization": `Key ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ txid: submittedTxid })
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
            txid: submittedTxid,
            message: `${amount} Test-Pi dihantar ke pengguna.`
        });
        
    } catch (error) {
        console.error("A2U Error:", error);
        return res.status(500).json({ error: "Internal server error: " + error.message });
    }
}
