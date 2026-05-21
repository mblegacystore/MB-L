import pkg from 'pi-backend';
const PiNetwork = pkg?.default || pkg?.PiNetwork || pkg;

if (typeof PiNetwork !== 'function') {
    throw new Error(`PiNetwork is not a function. Type: ${typeof PiNetwork}`);
}

const paymentStore = new Map();

export default async function handler(req, res) {
    console.log("\n==================== A2U START ====================");
    console.log("DEBUG 0: typeof PiNetwork =", typeof PiNetwork);
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, amount } = req.body;
    console.log("DEBUG 1: uid =", uid, "amount =", amount);
    
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    console.log("DEBUG 2: API_KEY exists =", !!API_KEY, "SEED exists =", !!WALLET_SEED);

    if (!uid || !amount) {
        return res.status(400).json({ error: 'Missing uid or amount' });
    }
    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ error: 'Server config error' });
    }

    // Semak pembayaran tertunda
    console.log("DEBUG 3: Checking pending payments...");
    for (const [id, payment] of paymentStore.entries()) {
        if (payment.uid === uid && payment.status !== 'COMPLETED' && payment.status !== 'CANCELLED') {
            console.log("DEBUG 4: Found pending:", id, payment.status);
            try {
                const pi = new PiNetwork(API_KEY, WALLET_SEED);
                if (payment.status === 'SUBMITTED' && payment.txid) {
                    await pi.completePayment(id, payment.txid);
                    paymentStore.set(id, { ...payment, status: 'COMPLETED' });
                    return res.status(200).json({ success: true, paymentId: id, txid: payment.txid, recovered: true });
                }
            } catch (e) {
                console.log("DEBUG 5: Recovery failed:", e.message);
            }
        }
    }

    try {
        console.log("DEBUG 6: Creating PiNetwork instance...");
        const pi = new PiNetwork(API_KEY, WALLET_SEED);
        console.log("DEBUG 7: PiNetwork created");
        
        console.log("DEBUG 8: Creating payment...");
        const paymentId = await pi.createPayment({
            amount: parseFloat(amount),
            memo: "A2U REWARD",
            metadata: { source: "claim_reward", timestamp: Date.now() },
            uid: uid
        });
        console.log("DEBUG 9: Payment created:", paymentId);
        
        paymentStore.set(paymentId, { uid, amount, status: 'CREATED', createdAt: Date.now() });
        
        console.log("DEBUG 10: Submitting payment...");
        const txid = await pi.submitPayment(paymentId);
        console.log("DEBUG 11: Submitted, txid:", txid);
        
        paymentStore.set(paymentId, { ...paymentStore.get(paymentId), txid, status: 'SUBMITTED' });
        
        console.log("DEBUG 12: Completing payment...");
        await pi.completePayment(paymentId, txid);
        paymentStore.set(paymentId, { ...paymentStore.get(paymentId), status: 'COMPLETED' });
        console.log("DEBUG 13: Completed!");

        return res.status(200).json({ success: true, paymentId, txid, amount: parseFloat(amount) });

    } catch (error) {
        console.error("DEBUG ERROR:", error.message);
        console.error("DEBUG STACK:", error.stack);
        return res.status(500).json({ error: error.message });
    }
}
