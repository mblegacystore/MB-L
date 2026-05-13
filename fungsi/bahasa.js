const LANG = {
    ms: {
        subtitle: "Pi Anda, Legasi Anda.",
        trust: "DILINDUNGI OLEH PI NETWORK",
        sentinel: "DOSSIER PI SENTINEL",
        sentinelDesc: "Panduan perisikan pasaran strategik PERCUMA untuk Pioneer moden.",
        echelon: "PEK TAKLIMAT ECHELON",
        echelonDesc: "Modul pendidikan lanjutan mengenai Pi, AI, RWA, dan perubahan global.",
        command: "SUIT PUSAT KAWALAN",
        commandDesc: "Set alat profesional untuk membina jenama global.",
        payout: "TUNTUT TESTNET PI (A2U)",
        payoutDesc: "Sahkan sistem pembayaran kami. Terima 0.1 Testnet Pi terus ke dompet anda.",
        status: "Bilik Kebal Selamat. Sistem Sedia.",
        login: "SAMBUNG AKAUN",
        pay1: "BAYAR 1.0 PI",
        pay5: "BAYAR 5 PI",
        security: "NOTIS KESELAMATAN: MB Legacy Store TIDAK AKAN PERNAH meminta frasa laluan dompet anda.",
        footer: "© 2026 MB Legacy Store. Hak Cipta Terpelihara."
    },
    en: {
        subtitle: "Your Pi, Your Legacy.",
        trust: "PROTECTED BY PI NETWORK",
        sentinel: "THE PI SENTINEL DOSSIER",
        sentinelDesc: "A FREE strategic market intelligence primer for the modern Pioneer.",
        echelon: "THE ECHELON BRIEFING PACK",
        echelonDesc: "An advanced education module on Pi, AI, RWA, and global shifts.",
        command: "THE COMMAND CENTER SUITE",
        commandDesc: "A professional toolset for building a global brand.",
        payout: "CLAIM TESTNET PI (A2U)",
        payoutDesc: "Verify our payout system. Receive 0.1 Testnet Pi directly to your wallet.",
        status: "Vault Secured. System Ready.",
        login: "CONNECT ACCOUNT",
        pay1: "PAY 1.0 PI",
        pay5: "PAY 5 PI",
        security: "SECURITY NOTICE: MB Legacy Store will NEVER ask for your wallet passphrase.",
        footer: "© 2026 MB Legacy Store. All Rights Reserved."
    },
    id: {
        subtitle: "Pi Anda, Warisan Anda.",
        trust: "DILINDUNGI OLEH PI NETWORK",
        sentinel: "DOSSIER PI SENTINEL",
        sentinelDesc: "Panduan intelijen pasar strategis GRATIS untuk Pioneer modern.",
        echelon: "PAKET PENGARAHAN ECHELON",
        echelonDesc: "Modul pendidikan lanjutan tentang Pi, AI, RWA, dan perubahan global.",
        command: "SUITE PUSAT KOMANDO",
        commandDesc: "Perangkat profesional untuk membangun merek global.",
        payout: "KLAIM TESTNET PI (A2U)",
        payoutDesc: "Verifikasi sistem pembayaran kami. Terima 0.1 Testnet Pi langsung ke dompet Anda.",
        status: "Kubah Aman. Sistem Siap.",
        login: "HUBUNGKAN AKUN",
        pay1: "BAYAR 1.0 PI",
        pay5: "BAYAR 5 PI",
        security: "PEMBERITAHUAN KEAMANAN: MB Legacy Store TIDAK AKAN PERNAH meminta frasa sandi dompet Anda.",
        footer: "© 2026 MB Legacy Store. Seluruh hak cipta."
    },
    zh: {
        subtitle: "您的Pi，您的遗产。",
        trust: "由PI网络保护",
        sentinel: "PI哨兵档案",
        sentinelDesc: "现代先锋的免费战略市场情报入门。",
        echelon: "梯队简报包",
        echelonDesc: "关于Pi、AI、RWA和全球变革的高级教育模块。",
        command: "指挥中心套件",
        commandDesc: "构建全球品牌的专业工具集。",
        payout: "领取测试网PI (A2U)",
        payoutDesc: "验证我们的支付系统。直接接收0.1测试网Pi到您的钱包。",
        status: "金库安全。系统就绪。",
        login: "连接账户",
        pay1: "支付 1.0 PI",
        pay5: "支付 5 PI",
        security: "安全通知：MB Legacy Store绝不会要求您提供钱包密码。",
        footer: "© 2026 MB Legacy Store。版权所有。"
    },
    ar: {
        subtitle: "باي، إرثك.",
        trust: "محمي بواسطة شبكة باي",
        sentinel: "ملف باي الحارس",
        sentinelDesc: "دليل استخبارات سوق استراتيجي مجاني للرائد العصري.",
        echelon: "حزمة إحاطة إيشيلون",
        echelonDesc: "وحدة تعليمية متقدمة حول باي والذكاء الاصطناعي والأصول الحقيقية والتحولات العالمية.",
        command: "مجموعة مركز القيادة",
        commandDesc: "مجموعة أدوات احترافية لبناء علامة تجارية عالمية.",
        payout: "مطالبة باي الاختبار (A2U)",
        payoutDesc: "تحقق من نظام الدفع لدينا. استلم 0.1 باي اختبار مباشرة إلى محفظتك.",
        status: "الخزنة آمنة. النظام جاهز.",
        login: "ربط الحساب",
        pay1: "ادفع 1.0 باي",
        pay5: "ادفع 5 باي",
        security: "إشعار أمان: لن يطلب منك متجر إم بي ليجاسي أبداً عبارة مرور محفظتك.",
        footer: "© 2026 متجر إم بي ليجاسي. جميع الحقوق محفوظة."
    }
};

let currentLang = 'en';

function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
}

function switchLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('mb-legacy-lang', lang);
    var t = LANG[lang] || LANG.en;

    setText('subtitle', t.subtitle);
    setText('trust-text', t.trust);
    setText('title-sentinel', t.sentinel);
    setText('desc-sentinel', t.sentinelDesc);
    setText('title-echelon', t.echelon);
    setText('desc-echelon', t.echelonDesc);
    setText('title-command', t.command);
    setText('desc-command', t.commandDesc);
    setText('title-payout', t.payout);
    setText('desc-payout', t.payoutDesc);
    setText('stSticky', t.status);
    setText('btn-login', t.login);
    setText('btn-pay1', t.pay1);
    setText('btn-pay10', t.pay5);
    setText('security-text', t.security);
    setText('footer-text', t.footer);

    var buttons = document.querySelectorAll('.lang-selector button');
    buttons.forEach(function(b) { b.classList.remove('active'); });
    var activeBtn = document.getElementById('lang-' + lang);
    if (activeBtn) activeBtn.classList.add('active');
}

document.addEventListener('DOMContentLoaded', function() {
    var savedLang = localStorage.getItem('mb-legacy-lang');
    if (savedLang && LANG[savedLang]) {
        switchLanguage(savedLang);
    }
});
