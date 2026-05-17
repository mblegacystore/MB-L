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
    const BASE_URL = "https://api.minepi.com/v2";

    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ error: "API Key atau Wallet Seed tiada" });
    }

    // ===== PRA-PEMBERSIHAN: Selesaikan sebarang pembayaran tergantung dahulu =====
    try {
        const incompleteRes = await fetch(
            `${BASE_URL}/payments/incomplete?direction=app_to_user`,
            { headers: { "Authorization": `Key ${API_KEY}` } }
        );
        if (incompleteRes.ok) {
            const incompleteData = await incompleteRes.json();
            const pendingPayments = incompleteData.payments || [];
            for (const p of pendingPayments) {
                // Cuba submit + complete untuk setiap satu
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
                    // Jika submit gagal (mungkin sudah submit sebelumnya), cuba cancel
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
    // ===== TAMAT PRA-PEMBERSIHAN =====

    try {
        // Langkah 1: Cipta
        const createRes = await fetch(`${BASE_URL}/payments`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                amount: parseFloat(amount),
                memo: memo || "A2U Reward",
                recipient: uid,
                metadata: { source: "claim_reward" }
            })
        });
        const createData = await createRes.json();
        if (!createRes.ok) {
            return res.status(400).json({ success: false, error: createData.message || "Gagal cipta" });
        }
        const paymentId = createData.identifier;

        // Langkah 2: Submit
        const submitRes = await fetch(`${BASE_URL}/payments/${paymentId}/submit`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ seed: WALLET_SEED })
        });
        const submitData = await submitRes.json();
        if (!submitRes.ok || !submitData.txid) {
            // Gagal submit → batalkan pembayaran ini
            await fetch(`${BASE_URL}/payments/${paymentId}/cancel`, {
                method: "POST",
                headers: { "Authorization": `Key ${API_KEY}` }
            });
            return res.status(400).json({ success: false, error: submitData.message || "Gagal submit" });
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
            // Complete gagal tapi txid sudah ada → pembayaran tetap dihantar
            return res.status(200).json({
                success: true,
                message: `0.1 Pi dihantar (complete tertunda, akan diselesaikan automatik)`,
                paymentId,
                txid,
                warning: "complete_pending"
            });
        }

        return res.status(200).json({
            success: true,
            message: `0.1 Pi berjaya dihantar ke ${uid}`,
            paymentId,
            txid
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
