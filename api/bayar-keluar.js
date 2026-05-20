import pkg from 'pi-backend';
console.log("DEBUG pi-backend import:", Object.keys(pkg));

// Storage ringkas (GANTI DENGAN DATABASE SEBENAR untuk produksi)
const paymentStore = new Map();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, amount } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;

    if (!uid || !amount) {
        return res.status(400).json({ error: 'Missing uid or amount' });
    }
    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ error: 'Server config error' });
    }

    // 🔒 LANGKAH KESELAMATAN: Semak pembayaran "pending" sedia ada untuk pengguna ini
    for (const [id, payment] of paymentStore.entries()) {
        if (payment.uid === uid && payment.status !== 'COMPLETED' && payment.status !== 'CANCELLED') {
            console.log(`⚠️ Pembayaran belum selesai ditemui: ${id}. Menyambung semula...`);
            
            // Jika ada, kita sambung semula, bukan cipta baru
            try {
                const pi = new PiNetwork(API_KEY, WALLET_SEED);
                
                if (payment.status === 'CREATED' && !payment.txid) {
                    // Langkah 4: Submit ke blockchain
                    const txid = await pi.submitPayment(id);
                    paymentStore.set(id, { ...payment, txid, status: 'SUBMITTED' });
                    
                    // Langkah 6: Complete
                    await pi.completePayment(id, txid);
                    paymentStore.set(id, { ...paymentStore.get(id), status: 'COMPLETED' });
                    
                    return res.status(200).json({ success: true, paymentId: id, txid, recovered: true });
                }
                
                if (payment.status === 'SUBMITTED' && payment.txid) {
                    // Langkah 6 sahaja: Complete
                    await pi.completePayment(id, payment.txid);
                    paymentStore.set(id, { ...payment, status: 'COMPLETED' });
                    
                    return res.status(200).json({ success: true, paymentId: id, txid: payment.txid, recovered: true });
                }
            } catch (error) {
                console.error("Pemulihan gagal:", error.message);
                // Jangan return error, teruskan untuk cipta pembayaran baru sebagai fallback
            }
        }
    }

    // Jika tiada pembayaran tertunda, mulakan aliran baru
    try {
        const pi = new PiNetwork(API_KEY, WALLET_SEED);

        // Langkah 1 & 2: Init dan Create Payment
        const paymentId = await pi.createPayment({
            amount: parseFloat(amount),
            memo: "A2U REWARD",
            metadata: { source: "claim_reward", timestamp: Date.now() },
            uid: uid
        });

        // 🔒 LANGKAH 3: SIMPAN PAYMENT ID (KRITIKAL)
        paymentStore.set(paymentId, { 
            uid, 
            amount, 
            status: 'CREATED', 
            createdAt: Date.now() 
        });

        // Langkah 4: Submit ke Blockchain
        const txid = await pi.submitPayment(paymentId);
        
        // 🔒 LANGKAH 5: SIMPAN TXID (KRITIKAL)
        paymentStore.set(paymentId, { 
            ...paymentStore.get(paymentId), 
            txid, 
            status: 'SUBMITTED' 
        });

        // Langkah 6: Complete Payment
        await pi.completePayment(paymentId, txid);
        paymentStore.set(paymentId, { 
            ...paymentStore.get(paymentId), 
            status: 'COMPLETED' 
        });

        return res.status(200).json({ success: true, paymentId, txid, amount: parseFloat(amount) });

    } catch (error) {
        console.error("A2U Failed:", error.message);
        return res.status(500).json({ error: error.message || 'A2U payment failed' });
    }
}
