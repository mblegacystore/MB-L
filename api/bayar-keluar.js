export default async function handler(req, res) {
    // Hanya terima POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { uid, amount, memo, paymentId, action, txid } = req.body;
    
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    
    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap" });
    }
    
    const BASE_URL = "https://api.minepi.com/v2";
    
    // ========== 1. HANDLE EXPIRED/PENDING (CUCI) ==========
    if (action === 'clean' && paymentId) {
        try {
            // Semak status payment dulu
            const statusRes = await fetch(`${BASE_URL}/payments/${paymentId}`, {
                headers: { "Authorization": `Key ${API_KEY}` }
            });
            const paymentStatus = await statusRes.json();
            
            // Jika sudah ada txid, jangan cancel – complete sahaja
            if (paymentStatus.transaction?.id) {
                await fetch(`${BASE_URL}/payments/${paymentId}/complete`, {
                    method: "POST",
                    headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ txid: paymentStatus.transaction.id })
                });
                return res.status(200).json({ success: true, message: "Payment completed" });
            } else {
                // Cancel payment yang tergendala
                await fetch(`${BASE_URL}/payments/${paymentId}/cancel`, {
                    method: "POST",
                    headers: { "Authorization": `Key ${API_KEY}` }
                });
                return res.status(200).json({ success: true, message: "Payment cleaned" });
            }
        } catch (error) {
            return res.status(500).json({ error: "Gagal bersihkan payment" });
        }
    }
    
    // ========== 2. HANDLE COMPLETE (U2A compatibility) ==========
    if (action === 'complete' && paymentId && txid) {
        try {
            await fetch(`${BASE_URL}/payments/${paymentId}/complete`, {
                method: "POST",
                headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ txid })
            });
            return res.status(200).json({ success: true, message: "Completed" });
        } catch (error) {
            return res.status(500).json({ error: "Gagal complete payment" });
        }
    }
    
    // ========== 3. A2U: CREATE, SUBMIT, COMPLETE ==========
    if (!uid || !amount) {
        return res.status(400).json({ error: "Data tak lengkap. uid dan amount diperlukan." });
    }
    
    try {
        // STEP 1: CREATE PAYMENT
        const createRes = await fetch(`${BASE_URL}/payments`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ amount: parseFloat(amount), memo: memo || "A2U Reward", uid })
        });
        
        const createData = await createRes.json();
        
        if (!createRes.ok) {
            // Jika payment sudah wujud (pending/expired)
            if (createData.identifier) {
                // Cuba bersihkan (panggil fungsi clean)
                await fetch(`${BASE_URL}/payments/${createData.identifier}/cancel`, {
                    method: "POST",
                    headers: { "Authorization": `Key ${API_KEY}` }
                });
            }
            return res.status(400).json({ error: createData.error || "Gagal cipta payment" });
        }
        
        const newPaymentId = createData.identifier;
        
        // STEP 2: SUBMIT PAYMENT
        const submitRes = await fetch(`${BASE_URL}/payments/${newPaymentId}/submit`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ seed: WALLET_SEED })
        });
        
        const submitData = await submitRes.json();
        if (!submitRes.ok) {
            return res.status(400).json({ error: submitData.error || "Gagal submit payment" });
        }
        
        const newTxid = submitData.txid;
        
        // STEP 3: COMPLETE PAYMENT
        const completeRes = await fetch(`${BASE_URL}/payments/${newPaymentId}/complete`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ txid: newTxid })
        });
        
        if (!completeRes.ok) {
            const completeData = await completeRes.json();
            return res.status(400).json({ error: completeData.error || "Gagal complete payment" });
        }
        
        return res.status(200).json({ success: true, paymentId: newPaymentId, txid: newTxid });
        
    } catch (error) {
        console.error("A2U Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
