// refund.js – Pulangkan wang
export default async function handler(req, res) {
    const { paymentId, amount, wallet_address } = req.body || {};
    if (!paymentId || !wallet_address || !amount) return res.status(400).json({ error: "Data tak lengkap" });

    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.PI_WALLET_PRIVATE_SEED;
    const BASE = "https://api.minepi.com/v2";

    try {
        const paymentRes = await fetch(`${BASE}/payments`, {
            method: "POST",
            headers: {
                Authorization: `Key ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                amount: amount,
                memo: "Refund",
                metadata: { paymentId },
                uid: wallet_address
            })
        });
        const paymentData = await paymentRes.json();

        await fetch(`${BASE}/payments/${paymentData.identifier}/approve`, {
            method: "POST",
            headers: { Authorization: `Key ${API_KEY}` }
        });

        const submitRes = await fetch(`${BASE}/payments/${paymentData.identifier}/submit`, {
            method: "POST",
            headers: {
                Authorization: `Key ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ seed: WALLET_SEED })
        });
        const submitData = await submitRes.json();

        await fetch(`${BASE}/payments/${paymentData.identifier}/complete`, {
            method: "POST",
            headers: {
                Authorization: `Key ${API_KEY}`,
                "Content-Type
