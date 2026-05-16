export default async function handler(req, res) {
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    
    return res.status(200).json({
        hasApiKey: !!API_KEY,
        hasWalletSeed: !!WALLET_SEED,
        apiKeyFirst10: API_KEY ? API_KEY.substring(0, 10) + "..." : null,
        walletSeedFirst10: WALLET_SEED ? WALLET_SEED.substring(0, 10) + "..." : null
    });
}
