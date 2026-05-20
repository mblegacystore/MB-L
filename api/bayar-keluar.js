import PiNetwork from 'pi-backend';

export default async function handler(req, res) {
    console.log("================== START A2U (SDK) ==================");
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, amount } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;

    console.log("API_KEY exists:", !!API_KEY);
    console.log("WALLET_SEED exists:", !!WALLET_SEED);
    console.log("uid:", uid);
    console.log("amount:", amount);

    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ error: 'Server config error' });
    }

    try {
        // ========== LANGKAH 1: Inisialisasi SDK (SOP Rasmi) ==========
        const pi = new PiNetwork(API_KEY, WALLET_SEED);
        console.log("✅ SDK initialized");

        // ========== LANGKAH 2: Cipta Pembayaran A2U ==========
        const paymentData = {
            amount: parseFloat(amount),
            memo: "A2U REWARD",
            metadata: { source: "claim_reward", timestamp: Date.now() },
            uid: uid
        };
        
        console.log("Creating payment with data:", paymentData);
        const paymentId = await pi.createPayment(paymentData);
        console.log("✅ Payment created, ID:", paymentId);

        // ========== LANGKAH 3: Hantar ke Blockchain ==========
        console.log("Submitting payment to blockchain...");
        const txid = await pi.submitPayment(paymentId);
        console.log("✅ Payment submitted, txid:", txid);

        // ========== LANGKAH 4: Lengkapkan Pembayaran ==========
        console.log("Completing payment...");
        const completedPayment = await pi.completePayment(paymentId, txid);
        console.log("✅ Payment completed");

        return res.status(200).json({
            success: true,
            paymentId,
            txid,
            amount: parseFloat(amount)
        });

    } catch (error) {
        console.error("❌ A2U Failed:", error.message);
        console.error("Full error:", error);
        return res.status(500).json({
            error: error.message || 'A2U payment failed'
        });
    }
}
