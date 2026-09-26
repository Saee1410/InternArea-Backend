import axios from "axios";
import { translate } from "google-translate-api-x";

const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || "http://127.0.0.1:5000";
const SUPPORTED_LANGUAGES = ["hi", "pt", "es", "fr", "zh"];

export const translateText = async (text, targetLanguage) => {
    if (
        !text ||
        (Array.isArray(text) && text.length === 0) ||
        !targetLanguage ||
        targetLanguage === "en" ||
        !SUPPORTED_LANGUAGES.includes(targetLanguage)
    ) {
        return text;
    }

    try {
        // 🟢 १. आधी लोकल Docker (LibreTranslate) ट्राय करा
        const response = await axios.post(
            `${LIBRETRANSLATE_URL}/translate`,
            {
                q: text,
                source: "en",
                target: targetLanguage,
                format: "text"
            },
            {
                headers: { "Content-Type": "application/json" },
                timeout: 3000 // फक्त ३ सेकंद वाट पाहा
            }
        );

        if (Array.isArray(response.data)) {
            return response.data.map((item) => item.translatedText || item);
        }
        if (response.data && response.data.translatedText) {
            return response.data.translatedText;
        }

        return text;
    } catch (dockerError) {
        // 🟡 २. जर Docker बंद असेल किंवा एरर आली, तर Google Translate वापरा
        try {
            if (Array.isArray(text)) {
                // अ‍ॅरे ट्रान्सलेट करण्यासाठी
                const res = await translate(text, { to: targetLanguage });
                return res.map((item) => item.text);
            } else {
                // सिंगल स्ट्रिंग ट्रान्सलेट करण्यासाठी
                const res = await translate(text, { to: targetLanguage });
                return res.text;
            }
        } catch (googleError) {
            console.error(`Google Translation Error [${targetLanguage}]:`, googleError.message);
            return text; // दोन्ही फेल झाले तर ओरिजिनल डेटा पाठवा
        }
    }
};



















// import axios from "axios";

// // १. आधी लोकल Docker चा प्रयत्न करा, तो नसेल तर public server वापरा
// const PRIMARY_URL = process.env.LIBRETRANSLATE_URL || "http://127.0.0.1:5000";
// const FALLBACK_URL = "https://translate.argosopentech.com"; // मोफत पब्लिक LibreTranslate इंजिन

// const SUPPORTED_LANGUAGES = ["hi", "pt", "es", "fr", "zh"];
// const CHUNK_SIZE = 5; // छोटे तुकडे केल्याने ECONNRESET येत नाही

// export const translateText = async (text, targetLanguage) => {
//     if (
//         !text ||
//         (Array.isArray(text) && text.length === 0) ||
//         !targetLanguage ||
//         targetLanguage === "en" ||
//         !SUPPORTED_LANGUAGES.includes(targetLanguage)
//     ) {
//         return text;
//     }

//     // ट्रान्सलेट करणारी अंतर्गत फंक्शन
//     const performTranslation = async (baseUrl, data) => {
//         return await axios.post(
//             `${baseUrl}/translate`,
//             {
//                 q: data,
//                 source: "en",
//                 target: targetLanguage,
//                 format: "text"
//             },
//             {
//                 headers: { "Content-Type": "application/json" },
//                 timeout: 15000
//             }
//         );
//     };

//     try {
//         // अ‍ॅरे असल्यास Chunks मध्ये ट्रान्सलेट करा
//         if (Array.isArray(text)) {
//             const results = [];
//             for (let i = 0; i < text.length; i += CHUNK_SIZE) {
//                 const chunk = text.slice(i, i + CHUNK_SIZE);
//                 try {
//                     // आधी Local Docker ट्राय करा
//                     const res = await performTranslation(PRIMARY_URL, chunk);
//                     if (Array.isArray(res.data)) {
//                         results.push(...res.data.map(item => item.translatedText || item));
//                     } else {
//                         results.push(...chunk);
//                     }
//                 } catch (err) {
//                     // Local फेल झाल्यास Fallback Public API वरून ट्रान्सलेट करा
//                     const res = await performTranslation(FALLBACK_URL, chunk);
//                     if (Array.isArray(res.data)) {
//                         results.push(...res.data.map(item => item.translatedText || item));
//                     } else {
//                         results.push(...chunk);
//                     }
//                 }
//             }
//             return results;
//         }

//         // Single String ट्रान्सलेशन
//         try {
//             const res = await performTranslation(PRIMARY_URL, text);
//             return res.data?.translatedText || text;
//         } catch (err) {
//             const res = await performTranslation(FALLBACK_URL, text);
//             return res.data?.translatedText || text;
//         }

//     } catch (error) {
//         console.error(`Translation Failed for [${targetLanguage}]:`, error.message);
//         return text; // काहीच चालले नाही तरी मूळ डेटा परत पाठवून backend सुरक्षित ठेवेल
//     }
// };