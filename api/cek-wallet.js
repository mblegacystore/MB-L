// api/cek-wallet.js - Debug untuk semak wallet & A2U eligibility
export default async function handler(req, res) {
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    
    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ 
            error: "Missing env vars",
            hasApiKey: !!API_KEY,
            hasWalletSeed: !!WALLET_SEED
        });
    }
    
    const BASE_URL = "https://api.minepi.com/v2";
    
    try {
        // 1. Semak baki wallet (guna public address dari seed)
        // Untuk dapatkan public address, kita perlu hantar request ke /v2/accounts
        const accountsRes = await fetch(`${BASE_URL}/accounts`, {
            headers: { "Authorization": `Key ${API_KEY}` }
        });
        
        const accountsData = await accountsRes.json();
        
        // 2. Cuba create payment dummy (amount 0.001, untuk test sahaja)
        const testPaymentRes = await fetch(`${BASE_URL}/payments`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                amount: 0.001,
                memo: "Test - check wallet eligibility",
                uid: "test_uid_dummy"
            })
        });
        
        const testPaymentData = await testPaymentRes.json();
        
        return res.status(200).json({
            wallet: {
                seed_exists: true,
                wallet_info: accountsData,
                payment_test: {
                    status: testPaymentRes.status,
                    error: testPaymentData.error,
                    message: testPaymentData.message,
                    fullResponse: testPaymentData
                }
            }
        });
        
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
