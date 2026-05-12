async function doLogin() {
    updateStatus("Menyambung...");
    try {
        const auth = await Pi.authenticate(["username", "payments", "wallet_address"]);
        currentUser = {
            uid: auth.user.uid,
            username: auth.user.username,
            wallet_address: auth.user.wallet_address || ""
        };
        
        // Tunjuk semua data yang diterima
        updateStatus("UID: " + currentUser.uid + " | Wallet: " + (currentUser.wallet_address || "TIADA"));
        console.log("AUTH DATA:", JSON.stringify(auth));
        
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
    } catch (e) {
        updateStatus("Login gagal: " + e.message);
    }
}
