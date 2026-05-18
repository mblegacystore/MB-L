// ========== UJIAN MINIMAL A2U ==========
async function requestPayout() {
    // Paksa Pi.authenticate() secara langsung
    updateStatus("Authenticate...");
    
    try {
        const auth = await Pi.authenticate(["username", "payments", "wallet_address"]);
        
        const userId = auth.user.uid;
        updateStatus("UID: " + userId);
        
        // Hantar terus ke backend
        const response = await fetch("/api/bayar-keluar.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                uid: userId, 
                amount: 0.1,
                memo: "Test A2U"
            })
        });
        
        const result = await response.json();
        alert("RESPONS: " + JSON.stringify(result));
        updateStatus(result.success ? "Berjaya!" : "Gagal: " + (result.error || "?"));
        
    } catch(e) {
        alert("ERROR: " + e.message);
        updateStatus("Error: " + e.message);
    }
}
