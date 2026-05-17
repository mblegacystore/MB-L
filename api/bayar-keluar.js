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
    
    // ============================================================
    // 1. HANDLE EXPIRED/PENDING (CUCI) - KEKAL ASAL 100%
    // ============================================================
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
    
    // ============================================================
    // 2. HANDLE COMPLETE (U2A) - KEKAL ASAL 100%
    // ============================================================
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
    
    // ============================================================
    // 3. A2U: CREATE, SUBMIT, COMPLETE (DITAMBAHBAIK)
    // ============================================================
    if (!uid || !amount) {
        return res.status(400).json({ error: "Data tak lengkap. uid dan amount diperlukan." });
    }
    
    try {
        // =====================================================
        // LANGKAH 0: TUKAR USERNAME KEPADA UID HASH
        // =====================================================
        let targetUid = uid;
        
        if (uid.length < 30) {
            console.log(`[A2U] Mengesan username: "${uid}", mencari UID hash...`);
            
            try {
                const userRes = await fetch(`${BASE_URL}/users?username=${uid}`, {
                    headers: { "Authorization": `Key ${API_KEY}` }
                });
                
                if (userRes.ok) {
                    const userData = await userRes.json();
                    if (userData.uid) {
                        targetUid = userData.uid;
                        console.log(`[A2U] UID hash ditemui: ${targetUid.substring(0, 10)}...`);
                    }
                }
            } catch (e) {
                console.log(`[A2U] Gagal cari UID hash: ${e.message}`);
            }
        }
        
        // =====================================================
        // PRA-CLEANUP: Cari & bersihkan pembayaran A2U lama
        // =====================================================
        try {
            const searchRes = await fetch(
                `${BASE_URL}/payments?uid=${targetUid}&direction=app_to_user`, {
                    headers: { "Authorization": `Key ${API_KEY}` }
                }
            );
            
            if (searchRes.ok) {
                const searchData = await searchRes.json();
                const payments = searchData.payments || [];
                
                for (let p of payments) {
                    if (p.status?.developer_completed || p.status?.cancelled) continue;
                    
                    console.log(`[A2U Cleanup] Membersihkan: ${p.identifier}`);
                    
                    try {
                        if (p.transaction?.txid) {
                            await fetch(`${BASE_URL}/payments/${p.identifier}/complete`, {
                                method: "POST",
                                headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
                                body: JSON.stringify({ txid: p.transaction.txid })
                            });
                            continue;
                        }
                        
                        const subRes = await fetch(`${BASE_URL}/payments/${p.identifier}/submit`, {
                            method: "POST",
                            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
                            body: JSON.stringify({ seed: WALLET_SEED })
                        });
                        
                        if (subRes.ok) {
                            const subData = await subRes.json();
                            if (subData.txid) {
                                await fetch(`${BASE_URL}/payments/${p.identifier}/complete`, {
                                    method: "POST",
                                    headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
                                    body: JSON.stringify({ txid: subData.txid })
                                });
                                continue;
                            }
                        }
                        
                        await fetch(`${BASE_URL}/payments/${p.identifier}/cancel`, {
                            method: "POST",
                            headers: { "Authorization": `Key ${API_KEY}` }
                        });
                    } catch (e) {
                        console.log(`[A2U Cleanup] Gagal: ${e.message}`);
                    }
                }
            }
        } catch (e) {
            console.log(`[A2U Cleanup] Ralat carian: ${e.message}`);
        }
        
        // =====================================================
        // STEP 1: CREATE PAYMENT
        // =====================================================
        console.log(`[A2U] CREATE payment untuk UID: ${targetUid.substring(0, 10)}...`);
        
        const createRes = await fetch(`${BASE_URL}/payments`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ 
                amount: parseFloat(amount), 
                memo: memo || "A2U Reward", 
                uid: targetUid 
            })
        });
        
        const createData = await createRes.json();
        
        if (!createRes.ok) {
            console.error(`[A2U CREATE GAGAL]`, JSON.stringify(createData));
            
            if (createData.identifier) {
                await fetch(`${BASE_URL}/payments/${createData.identifier}/cancel`, {
                    method: "POST",
                    headers: { "Authorization": `Key ${API_KEY}` }
                });
            }
            return res.status(400).json({ 
                error: createData.message || createData.error || "Gagal cipta payment" 
            });
        }
        
        const newPaymentId = createData.identifier;
        console.log(`[A2U] Payment dicipta: ${newPaymentId}`);
        
        // =====================================================
        // STEP 2: SUBMIT PAYMENT
        // =====================================================
        const submitRes = await fetch(`${BASE_URL}/payments/${newPaymentId}/submit`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ seed: WALLET_SEED })
        });
        
        const submitData = await submitRes.json();
        if (!submitRes.ok) {
            console.error(`[A2U SUBMIT GAGAL]`, JSON.stringify(submitData));
            return res.status(400).json({ 
                error: submitData.message || submitData.error || "Gagal submit payment" 
            });
        }
        
        const newTxid = submitData.txid;
        console.log(`[A2U] Submitted: ${newTxid}`);
        
        // =====================================================
        // STEP 3: COMPLETE PAYMENT
        // =====================================================
        const completeRes = await fetch(`${BASE_URL}/payments/${newPaymentId}/complete`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ txid: newTxid })
        });
        
        if (!completeRes.ok) {
            const completeData = await completeRes.json();
            console.error(`[A2U COMPLETE GAGAL]`, JSON.stringify(completeData));
            return res.status(400).json({ 
                error: completeData.message || completeData.error || "Gagal complete payment" 
            });
        }
        
        console.log(`[A2U] BERJAYA! Payment: ${newPaymentId}`);
        return res.status(200).json({ 
            success: true, 
            paymentId: newPaymentId, 
            txid: newTxid 
        });
        
    } catch (error) {
        console.error("[A2U] Ralat tidak dijangka:", error);
        return res.status(500).json({ error: error.message });
    }
                    }
