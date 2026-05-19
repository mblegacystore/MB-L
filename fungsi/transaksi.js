// ============================================
// A2U PAYOUT FUNCTION - IKUT SOP RASMI PI
// ============================================

// Storage untuk tracking
let pendingIncompleteCount = 0;

/**
 * Pembersihan incomplete payment
 * WAJIB return object { status: "COMPLETED" | "CANCELLED" }
 */
async function onIncompletePaymentFound(payment) {
    console.log("🧹 [onIncompletePaymentFound] Payment:", payment.identifier);
    
    pendingIncompleteCount++;
    
    try {
        const res = await fetch("/api/bayar-keluar.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "cancel",
                paymentId: payment.identifier
            })
        });
        
        const data = await res.json();
        console.log("🧹 [onIncompletePaymentFound] Result:", data);
        
        pendingIncompleteCount--;
        
        if (data.success) {
            updateStatus("Bersedia untuk pembayaran");
            tryEnablePaymentButtons();
            return { status: "CANCELLED" };
        }
        
        // Kalau gagal cancel, cuba complete jika ada txid
        if (payment.transaction?.txid) {
            const completeRes = await fetch("/api/bayar-keluar.js", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "complete",
                    paymentId: payment.identifier,
                    txid: payment.transaction.txid,
                    accessToken: currentUser?.accessToken
                })
            });
            
            if (completeRes.ok) {
                updateStatus("Bersedia");
                tryEnablePaymentButtons();
                return { status: "COMPLETED" };
            }
        }
        
        updateStatus("Dibersihkan");
        tryEnablePaymentButtons();
        return { status: "CANCELLED" };
        
    } catch (e) {
        console.error("❌ [onIncompletePaymentFound] Error:", e.message);
        pendingIncompleteCount--;
        updateStatus("Dibersihkan");
        tryEnablePaymentButtons();
        return { status: "CANCELLED" };
    }
}

/**
 * Fungsi utama A2U Payout
 * IKUT SOP RASMI PI NETWORK
 */
