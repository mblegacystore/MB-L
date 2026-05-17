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
    
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    
    if (!WALLET_SEED) {
        return res.status(500).json({ error: "Wallet Seed missing" });
    }
    
    const BASE_URL = "https://api.minepi.com/v2";
    
    // ========== PRA-PEMBERSIHAN AUTOMATIK ==========
    // Selesaikan semua pembayaran A2U tertunggak sebelum cipta baru
    try {
        const incompleteRes = await fetch(
            `${BASE_URL}/payments?direction=app_to_user`,
            { headers: { "Authorization": `Key ${API_KEY}` } }
        );
        if (incompleteRes.ok) {
            const incompleteData = await incompleteRes.json();
            const pendingPayments = incompleteData.payments || [];
            for (const p of pendingPayments) {
                try {
                    // Cuba submit
                    const sr = await fetch(`${BASE_URL}/payments/${p.identifier}/submit`, {
                        method: "POST",
                        headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ seed: WALLET_SEED })
                    });
                    const sd = await sr.json();
                    if (sd.txid) {
                        // Cuba complete
                        await fetch(`${BASE_URL}/payments/${p.identifier}/complete`, {
                            method: "POST",
                            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
                            body: JSON.stringify({ txid: sd.txid })
                        });
                    }
                } catch {
                    // Jika submit gagal, cuba cancel
                    try {
                        await fetch(`${BASE_URL}/payments/${p.identifier}/cancel`, {
                            method: "POST",
                            headers: { "Authorization": `Key ${API_KEY}` }
                        });
                    } catch {}
                }
            }
        }
    } catch {}
    // ========== TAMAT PRA-PEMBERSIHAN ==========
    
    try {
        // ========== LANGKAH 1: CIPTA PEMBAYARAN A2U ==========
        const createRes = await fetch(`${BASE_URL}/payments`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ 
                amount: parseFloat(amount), 
                memo: memo || "A2U Debug", 
                uid: uid,   // ✅ BETUL: guna "uid", bukan "recipient"
                metadata: { source: "claim_reward" }
            })
        });
        
        const createData = await createRes.json();
        
        if (!createRes.ok) {
            return res.status(400).json({
                success: false,
                ok: false,
                status: createRes.status,
                error: createData.message || createData.error || "Gagal cipta pembayaran",
                fullResponse: createData,
                uid_sent: uid
            });
        }
        
        const paymentId = createData.identifier;
        // ========== TAMAT LANGKAH 1 ==========
        
        // ========== LANGKAH 2: SUBMIT ==========
        const submitRes = await fetch(`${BASE_URL}/payments/${paymentId}/submit`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ seed: WALLET_SEED })
        });
        
        const submitData = await submitRes.json();
        
        if (!submitRes.ok || !submitData.txid) {
            // Gagal submit → batalkan pembayaran supaya tak jadi pending
            try {
                await fetch(`${BASE_URL}/payments/${paymentId}/cancel`, {
                    method: "POST",
                    headers: { "Authorization": `Key ${API_KEY}` }
                });
            } catch {}
            
            return res.status(400).json({
                success: false,
                ok: false,
                error: submitData.message || "Gagal submit pembayaran",
                paymentId: paymentId
            });
        }
        
        const txid = submitData.txid;
        // ========== TAMAT LANGKAH 2 ==========
        
        // ========== LANGKAH 3: COMPLETE ==========
        const completeRes = await fetch(`${BASE_URL}/payments/${paymentId}/complete`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ txid })
        });
        
        // Walaupun complete gagal, txid sudah ada — Pi tetap sampai
        return res.status(200).json({
            success: true,
            ok: true,
            message: "0.1 Pi berjaya dihantar!",
            paymentId: paymentId,
            txid: txid,
            uid_sent: uid
        });
        // ========== TAMAT LANGKAH 3 ==========
        
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            ok: false,
            error: error.message 
        });
    }
}
