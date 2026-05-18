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
                    
                    if (key === "echelon") {
                        if (!localStorage.getItem('mb-legacy-bought-echelon')) {
                            if (typeof showSuccessPopup === 'function') {
                                showSuccessPopup(
                                    "✅ PURCHASE SUCCESSFUL!",
                                    "THE ECHELON BRIEFING PACK is now available.\nThank you for your support.",
                                    "OK"
                                );
                            } else {
                                alert("Purchase successful! Content is now available.");
                            }
                        }
                        localStorage.setItem('mb-legacy-bought-echelon', 'true');
                        currentUser.boughtEchelon = true;
                        showEchelonReport();
                    }
                    if (key === "command") {
                        if (!localStorage.getItem('mb-legacy-bought-command')) {
                            if (typeof showSuccessPopup === 'function') {
                                showSuccessPopup(
                                    "✅ PURCHASE SUCCESSFUL!",
                                    "THE COMMAND CENTER SUITE is now available.\nThank you for your support.",
                                    "OK"
                                );
                            } else {
                                alert("Purchase successful! Content is now available.");
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

// ========== CLAIM A2U (BACA DARI LOCALSTORAGE - SELAMAT) ==========
async function requestPayout() {
    let userData = localStorage.getItem('currentUser');
    
    if (!userData) {
        updateStatus("Sila login dahulu.");
        return;
    }
    
    let user;
    try {
        user = JSON.parse(userData);
    } catch(e) {
        updateStatus("Data user rosak. Sila login semula.");
        return;
    }
    
    // ===== PENGESAHAN SESSION LEMBUT (TIDAK MENGHALANG) =====
    // Hanya beri amaran jika timestamp tiada, tetapi teruskan pembayaran
    if (!user.timestamp) {
        console.warn("Amaran: Tiada timestamp dalam sesi. Pertimbangkan untuk login semula.");
    }
    // ===== TAMAT =====
    
    const userId = user.uid;
    
    if (!userId) {
        updateStatus("ERROR: No user ID found! Please re-login.");
        return;
    }
    
    // ✅ Bersihkan payment tergendala dulu
    await bersihkanSebelumBayar();
    
    updateStatus("Memproses ganjaran...");
    
    try {
        const response = await fetch("/api/bayar-keluar.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                uid: userId, 
                amount: 0.1,
                memo: "A2U Reward - MB Legacy Store"
            })
        });
        
        const result = await response.json();
        alert("RALAT PI: " + JSON.stringify(result));
        
        if (result.success) {
            updateStatus("0.1 Pi dihantar!");
            if (typeof showSuccessPopup === 'function') {
                showSuccessPopup(
                    "✅ REWARD RECEIVED!",
                    "0.1 Test-Pi has been sent to your wallet.",
                    "OK"
                );
            }
        } else {
            // ✅ KESAN "USER NOT FOUND" & PAKSA LOGIN SEMULA
            if (result.error && (
                result.error.toLowerCase().includes("not found") ||
                result.error.toLowerCase().includes("user")
            )) {
                updateStatus("Sesi tamat. Sila login semula.");
                document.getElementById("btn-login").style.display = "block";
                localStorage.removeItem('currentUser');
            } else {
                updateStatus("Gagal: " + (result.error || "Sila cuba lagi."));
            }
        }
    } catch (error) {
        updateStatus("Rangkaian error: " + error.message);
    }
                        }
