export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { uid, amount, memo } = req.body;
    
    if (!uid || !amount) {
        return res.status(400).json({ error: "Data tak lengkap" });
    }
    
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    
    if (!API_KEY) {
        return res.status(500).json({ error: "API Key missing" });
    }
    
    const BASE_URL = "https://api.minepi.com/v2";
    
    try {
        const createRes = await fetch(`${BASE_URL}/payments`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ 
                amount: parseFloat(amount), 
                memo: memo || "A2U Debug", 
                recipient: uid 
            })
        });
        
        const createData = await createRes.json();
        
        // ===== JIKA GAGAL CIPTA, RETURN ERROR =====
        if (!createRes.ok) {
            return res.status(400).json({
                success: false,
                ok: false,
                status: createRes.status,
                error: createData.message || "Gagal cipta pembayaran",
                fullResponse: createData,
                uid_sent: uid
            });
        }
        
        // ===== TAMBAHAN BARU: SUBMIT + COMPLETE =====
        const paymentId = createData.identifier;
        const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
        
        if (!WALLET_SEED) {
            return res.status(500).json({ success: false, error: "Wallet Seed tiada" });
        }
        
        // Langkah 2: Submit
        const submitRes = await fetch(`${BASE_URL}/payments/${paymentId}/submit`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ seed: WALLET_SEED })
        });
        
        const submitData = await submitRes.json();
        
        if (!submitRes.ok || !submitData.txid) {
            return res.status(400).json({
                success: false,
                ok: false,
                error: submitData.message || "Gagal submit pembayaran",
                paymentId: paymentId
            });
        }
        
        const txid = submitData.txid;
        
        // Langkah 3: Complete
        const completeRes = await fetch(`${BASE_URL}/payments/${paymentId}/complete`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ txid })
        });
        
        const completeData = await completeRes.json();
        
        if (!completeRes.ok) {
            return res.status(200).json({
                success: true,
                ok: true,
                status: completeRes.status,
                message: "Pembayaran dihantar (complete tertunda)",
                paymentId: paymentId,
                txid: txid,
                warning: "complete_pending"
            });
        }
        
        // ===== BERJAYA SEPENUHNYA =====
        return res.status(200).json({
            success: true,
            ok: true,
            status: 200,
            message: "0.1 Pi berjaya dihantar!",
            paymentId: paymentId,
            txid: txid,
            uid_sent: uid
        });
        // ===== TAMAT TAMBAHAN =====
        
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
