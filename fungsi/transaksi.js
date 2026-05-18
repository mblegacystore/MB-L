// ========== PEMBERSIHAN AWAL ==========
async function onIncompletePaymentFound(payment) {
    updateStatus("Menyelesaikan pembayaran tertunda...");
    pendingIncompleteCount++;
    try {
        let res = await fetch("/api/cuci.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId: payment.identifier })
        });
        let data = await res.json();
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
        pendingIncompleteCount--;
        updateStatus("Dibersihkan");
        tryEnablePaymentButtons();
        return { status: "CANCELLED" };
    }
}

async function bersihkanSebelumBayar() {
    try {
        const payments = await Pi.getIncompletePayments();
        if (payments && payments.length > 0) {
            updateStatus("Membersihkan transaksi terdahulu...");
            for (let p of payments) {
                await fetch("/api/cuci.js", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ paymentId: p.identifier })
                });
            }
            updateStatus("Sedia untuk pembayaran baru.");
        }
    } catch (e) {}
}

// ========== BELI PRODUK (U2A) ==========
async function buyProduct(key, amount) {
    if (!currentUser) { updateStatus("Sila login dahulu."); return; }
    
    if (key === "echelon" && localStorage.getItem('mb-legacy-bought-echelon') === 'true') {
        showEchelonReport();
        return;
    }
    if (key === "command" && localStorage.getItem('mb-legacy-bought-command') === 'true') {
        showLockedContent('command');
        return;
    }
    
    await bersihkanSebelumBayar();
    let total = parseFloat(amount).toFixed(7);
    updateStatus("Membayar " + total + " Pi...");
    Pi.createPayment(
        { amount: parseFloat(total), memo: "MBL Store", metadata: { product: key } },
        {
            onIncompletePaymentFound: onIncompletePaymentFound,
            onReadyForServerApproval: function(id) {
                fetch("/api/bayar-sah.js", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ paymentId: id })
                });
            },
            onReadyForServerCompletion: function(id, txid) {
                fetch("/api/bayar-selesai.js", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ paymentId: id, txid: txid })
                }).then(function() {
                    updateStatus("Berjaya!");
                    
                    if (key === "echelon") {
                        if (!localStorage.getItem('mb-legacy-bought-echelon')) {
                            if (typeof showSuccessPopup === 'function') {
                                showSuccessPopup("✅ PURCHASE SUCCESSFUL!", "THE ECHELON BRIEFING PACK is now available.", "OK");
                            } else {
                                alert("Purchase successful!");
                            }
                        }
                        localStorage.setItem('mb-legacy-bought-echelon', 'true');
                        currentUser.boughtEchelon = true;
                        showEchelonReport();
                    }
                    if (key === "command") {
                        if (!localStorage.getItem('mb-legacy-bought-command')) {
                            if (typeof showSuccessPopup === 'function') {
                                showSuccessPopup("✅ PURCHASE SUCCESSFUL!", "THE COMMAND CENTER SUITE is now available.", "OK");
                            } else {
                                alert("Purchase successful!");
                            }
                        }
                        localStorage.setItem('mb-legacy-bought-command', 'true');
                        currentUser.boughtCommand = true;
                        showLockedContent("command");
                    }
                }).catch(async function() {
                    await fetch("/api/cuci.js", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId: id, txid: txid }) });
                    updateStatus("Pulih!");
                });
            },
            onCancel: function() { updateStatus("Dibatalkan"); },
            onError: function(e) { updateStatus("Ralat: " + e.message); }
        }
    );
}

// ========== CLAIM A2U (SDK + BEARER + TXID) ==========
async function requestPayout() {
    updateStatus("Authenticate...");
    
    try {
        // ========== Pi.authenticate dengan 2 parameter (SDK) ==========
        const scopes = ["username", "payments", "wallet_address"];
        const auth = await Pi.authenticate(scopes, onIncompletePaymentFound);
        
        const userId = auth.user.uid;
        const accessToken = auth.accessToken;  // Bearer token
        
        // Simpan ke localStorage
        const userData = {
            uid: userId,
            username: auth.user.username,
            wallet_address: auth.user.wallet_address || "",
            accessToken: accessToken,
            timestamp: Date.now()
        };
        localStorage.setItem('currentUser', JSON.stringify(userData));
        
        if (typeof currentUser !== 'undefined') {
            currentUser = userData;
        }
        document.getElementById("btn-login").style.display = "none";
        updateStatus(auth.user.username);
        // ========== TAMAT AUTHENTICATE ==========
        
        await bersihkanSebelumBayar();
        updateStatus("Memproses ganjaran...");
        
        // ========== HANTAR UID + BEARER TOKEN + AMOUNT ==========
        const response = await fetch("/api/bayar-keluar.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                uid: userId,
                accessToken: accessToken,   // Bearer
                amount: 0.1,
                memo: "A2U Reward - MB Legacy Store"
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            updateStatus("0.1 Pi dihantar!");
            if (typeof showSuccessPopup === 'function') {
                showSuccessPopup(
                    "✅ REWARD RECEIVED!",
                    "0.1 Test-Pi has been sent to your wallet.\nTXID: " + (result.txid || "N/A"),
                    "OK"
                );
            }
        } else {
            updateStatus("Gagal: " + (result.error || "Sila cuba lagi."));
        }
        
    } catch (error) {
        updateStatus("Error: " + error.message);
        document.getElementById("btn-login").style.display = "block";
    }
}
