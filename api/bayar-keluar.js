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
    
    // ========== 1. HANDLE EXPIRED/PENDING (CUCI) ==========
    if (action === 'clean' && paymentId) {
        try {
            const statusRes = await fetch(`${BASE_URL}/payments/${paymentId}`, {
                headers: { "Authorization": `Key ${API_KEY}` }
            });
            const paymentStatus = await statusRes.json();
            
            if (paymentStatus.transaction?.id) {
                await fetch(`${BASE_URL}/payments/${paymentId}/complete`, {
                    method: "POST",
                    headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ txid: paymentStatus.transaction.id })
                });
                return res.status(200).json({ success: true, message: "Payment completed" });
            } else {
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
    
    // ========== 2. HANDLE COMPLETE ==========
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
    
    // ========== 3. A2U: VERSI DEBUG RINGKAS ==========
    if (!uid || !amount) {
        return res.status(400).json({ error: "Data tak lengkap. uid dan amount diperlukan." });
    }

    console.log(`[DEBUG A2U] Menerima request untuk UID: ${uid}`);

    try {
        // --- LANGKAH 1: Cuba CREATE Payment ---
        console.log(`[DEBUG A2U] Mencuba CREATE payment...`);
        const createRes = await fetch(`${BASE_URL}/payments`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ amount: parseFloat(amount), memo: memo || "A2U Reward", uid })
        });
        const createData = await createRes.json();
        
        if (!createRes.ok) {
            console.error(`[GAGAL CREATE] Status: ${createRes.status}, Body:`, JSON.stringify(createData));
            return res.status(400).json({ 
                error: "CREATE GAGAL: " + (createData.message || createData.error || "User not found"),
                debug: createData 
            });
        }
        
        console.log(`[DEBUG A2U] CREATE Berjaya. ID: ${createData.identifier}`);
        
        // --- LANGKAH 2: Cuba SUBMIT Payment ---
        console.log(`[DEBUG A2U] Mencuba SUBMIT payment...`);
        const submitRes = await fetch(`${BASE_URL}/payments/${createData.identifier}/submit`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ seed: WALLET_SEED })
        });
        const submitData = await submitRes.json();
        
        if (!submitRes.ok) {
            console.error(`[GAGAL SUBMIT] Status: ${submitRes.status}, Body:`, JSON.stringify(submitData));
            return res.status(400).json({ 
                error: "SUBMIT GAGAL: " + (submitData.message || submitData.error),
                debug: submitData 
            });
        }
        
        console.log(`[DEBUG A2U] SUBMIT Berjaya. TxID: ${submitData.txid}`);
        
        // --- LANGKAH 3: Cuba COMPLETE Payment ---
        console.log(`[DEBUG A2U] Mencuba COMPLETE payment...`);
        const completeRes = await fetch(`${BASE_URL}/payments/${createData.identifier}/complete`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ txid: submitData.txid })
        });
        const completeData = await completeRes.json();
        
        if (!completeRes.ok) {
            console.error(`[GAGAL COMPLETE] Status: ${completeRes.status}, Body:`, JSON.stringify(completeData));
            return res.status(400).json({ 
                error: "COMPLETE GAGAL: " + (completeData.message || completeData.error),
                debug: completeData 
            });
        }
        
        console.log(`[DEBUG A2U] BERJAYA! Payment selesai.`);
        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("[DEBUG A2U] Ralat tidak dijangka:", error);
        return res.status(500).json({ error: error.message });
    }
}
