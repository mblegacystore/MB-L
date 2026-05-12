async function doLogin() {
    updateStatus("Menyambung...");
    try {
        const scopes = ["username", "payments"];
        const auth = await Pi.authenticate(scopes);
        currentUser = {
            uid: auth.user.uid,
            username: auth.user.username,
            wallet_address: auth.user.wallet_address || ""
        };
        if (!currentUser.wallet_address) {
            const walletRes = await fetch("/api/dapatkan-wallet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: currentUser.uid })
            });
            const walletData = await walletRes.json();
            currentUser.wallet_address = walletData.wallet_address || "";
        }
        updateStatus(currentUser.username + " | Wallet: " + (currentUser.wallet_address ? "OK" : "TIADA"));
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
    } catch (e) {
        updateStatus("Login gagal: " + e.message);
    }
}
