export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { uid, amount } = req.body;
    
    // DEBUG SAHAJA – TIADA TRANSAKSI
    return res.status(200).json({
        debug: true,
        message: "Debug mode - No transaction created",
        received: { uid, amount },
        env: {
            hasApiKey: !!process.env.PI_API_KEY_TESTNET,
            hasWalletSeed: !!process.env.WALLET_PRIVATE_SEED
        }
    });
}
