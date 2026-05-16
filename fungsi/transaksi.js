// ========== POPUP PENGESAHAN SEBELUM BELI ==========
window.confirmAndBuy = function(key, amount) {
    var productName = (key === 'echelon') ? 'THE ECHELON BRIEFING PACK' : 'THE COMMAND CENTER SUITE';
    var message = "Are you sure you want to purchase " + productName + " for " + amount + " Pi?\n\nThis is a Testnet transaction. No real Pi will be deducted.";
    
    if (confirm(message)) {
        buyProduct(key, amount);
    }
};

// ========== PEMBERSIHAN AWAL ==========
async function onIncompletePaymentFound(payment) {
    ...
}// ========== PEMBERSIHAN AWAL ==========
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

// ========== BELI PRODUK ==========
async function buyProduct(key, amount) {
    if (!currentUser) { updateStatus("Sila login dahulu."); return; }
    
    // 🔥 SEMAK: Jika sudah beli, terus papar kandungan
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
                    
                    // 🔥 SIMPAN STATUS PEMBELIAN KE localStorage
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
                    await fetch("/api/cuci.js", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId: id, txid: txid }) });
                    updateStatus("Pulih!");
                });
            },
            onCancel: function() { updateStatus("Dibatalkan"); },
            onError: function(e) { updateStatus("Ralat: " + e.message); }
        }
    );
}

// ========== CLAIM A2U ==========
async function requestPayout() {
    if (!currentUser) { updateStatus("Sila login dahulu."); return; }
    await bersihkanSebelumBayar();
    updateStatus("Mencipta A2U...");
    Pi.createPayment(
        { uid: currentUser.uid, amount: 0.1, memo: "Payout", metadata: { type: "payout" } },
        {
            onIncompletePaymentFound: onIncompletePaymentFound,
            onReadyForServerApproval: function(id) {
                fetch("/api/bayar-keluar.js", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId: id, action: "approve" }) });
            },
            onReadyForServerCompletion: function(id, txid) {
                fetch("/api/bayar-keluar.js", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId: id, txid: txid, action: "complete" }) })
                .then(function() { 
                    updateStatus("0.1 Pi dihantar!");
                    
                    // ✅ POPUP SUCCESS A2U
                    if (typeof showSuccessPopup === 'function') {
                        showSuccessPopup(
                            "✅ REWARD RECEIVED!",
                            "0.1 Test-Pi has been sent to your wallet.",
                            "OK"
                        );
                    } else {
                        alert("0.1 Test-Pi has been sent to your wallet.");
                    }
                })
                .catch(async function() {
                    await fetch("/api/cuci.js", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId: id, txid: txid }) });
                    updateStatus("Pulih!");
                });
            },
            onCancel: function() { updateStatus("Dibatalkan"); },
            onError: function(e) { updateStatus("Ralat: " + e.message); }
        }
    );
}
