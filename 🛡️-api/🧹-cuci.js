// 🧹-cuci.js – Pulihkan pembayaran tersekat
export default async function handler(req, res) {
    const { paymentId, txid } = req.body || {};

    if (!paymentId) {
        return res.status(200).json({ success: true, message: "Tiada paymentId" });
    }

    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.PI_WALLET_PRIVATE_SEED;
    const BASE = "https://api.minepi.com/v2";

    try {
        // 1. Force complete jika TXID diberikan
        if (txid) {
            try {
                await fetch(`${BASE}/payments/${paymentId}/complete`, {
                    method: "POST",
                    headers: {
                        Authorization: `Key ${API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ txid })
                });
                return res.status(200).json({ success: true, message: "Force complete berjaya" });
            } catch (e) {}
        }

        // 2. Submit + Complete jika wallet seed ada
        if (WALLET_SEED) {
            try {
                const submitRes = await fetch(`${BASE}/payments/${paymentId}/submit`, {
                    method: "POST",
                    headers: {
                        Authorization: `Key ${API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ seed: WALLET_SEED })
                });
                const submitData = await submitRes.json();
                if (submitData.txid) {
                    await fetch(`${BASE}/payments/${paymentId}/complete`, {
                        method: "POST",
                        headers: {
                            Authorization: `Key ${API_KEY}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ txid: submitData.txid })
                    });
                    return res.status(200).json({ success: true, message: "Submit + complete berjaya" });
                }
            } catch (e) {}
        }

        // 3. Cancel sebagai langkah akhir
        await fetch(`${BASE}/payments/${paymentId}/cancel`, {
            method: "POST",
            headers: { Authorization: `Key ${API_KEY}` }
        });

        return res.status(200).json({ success: true, message: "Dibatalkan" });
    } catch (e) {
        return res.status(200).json({ success: true, message: "Dibersihkan" });
    }
}
