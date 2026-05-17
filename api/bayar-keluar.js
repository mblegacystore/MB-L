// ========== 3. A2U: CREATE, SUBMIT, COMPLETE ==========
if (!uid || !amount) {
    return res.status(400).json({ error: "Data tak lengkap. uid dan amount diperlukan." });
}

try {
    // =====================================================
    // PRA-CLEANUP: Cari & bersihkan pembayaran A2U lama
    // untuk uid ini yang mungkin blocking
    // =====================================================
    try {
        console.log(`[A2U Pra-Cleanup] Mencari payment lama untuk uid: ${uid}`);
        
        // Cari SEMUA payment untuk uid ini (tak kira status)
        const searchRes = await fetch(
            `${BASE_URL}/payments?uid=${uid}&direction=app_to_user`, {
                headers: { "Authorization": `Key ${API_KEY}` }
            }
        );
        
        if (searchRes.ok) {
            const searchData = await searchRes.json();
            const payments = searchData.payments || [];
            
            console.log(`[A2U Pra-Cleanup] Jumpa ${payments.length} payment`);
            
            for (let p of payments) {
                // Abaikan yang dah selesai atau dibatalkan
                if (p.status?.developer_completed || p.status?.cancelled) {
                    continue;
                }
                
                console.log(`[A2U Pra-Cleanup] Membersihkan: ${p.identifier}`);
                
                try {
                    // Cuba complete dulu jika ada txid
                    if (p.transaction?.txid) {
                        await fetch(`${BASE_URL}/payments/${p.identifier}/complete`, {
                            method: "POST",
                            headers: { 
                                "Authorization": `Key ${API_KEY}`, 
                                "Content-Type": "application/json" 
                            },
                            body: JSON.stringify({ txid: p.transaction.txid })
                        });
                        console.log(`[A2U Pra-Cleanup] Completed: ${p.identifier}`);
                        continue;
                    }
                    
                    // Cuba submit + complete
                    const subRes = await fetch(`${BASE_URL}/payments/${p.identifier}/submit`, {
                        method: "POST",
                        headers: { 
                            "Authorization": `Key ${API_KEY}`, 
                            "Content-Type": "application/json" 
                        },
                        body: JSON.stringify({ seed: WALLET_SEED })
                    });
                    
                    if (subRes.ok) {
                        const subData = await subRes.json();
                        if (subData.txid) {
                            await fetch(`${BASE_URL}/payments/${p.identifier}/complete`, {
                                method: "POST",
                                headers: { 
                                    "Authorization": `Key ${API_KEY}`, 
                                    "Content-Type": "application/json" 
                                },
                                body: JSON.stringify({ txid: subData.txid })
                            });
                            console.log(`[A2U Pra-Cleanup] Submit+Complete: ${p.identifier}`);
                            continue;
                        }
                    }
                    
                    // Kalau semua gagal, cancel
                    await fetch(`${BASE_URL}/payments/${p.identifier}/cancel`, {
                        method: "POST",
                        headers: { "Authorization": `Key ${API_KEY}` }
                    });
                    console.log(`[A2U Pra-Cleanup] Cancelled: ${p.identifier}`);
                    
                } catch (e) {
                    console.error(`[A2U Pra-Cleanup] Gagal bersihkan ${p.identifier}:`, e.message);
                }
            }
        }
    } catch (cleanupError) {
        console.error("[A2U Pra-Cleanup] Ralat:", cleanupError.message);
        // Jangan stop — teruskan ke create payment baru
    }
    
    // =====================================================
    // STEP 1: CREATE PAYMENT (KOD ASAL)
    // =====================================================
    const createRes = await fetch(`${BASE_URL}/payments`, {
        method: "POST",
        headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount), memo: memo || "A2U Reward", uid })
    });
    
    const createData = await createRes.json();
    
    if (!createRes.ok) {
        console.error("[A2U Create] Gagal:", createData);
        return res.status(400).json({ 
            error: createData.message || createData.error || "Gagal cipta payment" 
        });
    }
    
    const newPaymentId = createData.identifier;
    console.log(`[A2U] Payment dicipta: ${newPaymentId}`);
    
    // STEP 2: SUBMIT PAYMENT
    const submitRes = await fetch(`${BASE_URL}/payments/${newPaymentId}/submit`, {
        method: "POST",
        headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ seed: WALLET_SEED })
    });
    
    const submitData = await submitRes.json();
    if (!submitRes.ok) {
        console.error("[A2U Submit] Gagal:", submitData);
        return res.status(400).json({ error: submitData.message || submitData.error || "Gagal submit payment" });
    }
    
    const newTxid = submitData.txid;
    console.log(`[A2U] Payment submitted: ${newTxid}`);
    
    // STEP 3: COMPLETE PAYMENT
    const completeRes = await fetch(`${BASE_URL}/payments/${newPaymentId}/complete`, {
        method: "POST",
        headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ txid: newTxid })
    });
    
    if (!completeRes.ok) {
        const completeData = await completeRes.json();
        console.error("[A2U Complete] Gagal:", completeData);
        return res.status(400).json({ error: completeData.message || completeData.error || "Gagal complete payment" });
    }
    
    console.log(`[A2U] Berjaya! Payment: ${newPaymentId}, Txid: ${newTxid}`);
    return res.status(200).json({ success: true, paymentId: newPaymentId, txid: newTxid });
    
} catch (error) {
    console.error("A2U Error:", error);
    return res.status(500).json({ error: error.message });
}
