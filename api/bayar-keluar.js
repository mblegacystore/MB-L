// api/bayar-keluar.js - VERSI TUNGGAL & BETUL
export default async function handler(req, res) {
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
    
    // ========== 1. HANDLE EXPIRED/PENDING ==========
    if (action === 'clean' && paymentId) {
        try {
            await fetch(`${BASE_URL}/payments/${paymentId}/cancel`, {
                method: "POST",
                headers: { "Authorization": `Key ${API_KEY}` }
            });
            return res.status(200).json({ success: true, message: "Payment cleaned" });
        } catch (error) {
            return res.status(500).json({ error: "Gagal bersihkan payment" });
        }
    }
    
    // ========== 2. HANDLE COMPLETE (U2A) ==========
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
    
    // ========== 3. A2U: CREATE → SUBMIT → COMPLETE ==========
    if (!uid || !amount) {
        return res.status(400).json({ error: "Data tak lengkap" });
    }
    
    try {
        // CREATE
        const createRes = await fetch(`${BASE_URL}/payments`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ amount: parseFloat(amount), memo: memo || "A2U Reward", uid })
        });
        
        const createData = await createRes.json();
        if (!createRes.ok) {
            return res.status(400).json({ error: createData.error || "Gagal cipta payment" });
        }
        
        const paymentId = createData.identifier;
        
        // SUBMIT
        const submitRes = await fetch(`${BASE_URL}/payments/${paymentId}/submit`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ seed: WALLET_SEED })
        });
        
        const submitData = await submitRes.json();
        if (!submitRes.ok) {
            return res.status(400).json({ error: submitData.error || "Gagal submit payment" });
        }
        
        const txid = submitData.txid;
        
        // COMPLETE
        const completeRes = await fetch(`${BASE_URL}/payments/${paymentId}/complete`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ txid })
        });
        
        if (!completeRes.ok) {
            const completeData = await completeRes.json();
            return res.status(400).json({ error: completeData.error || "Gagal complete payment" });
        }
        
        return res.status(200).json({ success: true, paymentId, txid });
        
    } catch (error) {
        console.error("A2U Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
