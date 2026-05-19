// ========== PEMBERSIHAN AWAL ==========
async function onIncompletePaymentFound(payment) {
    console.log("DEBUG [onIncompletePaymentFound] Payment ID:", payment.identifier);
    updateStatus("Menyelesaikan pembayaran tertunda...");
    pendingIncompleteCount++;
    try {
        let res = await fetch("/api/cuci.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId: payment.identifier })
        });
        let data = await res.json();
        console.log("DEBUG [onIncompletePaymentFound] Response:", data);
        pendingIncompleteCount--;
        if (data.success) {
            updateStatus("Selesai");
            tryEnablePaymentButtons();
            return { status: "COMPLETED" };
        }
        updateStatus("Dibersihkan");
        tryEnablePaymentButtons();
        return { status: "CANCELLED" };
    } catch (e) {
        console.error("DEBUG [onIncompletePaymentFound] Error:", e.message);
        pendingIncompleteCount--;
        updateStatus("Dibersihkan");
        tryEnablePaymentButtons();
        return { status: "CANCELLED" };
    }
}

async function bersihkanSebelumBayar() {
    console.log("DEBUG [bersihkanSebelumBayar] Started");
    try {
        const payments = await Pi.getIncompletePayments();
        console.log("DEBUG [bersihkanSebelumBayar] Incomplete payments count:", payments ? payments.length : 0);
        if (payments && payments.length > 0) {
            updateStatus("Membersihkan transaksi terdahulu...");
            for (let p of payments) {
                console.log("DEBUG [bersihkanSebelumBayar] Cleaning payment:", p.identifier);
                await fetch("/api/cuci.js", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ paymentId: p.identifier })
                });
            }
            updateStatus("Sedia untuk pembayaran baru.");
        }
    } catch (e) {
        console.error("DEBUG [bersihkanSebelumBayar] Error:", e.message);
    }
}

// ========== U2A: BELI PRODUK (STABIL – JANGAN UBAH) ==========
async function buyProduct(key, amount) {
    console.log("DEBUG [buyProduct] Called with key:", key, "amount:", amount);
    if (!currentUser) { 
        updateStatus("Sila login dahulu.");
        console.log("DEBUG [buyProduct] No currentUser");
        return; 
    }
    
    if (key === "echelon" && localStorage.getItem('mb-legacy-bought-echelon') === 'true') {
        console.log("DEBUG [buyProduct] Echelon already purchased, showing report");
        showEchelonReport();
        return;
    }
    if (key === "command" && localStorage.getItem('mb-legacy-bought-command') === 'true') {
        console.log("DEBUG [buyProduct] Command already purchased, showing content");
        showLockedContent('command');
        return;
    }
    
    let total = parseFloat(amount).toFixed(7);
    updateStatus("Membayar " + total + " Pi...");
    console.log("DEBUG [buyProduct] Creating payment for", total, "Pi");
    
    Pi.createPayment(
        { amount: parseFloat(total), memo: "MBL Store", metadata: { product: key } },
        {
            onIncompletePaymentFound: onIncompletePaymentFound,
            onReadyForServerApproval: function(id) {
                console.log("DEBUG [buyProduct] onReadyForServerApproval - paymentId:", id);
                fetch("/api/bayar-sah.js", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ paymentId: id })
                });
            },
            onReadyForServerCompletion: function(id, txid) {
                console.log("DEBUG [buyProduct] onReadyForServerCompletion - paymentId:", id, "txid:", txid);
                fetch("/api/bayar-selesai.js", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ paymentId: id, txid: txid })
                }).then(function() {
                    updateStatus("Berjaya!");
                    console.log("DEBUG [buyProduct] Payment completed successfully");
                    
                    if (key === "echelon") {
                        localStorage.setItem('mb-legacy-bought-echelon', 'true');
                        currentUser.boughtEchelon = true;
                        showEchelonReport();
                    }
                    if (key === "command") {
                        localStorage.setItem('mb-legacy-bought-command', 'true');
                        currentUser.boughtCommand = true;
                        showLockedContent("command");
                    }
                }).catch(async function() {
                    console.error("DEBUG [buyProduct] Completion failed, cleaning up");
                    await fetch("/api/cuci.js", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId: id, txid: txid }) });
                    updateStatus("Pulih!");
                });
            },
            onCancel: function() { 
                console.log("DEBUG [buyProduct] Payment cancelled");
                updateStatus("Dibatalkan"); 
            },
            onError: function(e) { 
                console.error("DEBUG [buyProduct] Payment error:", e.message);
                updateStatus("Ralat: " + e.message); 
            }
        }
    );
}

// ========== A2U: CLAIM REWARD (BETUL – TIADA Pi.createPayment) ==========
async function requestPayout() {
    console.log("DEBUG [requestPayout] Called");
    if (!currentUser) { 
        updateStatus("Sila login dahulu.");
        console.log("DEBUG [requestPayout] No currentUser");
        return; 
    }
    
    console.log("DEBUG [requestPayout] currentUser.uid (hash):", currentUser.uid);
    console.log("DEBUG [requestPayout] accessToken exists:", !!currentUser.accessToken);
    
    updateStatus("Memproses ganjaran...");
    
    try {
        const response = await fetch("/api/bayar-keluar.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                uid: currentUser.uid,
                amount: 0.1,
                accessToken: currentUser.accessToken,
                metadata: { source: "claim_reward", timestamp: Date.now() }
            })
        });
        
        const result = await response.json();
        console.log("DEBUG [requestPayout] Response:", result);
        
        if (result.success) {
            updateStatus("0.1 Pi dihantar!");
            if (typeof showSuccessPopup === 'function') {
                showSuccessPopup("✅ REWARD RECEIVED!", "0.1 Test-Pi sent to your wallet.", "OK");
            }
        } else {
            updateStatus("Gagal: " + (result.error || "Sila cuba lagi."));
        }
    } catch (error) {
        console.error("DEBUG [requestPayout] Error:", error);
        updateStatus("Rangkaian error. Sila cuba lagi.");
    }
}
