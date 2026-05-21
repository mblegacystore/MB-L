import pkg from 'pi-backend';
const PiNetwork = pkg?.default || pkg?.PiNetwork || pkg;

// Debug: Pastikan ia constructor
if (typeof PiNetwork !== 'function') {
    throw new Error(`PiNetwork is not a function. Type: ${typeof PiNetwork}, Value: ${JSON.stringify(PiNetwork)}`);
}

// ========== STORAGE (LANGKAH 3 & 5 SOP) ==========
const paymentStore = new Map();

// ========== STORAGE PENCEGAHAN TUNTUTAN BERULANG ==========
// Dalam produksi: GANTI DENGAN PANGKALAN DATA SEBENAR
const claimStore = new Map();
const CLAIM_COOLDOWN_MS = 5 * 60 * 1000; // 5 minit

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

    // ========== PENCEGAHAN TUNTUTAN BERULANG (ANTI-DRAIN) ==========
    const lastClaim = claimStore.get(uid);
    
    // Auto-padam rekod yang sudah tamat tempoh
    if (lastClaim && (Date.now() - lastClaim.timestamp) >= CLAIM_COOLDOWN_MS) {
        claimStore.delete(uid);
        console.log(`🔓 Claim record expired & deleted for ${uid}`);
    }
    
    if (lastClaim) {
        const timeSinceLastClaim = Date.now() - lastClaim.timestamp;
        if (timeSinceLastClaim < CLAIM_COOLDOWN_MS) {
            const remainingMs = CLAIM_COOLDOWN_MS - timeSinceLastClaim;
            const remainingMinutes = Math.ceil(remainingMs / 60000);
            console.log(`❌ Claim blocked for ${uid}. Cooldown: ${remainingMinutes} min remaining`);
            return res.status(429).json({ 
                error: `Anda sudah menuntut. Sila tunggu ${remainingMinutes} minit lagi.`,
                retryAfter: remainingMs
            });
        }
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
                    
                    claimStore.set(uid, {
                        timestamp: Date.now(),
                        paymentId: id,
                        txid: payment.txid,
                        amount: parseFloat(amount)
                    });
                    
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
        console.log("\n--- STEP 1: Initialize SDK ---");
        const pi = new PiNetwork(API_KEY, WALLET_SEED);
        console.log("✅ SDK initialized");

        console.log("\n--- STEP 2: createPayment ---");
        const paymentId = await pi.createPayment({
            amount: parseFloat(amount),
            memo: "A2U REWARD",
            metadata: { source: "claim_reward", timestamp: Date.now() },
            uid: uid
        });
        console.log("✅ Payment created:", paymentId);

        console.log("\n--- STEP 3: Store paymentId ---");
        paymentStore.set(paymentId, { uid, amount, status: 'CREATED', createdAt: Date.now() });
        console.log("✅ Stored");

        console.log("\n--- STEP 4: submitPayment ---");
        const txid = await pi.submitPayment(paymentId);
        console.log("✅ Submitted, txid:", txid);

        console.log("\n--- STEP 5: Store txid ---");
        paymentStore.set(paymentId, { ...paymentStore.get(paymentId), txid, status: 'SUBMITTED' });
        console.log("✅ Stored");

        console.log("\n--- STEP 6: completePayment ---");
        await pi.completePayment(paymentId, txid);
        paymentStore.set(paymentId, { ...paymentStore.get(paymentId), status: 'COMPLETED' });
        console.log("✅ Completed");

        claimStore.set(uid, {
            timestamp: Date.now(),
            paymentId: paymentId,
            txid: txid,
            amount: parseFloat(amount)
        });
        console.log(`✅ Claim recorded for ${uid}`);

        console.log("==================== A2U SUCCESS ====================\n");
        return res.status(200).json({ success: true, paymentId, txid, amount: parseFloat(amount) });

    } catch (error) {
        console.error("\n==================== A2U FAILED ====================");
        console.error("Message:", error.message);
        console.error("Stack:", error.stack);
        
        return res.status(500).json({ error: error.message });
    }
            }
