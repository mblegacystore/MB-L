import pkg from 'pi-backend';
const PiNetwork = pkg.default;

// ========== STORAGE (LANGKAH 3 & 5 SOP) ==========
const paymentStore = new Map();

export default async function handler(req, res) {
    console.log("\n==================== A2U 6-STEP SOP ====================");
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, amount } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;

    console.log("1. Input check - uid:", uid, "amount:", amount);
    console.log("2. Config check - API_KEY:", !!API_KEY, "SEED:", !!WALLET_SEED);

    if (!uid || !amount) {
        return res.status(400).json({ error: 'Missing uid or amount' });
    }
    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ error: 'Server config error' });
    }

    // ========== SEMAK PEMBAYARAN TERTUNDA ==========
    console.log("\n--- Checking pending payments ---");
    for (const [id, payment] of paymentStore.entries()) {
        if (payment.uid === uid && payment.status !== 'COMPLETED' && payment.status !== 'CANCELLED') {
            console.log(`Found pending: ${id} (${payment.status})`);
            
            try {
                const pi = new PiNetwork(API_KEY, WALLET_SEED);
                
                if (payment.status === 'SUBMITTED' && payment.txid) {
                    console.log(`Resuming at STEP 6: completePayment for ${id}`);
                    await pi.completePayment(id, payment.txid);
                    paymentStore.set(id, { ...payment, status: 'COMPLETED' });
                    console.log("Recovery success");
                    return res.status(200).json({ 
                        success: true, paymentId: id, txid: payment.txid, amount: parseFloat(amount), recovered: true 
                    });
                }
            } catch (e) {
                console.log("Recovery failed:", e.message);
            }
        }
    }

    // ========== 6 LANGKAH SOP RASMI ==========
    try {
        // LANGKAH 1: Initialize SDK
        console.log("\n--- STEP 1: Initialize SDK ---");
        console.log("DEBUG: typeof PiNetwork =", typeof PiNetwork);
        const pi = new PiNetwork(API_KEY, WALLET_SEED);
        console.log("✅ SDK initialized");

        // LANGKAH 2: Create Payment
        console.log("\n--- STEP 2: createPayment ---");
        const paymentId = await pi.createPayment({
            amount: parseFloat(amount),
            memo: "A2U REWARD",
            metadata: { source: "claim_reward", timestamp: Date.now() },
            uid: uid
        });
        console.log("✅ Payment created:", paymentId);

        // LANGKAH 3: Store paymentId
        console.log("\n--- STEP 3: Store paymentId ---");
        paymentStore.set(paymentId, { 
            uid, amount, status: 'CREATED', createdAt: Date.now() 
        });
        console.log("✅ Stored");

        // LANGKAH 4: Submit Payment
        console.log("\n--- STEP 4: submitPayment ---");
        const txid = await pi.submitPayment(paymentId);
        console.log("✅ Submitted, txid:", txid);

        // LANGKAH 5: Store txid
        console.log("\n--- STEP 5: Store txid ---");
        paymentStore.set(paymentId, { 
            ...paymentStore.get(paymentId), txid, status: 'SUBMITTED' 
        });
        console.log("✅ Stored");

        // LANGKAH 6: Complete Payment
        console.log("\n--- STEP 6: completePayment ---");
        await pi.completePayment(paymentId, txid);
        paymentStore.set(paymentId, { 
            ...paymentStore.get(paymentId), status: 'COMPLETED' 
        });
        console.log("✅ Completed");

        console.log("==================== A2U SUCCESS ====================\n");
        return res.status(200).json({ 
            success: true, paymentId, txid, amount: parseFloat(amount) 
        });

    } catch (error) {
        console.error("\n==================== A2U FAILED ====================");
        console.error("Message:", error.message);
        console.error("Stack:", error.stack);
        
        return res.status(500).json({ 
            error: error.message
        });
    }
}
