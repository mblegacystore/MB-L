// ========== PEMBERSIHAN AWAL ==========
async function onIncompletePaymentFound(payment) {
    console.log('DEBUG - onIncompletePaymentFound:', payment.identifier);
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
        console.log('DEBUG - onIncompletePaymentFound error:', e.message);
        pendingIncompleteCount--;
        updateStatus("Dibersihkan");
        tryEnablePaymentButtons();
        return { status: "CANCELLED" };
    }
}

async function bersihkanSebelumBayar() {
    console.log('DEBUG - bersihkanSebelumBayar dipanggil');
    try {
        const payments = await Pi.getIncompletePayments();
        console.log('DEBUG - incomplete payments:', payments ? payments.length : 0);
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
    } catch (e) {
        console.log('DEBUG - bersihkanSebelumBayar error:', e.message);
    }
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
    console.log('DEBUG - requestPayout dipanggil');
    updateStatus("Authenticate...");
    
    try {
        console.log('DEBUG - memanggil Pi.authenticate');
        const scopes = ["username", "payments", "wallet_address"];
        const auth = await Pi.authenticate(scopes, onIncompletePaymentFound);
        
        console.log('DEBUG - auth berjaya, uid:', auth.user.uid);
        console.log('DEBUG - accessToken ada:', !!auth.accessToken);
        
        const userId = auth.user.uid;
        const accessToken = auth.accessToken;
        
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
        
        await bersihkanSebelumBayar();
        updateStatus("Memproses ganjaran...");
        
        console.log('DEBUG - menghantar fetch ke /api/bayar-keluar.js');
        console.log('DEBUG - body:', JSON.stringify({ uid: userId, amount: 0.1, hasToken: !!accessToken }));
        
        const response = await fetch("/api/bayar-keluar.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                uid: userId,
                accessToken: accessToken,
                amount: 0.1,
                memo: "A2U Reward - MB Legacy Store"
            })
        });
        
        console.log('DEBUG - response status:', response.status);
        
        const result = await response.json();
        console.log('DEBUG - result:', JSON.stringify(result));
        
        if (result.success) {
            updateStatus("0.1 Pi dihantar!");
            if (typeof showSuccessPopup === 'function') {
                showSuccessPopup("✅ REWARD RECEIVED!", "TXID: " + (result.txid || "N/A"), "OK");
            }
        } else {
            console.log('DEBUG - gagal:', result.error);
            updateStatus("Gagal: " + (result.error || "Sila cuba lagi."));
        }
        
    } catch (error) {
        console.log('DEBUG - error:', error.message);
        updateStatus("Error: " + error.message);
        document.getElementById("btn-login").style.display = "block";
    }
}