async function requestPayout() {
    console.log("🚀 [requestPayout] Memulakan A2U payout");
    
    // ✅ WAJIB: Semak user login
    if (!currentUser) {
        updateStatus("❌ Sila login dahulu");
        console.error("❌ [requestPayout] Tiada currentUser");
        return;
    }
    
    // ✅ WAJIB: Semak access token
    if (!currentUser.accessToken) {
        updateStatus("❌ Access token tiada. Sila login semula");
        console.error("❌ [requestPayout] Tiada accessToken");
        return;
    }
    
    console.log("👤 User UID:", currentUser.uid);
    console.log("🔑 Access Token:", currentUser.accessToken.substring(0, 10) + "...");
    
    updateStatus("⏳ Mencipta pembayaran A2U...");
    
    // ✅ WAJIB: Guna Pi.createPayment dengan SEMUA callback
    Pi.createPayment(
        {
            // Data pembayaran
            amount: 0.1,
            memo: "MB-Legacy Reward Payout",
            metadata: {
                type: "payout",
                source: "claim_reward",
                timestamp: Date.now()
            },
            // A2U memerlukan uid
            uid: currentUser.uid
        },
        {
            // ============================================
            // CALLBACK 1: onIncompletePaymentFound
            // WAJIB return { status: "COMPLETED" | "CANCELLED" }
            // ============================================
            onIncompletePaymentFound: onIncompletePaymentFound,
            
            // ============================================
            // CALLBACK 2: onReadyForServerApproval
            // WAJIB return Promise yang resolve
            // ============================================
            onReadyForServerApproval: function(paymentId) {
                console.log("✅ [onReadyForServerApproval] Payment ID:", paymentId);
                
                // ✅ WAJIB: Return Promise
                return new Promise((resolve, reject) => {
                    fetch("/api/bayar-keluar.js", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            action: "approve",
                            paymentId: paymentId,
                            accessToken: currentUser.accessToken,
                            uid: currentUser.uid
                        })
                    })
                    .then(res => res.json())
                    .then(data => {
                        console.log("✅ Approval response:", data);
                        
                        if (data.success) {
                            updateStatus("✅ Pembayaran diluluskan");
                            resolve(data);
                        } else {
                            console.error("❌ Approval gagal:", data.error);
                            updateStatus("❌ Gagal meluluskan pembayaran");
                            reject(new Error(data.error || "Approval failed"));
                        }
                    })
                    .catch(err => {
                        console.error("❌ Approval network error:", err);
                        updateStatus("❌ Ralat rangkaian semasa approval");
                        reject(err);
                    });
                });
            },
            
            // ============================================
            // CALLBACK 3: onReadyForServerCompletion
            // WAJIB return Promise yang resolve
            // ============================================
            onReadyForServerCompletion: function(paymentId, txid) {
                console.log("✅ [onReadyForServerCompletion] Payment:", paymentId, "TxID:", txid);
                
                // ✅ WAJIB: Return Promise
                return new Promise((resolve, reject) => {
                    fetch("/api/bayar-keluar.js", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            action: "complete",
                            paymentId: paymentId,
                            txid: txid,
                            accessToken: currentUser.accessToken,
                            uid: currentUser.uid
                        })
                    })
                    .then(res => res.json())
                    .then(data => {
                        console.log("✅ Completion response:", data);
                        
                        if (data.success) {
                            updateStatus("🎉 0.1 Pi berjaya dihantar!");
                            
                            // Callback optional untuk UI
                            if (typeof showSuccessPopup === 'function') {
                                showSuccessPopup(
                                    "✅ REWARD RECEIVED!",
                                    "0.1 Test-Pi telah dihantar ke wallet anda.",
                                    "OK"
                                );
                            }
                            
                            resolve(data);
                        } else {
                            console.error("❌ Completion gagal:", data.error);
                            updateStatus("❌ Gagal menyelesaikan pembayaran");
                            reject(new Error(data.error || "Completion failed"));
                        }
                    })
                    .catch(err => {
                        console.error("❌ Completion network error:", err);
                        updateStatus("❌ Ralat rangkaian semasa completion");
                        reject(err);
                    });
                });
            },
            
            // ============================================
            // CALLBACK 4: onCancel
            // ============================================
            onCancel: function(paymentId) {
                console.log("🚫 [onCancel] Payment dibatalkan:", paymentId);
                updateStatus("🚫 Pembayaran dibatalkan");
                
                // Cleanup di server
                fetch("/api/bayar-keluar.js", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "cancel",
                        paymentId: paymentId
                    })
                }).catch(e => console.error("Cleanup error:", e));
            },
            
            // ============================================
            // CALLBACK 5: onError
            // ============================================
            onError: function(error, payment) {
                console.error("❌ [onError] Payment error:", error);
                console.error("❌ Payment details:", payment);
                
                updateStatus("❌ Ralat: " + (error.message || "Unknown error"));
                
                // Kalau payment wujud, cleanup
                if (payment?.identifier) {
                    fetch("/api/bayar-keluar.js", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            action: "cancel",
                            paymentId: payment.identifier
                        })
                    }).catch(e => console.error("Cleanup error:", e));
                }
            }
        }
    );
}

// ============================================
// HELPER FUNCTIONS (sesuaikan dengan UI anda)
// ============================================
function updateStatus(message) {
    console.log("📢 Status:", message);
    
    // Update UI element jika wujud
    const statusEl = document.getElementById('payout-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.style.display = 'block';
    }
}

function tryEnablePaymentButtons() {
    // Enable balik button payout jika ada
    const payoutBtn = document.getElementById('payout-button');
    if (payoutBtn && pendingIncompleteCount <= 0) {
        payoutBtn.disabled = false;
        payoutBtn.style.opacity = '1';
    }
                          }
