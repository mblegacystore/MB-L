export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { uid, amount, memo } = req.body;
    
    if (!uid || !amount) {
        return res.status(400).json({ error: "Data tak lengkap" });
    }
    
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    
    if (!API_KEY) return res.status(500).json({ error: "API Key missing" });
    if (!WALLET_SEED) return res.status(500).json({ error: "Wallet Seed missing" });
    
    const BASE_URL = "https://api.minepi.com/v2";
    
    // ========== PRA-PEMBERSIHAN ==========
    try {
        const incRes = await fetch(`${BASE_URL}/payments?direction=app_to_user`, {
            headers: { "Authorization": `Key ${API_KEY}` }
        });
        if (incRes.ok) {
            const data = await incRes.json();
            for (const p of (data.payments || [])) {
                try {
                    const sr = await fetch(`${BASE_URL}/payments/${p.identifier}/submit`, {
                        method: "POST",
                        headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ seed: WALLET_SEED })
                    });
                    const sd = await sr.json();
                    if (sd.txid) {
                        await fetch(`${BASE_URL}/payments/${p.identifier}/complete`, {
                            method: "POST",
                            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
                            body: JSON.stringify({ txid: sd.txid })
                        });
                    }
                } catch {
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
        // ========== CIPTA PEMBAYARAN ==========
        const createRes = await fetch(`${BASE_URL}/payments`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ 
                amount: parseFloat(amount), 
                memo: memo || "A2U Debug", 
                uid: uid,
                metadata: { source: "claim_reward" }
            })
        });
        
        const createData = await createRes.json();
        
        if (!createRes.ok) {
            // 🔥 KEMBALIKAN SEMUA MAKLUMAT RALAT UNTUK DIAGNOSIS
            return res.status(400).json({
                success: false,
                error: createData.message || createData.error || "Gagal cipta pembayaran",
                fullError: createData,  // objek penuh ralat dari Pi
                statusCode: createRes.status,
                uid_sent: uid
            });
        }
        
        const paymentId = createData.identifier;
        // ========== TAMAT CIPTA ==========
        
        // Langkah 2: Submit
        const submitRes = await fetch(`${BASE_URL}/payments/${paymentId}/submit`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ seed: WALLET_SEED })
        });
        
        const submitData = await submitRes.json();
        
        if (!submitRes.ok || !submitData.txid) {
            try {
                await fetch(`${BASE_URL}/payments/${paymentId}/cancel`, {
                    method: "POST",
                    headers: { "Authorization": `Key ${API_KEY}` }
                });
            } catch {}
            
            return res.status(400).json({
                success: false,
                error: submitData.message || "Gagal submit"
            });
        }
        
        // Langkah 3: Complete
        await fetch(`${BASE_URL}/payments/${paymentId}/complete`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ txid: submitData.txid })
        });
        
        return res.status(200).json({
            success: true,
            message: "0.1 Pi berjaya dihantar!"
        });
        
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
