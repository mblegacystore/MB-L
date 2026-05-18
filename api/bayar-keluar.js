// TEMPORARY STORAGE (ganti dengan database untuk production)
const paymentStore = {};

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

    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap" });
    }

    const BASE_URL = "https://api.minepi.com/v2";

    try {
        // ========== PIAWAIAN: SEMAK INCOMPLETE PAYMENTS ==========
        const searchRes = await fetch(`${BASE_URL}/payments?uid=${uid}&direction=app_to_user`, {
            headers: { "Authorization": `Key ${API_KEY}` }
        });
        const searchData = await searchRes.json();
        const incompletePayments = searchData.payments || [];

        for (const p of incompletePayments) {
            if (p.status?.developer_completed || p.status?.cancelled) continue;
            
            if (p.transaction?.txid) {
                await fetch(`${BASE_URL}/payments/${p.identifier}/complete`, {
                    method: "POST",
                    headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ txid: p.transaction.txid })
                });
            } else {
                await fetch(`${BASE_URL}/payments/${p.identifier}/cancel`, {
                    method: "POST",
                    headers: { "Authorization": `Key ${API_KEY}` }
                });
            }
        }

        // ========== CREATE PAYMENT ==========
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

        // ========== PIAWAIAN: SIMPAN paymentId ==========
        paymentStore[paymentId] = {
            uid: uid,
            amount: amount,
            status: 'created',
            createdAt: Date.now()
        };

        // ========== SUBMIT PAYMENT ==========
        const submitRes = await fetch(`${BASE_URL}/payments/${paymentId}/submit`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ seed: WALLET_SEED })
        });

        const submitData = await submitRes.json();
        if (!submitRes.ok) {
            delete paymentStore[paymentId];
            return res.status(400).json({ error: submitData.error || "Gagal submit payment" });
        }

        const txid = submitData.txid;
        paymentStore[paymentId].txid = txid;
        paymentStore[paymentId].status = 'submitted';

        // ========== COMPLETE PAYMENT ==========
        const completeRes = await fetch(`${BASE_URL}/payments/${paymentId}/complete`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ txid })
        });

        if (!completeRes.ok) {
            const completeData = await completeRes.json();
            delete paymentStore[paymentId];
            return res.status(400).json({ error: completeData.error || "Gagal complete payment" });
        }

        paymentStore[paymentId].status = 'completed';

        return res.status(200).json({ success: true, paymentId, txid });

    } catch (error) {
        console.error("A2U Error:", error);
        return res.status(500).json({ error: error.message });
    }
                }
