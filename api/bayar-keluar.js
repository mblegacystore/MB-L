export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { uid, amount, memo, accessToken } = req.body;
    
    if (!uid || !amount) {
        return res.status(400).json({ success: false, error: "Data tak lengkap" });
    }
    
    if (!accessToken) {
        return res.status(400).json({ success: false, error: "Access token missing" });
    }
    
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    
    if (!API_KEY) return res.status(500).json({ success: false, error: "API Key missing" });
    if (!WALLET_SEED) return res.status(500).json({ success: false, error: "Wallet Seed missing" });
    
    const BASE_URL = "https://api.minepi.com/v2";
    
    try {
        // ========== LANGKAH 1: SAHKAN ACCESS TOKEN (Bearer) ==========
        const meRes = await fetch(`${BASE_URL}/me`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
        
        if (!meRes.ok) {
            return res.status(401).json({ 
                success: false, 
                error: "Access token tidak sah. Sila login semula." 
            });
        }
        
        const meData = await meRes.json();
        
        if (meData.uid !== uid) {
            return res.status(400).json({ 
                success: false, 
                error: "UID tidak sepadan dengan access token" 
            });
        }
        // ========== TAMAT LANGKAH 1 ==========
        
        // ========== LANGKAH 2: SEMAK & SELESAIKAN PEMBAYARAN TERTUNGGAK ==========
        const incompleteRes = await fetch(`${BASE_URL}/payments?direction=app_to_user`, {
            headers: { "Authorization": `Key ${API_KEY}` }
        });
        
        if (incompleteRes.ok) {
            const incompleteData = await incompleteRes.json();
            const pending = incompleteData.payments || [];
            
            for (const p of pending) {
                try {
                    // Cuba submit dulu
                    const sr = await fetch(`${BASE_URL}/payments/${p.identifier}/submit`, {
                        method: "POST",
                        headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ seed: WALLET_SEED })
                    });
                    const sd = await sr.json();
                    
                    if (sd.txid) {
                        // Submit berjaya, terus complete
                        await fetch(`${BASE_URL}/payments/${p.identifier}/complete`, {
                            method: "POST",
                            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
                            body: JSON.stringify({ txid: sd.txid })
                        });
                    } else {
                        // Submit gagal, cancel
                        await fetch(`${BASE_URL}/payments/${p.identifier}/cancel`, {
                            method: "POST",
                            headers: { "Authorization": `Key ${API_KEY}` }
                        });
                    }
                } catch {
                    // Error, cuba cancel
                    try {
                        await fetch(`${BASE_URL}/payments/${p.identifier}/cancel`, {
                            method: "POST",
                            headers: { "Authorization": `Key ${API_KEY}` }
                        });
                    } catch {}
                }
            }
        }
        // ========== TAMAT LANGKAH 2 ==========
        
        // ========== LANGKAH 3: CIPTA PEMBAYARAN (Key) ==========
        const createRes = await fetch(`${BASE_URL}/payments`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ 
                amount: parseFloat(amount), 
                memo: memo || "A2U Reward", 
                uid: uid,
                metadata: { source: "claim_reward" }  // metadata WAJIB diisi
            })
        });
        
        const createData = await createRes.json();
        
        if (!createRes.ok) {
            return res.status(400).json({ 
                success: false, 
                error: createData.message || createData.error || "Create failed",
                detail: createData
            });
        }
        
        const paymentId = createData.identifier;
        // ========== TAMAT LANGKAH 3 ==========
        
        // ========== LANGKAH 4: SIMPAN paymentId (dalam memori) ==========
        // Dalam aplikasi sebenar, simpan dalam database
        // Di sini kita guna variable sementara
        // ========== TAMAT LANGKAH 4 ==========
        
        // ========== LANGKAH 5: SUBMIT KE BLOCKCHAIN ==========
        const submitRes = await fetch(`${BASE_URL}/payments/${paymentId}/submit`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ seed: WALLET_SEED })
        });
        
        const submitData = await submitRes.json();
        
        if (!submitRes.ok || !submitData.txid) {
            // Gagal submit, cancel pembayaran
            await fetch(`${BASE_URL}/payments/${paymentId}/cancel`, {
                method: "POST",
                headers: { "Authorization": `Key ${API_KEY}` }
            });
            
            return res.status(400).json({ 
                success: false, 
                error: submitData.message || "Submit failed",
                detail: submitData
            });
        }
        
        const txid = submitData.txid;
        // ========== TAMAT LANGKAH 5 ==========
        
        // ========== LANGKAH 6: COMPLETE ==========
        const completeRes = await fetch(`${BASE_URL}/payments/${paymentId}/complete`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ txid: txid })
        });
        
        const completeData = await completeRes.json();
        // ========== TAMAT LANGKAH 6 ==========
        
        return res.status(200).json({ 
            success: true, 
            message: "0.1 Pi berjaya dihantar!",
            paymentId: paymentId,
            txid: txid,
            status: completeData.status || "completed"
        });
        
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
