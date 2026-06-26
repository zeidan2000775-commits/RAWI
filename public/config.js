/* ======================================================================
 *  روي (RAWI) — إعداد Firebase العام (Public client config).
 *  هذه القيم عامة بطبيعتها وتُحمى بـ Firestore Security Rules + App Check.
 *  للإنتاج: احقن هذه القيم وقت البناء من متغيرات البيئة (لا تكشف مفاتيح الخادم هنا).
 *  إن بقيت apiKey فارغة، يعمل التطبيق في "الوضع التجريبي" (Demo) ببيانات محلية.
 * ==================================================================== */
window.RAWI_CONFIG = {
  firebase: {
    apiKey: "AIzaSyBkAPUjaAvhmTCwQN5U0HeV6bWSKv1DqvY",
    authDomain: "rawi-bc58f.firebaseapp.com",
    projectId: "rawi-bc58f",
    storageBucket: "rawi-bc58f.firebasestorage.app",
    messagingSenderId: "563628996043",
    appId: "1:563628996043:web:76977c02750b092ee5b24"
  },
  appCheckSiteKey: "", // reCAPTCHA v3 site key (اتركه فارغًا إن لم يُفعّل بعد)
  // اضبط على true لإجبار الوضع التجريبي حتى مع وجود إعداد Firebase
  forceDemo: false,
  version: "1.0.0"
};
