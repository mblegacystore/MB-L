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
    
    // ✅ GUNA UID (BUKAN WALLET ATAU USERNAME)
    const userId = user.uid;
    
    if (!userId) {
        updateStatus("ERROR: No user ID found! Please re-login.");
        return;
    }
    
    await bersihkanSebelumBayar();
    updateStatus("Memproses ganjaran...");
    
    try {
        const response = await fetch("/api/bayar-keluar.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                uid: userId,   // <-- HANTAR UID KE SERVER
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
                    "0.1 Test-Pi has been sent to your wallet.",
                    "OK"
                );
            }
        } else {
            updateStatus("Gagal: " + (result.error || "Sila cuba lagi."));
        }
    } catch (error) {
        updateStatus("Rangkaian error: " + error.message);
    }
}
