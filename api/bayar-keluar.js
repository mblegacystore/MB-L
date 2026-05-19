const axios = require('axios');
const StellarSdk = require('stellar-sdk');

// Storage simple untuk lock user. Elak spam serentak
const lockMap = new Map();

const keypair = StellarSdk.Keypair.fromSecret(process.env.WALLET_PRIVATE_SEED);
const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

module.exports = async function handler(req, res) {
    if (req.method!== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { amount, uid, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;

    if (!amount ||!uid ||!accessToken) {
        return res.status(400).json({ error: 'amount, uid, accessToken required' });
    }

    // GUARD 1: Lock per user. Kalau user spam 10x, 9 request akan queue/tolak
    if (lockMap.get(uid)) {
        return res.status(429).json({ error: 'Transaction in progress. Please wait.' });
    }
    lockMap.set(uid, true);

    const headers = { Authorization: 'Key ' + API_KEY };
    const idempotency = metadata && metadata.idempotency? metadata.idempotency : 'payout-' + uid + '-' + Date.now();

    try {
        // GUARD 2: Validate Bearer - SOP WAJIB
        await axios.get('https://api.minepi.com/v2/me', {
            headers: { Authorization: 'Bearer ' + accessToken }
        });

        // GUARD 3: Clean semua incomplete SEBELUM create. Ni kunci bebas pending
        const searchRes = await axios.get('https://api.minepi.com/v2/payments?uid=' + uid + '&direction=app_to_user', { headers });
        const payments = searchRes.data && searchRes.data.data? searchRes.data.data : [];

        for (let i = 0; i < payments.length; i++) {
            const p = payments[i];
            // Kalau takde transaction = stuck kat approval → cancel
            // Kalau ada transaction tapi takde txid = stuck kat submit → complete
            if (!p.transaction) {
                await axios.post('https://api.minepi.com/v2/payments/' + p.identifier + '/cancel', {}, { headers }).catch(function(){});
            } else if (p.transaction &&!p.transaction.txid) {
                // Payment dah sign tapi tak complete. Kita complete kan
                await axios.post('https://api.minepi.com/v2/payments/' + p.identifier + '/complete', { txid: p.transaction.txid }, { headers }).catch(function(){});
            }
        }

        // GUARD 4: Create baru. Amount WAJIB string 7dp ikut SOP
        const amountStr = Number(amount).toFixed(7);
        const createRes = await axios.post(
            'https://api.minepi.com/v2/payments',
            {
                amount: amountStr,
                memo: 'Payout',
                uid: uid,
                metadata: {...metadata, idempotency: idempotency }
            },
            { headers: headers }
        );

        const paymentId = createRes.data.identifier;
        const xdr = createRes.data.transaction.to_sign;

        // GUARD 5: Sign Stellar - SOP WAJIB
        const tx = new StellarSdk.Transaction(xdr, StellarSdk.Networks.TESTNET);
        tx.sign(keypair);
        const submitRes = await server.submitTransaction(tx);
        const txid = submitRes.hash;

        // GUARD 6: Submit + Complete Pi - SOP WAJIB
        await axios.post('https://api.minepi.com/v2/payments/' + paymentId + '/submit', { txid: txid }, { headers: headers });
        await axios.post('https://api.minepi.com/v2/payments/' + paymentId + '/complete', { txid: txid }, { headers: headers });

        lockMap.delete(uid); // Release lock
        return res.status(200).json({ success: true, paymentId: paymentId, txid: txid });

    } catch (e) {
        lockMap.delete(uid); // Release lock walaupun error
        const errData = e.response? e.response.data : null;
        console.error('A2U_ERROR:', errData || e.message);

        // GUARD 7: Kalau error 400 pending_payment_exists, retry clean sekali lagi
        if (e.response && e.response.status === 400 && errData && errData.error === 'pending_payment_exists') {
            return res.status(409).json({ error: 'Pending payment detected. Please retry.', detail: errData });
        }

        return res.status(500).json({
            error: errData && errData.error? errData.error : e.message,
            detail: errData
        });
    }
                         }
