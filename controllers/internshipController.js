import Internship from "../models/Internship.js";
import { translateText } from "../services/translationService.js";

// ट्रान्सलेट करायच्या fields ची यादी
const fieldsToTranslate = [
    "title",
    "category",
    "location",
    "duration",
    "aboutCompany",
    "aboutInternship",
    "whoCanApply",
    "perks",
    "additionalInfo"
];

// =====================================================
// Helper: Translate Single Internship (Single ID Endpoint)
// =====================================================
const translateInternship = async (internship, lang) => {
    if (!lang || lang === "en") {
        return internship.toObject();
    }

    const data = internship.toObject();

    try {
        const valuesToTranslate = fieldsToTranslate.map(
            (field) => data[field] || ""
        );

        const translatedValues = await translateText(valuesToTranslate, lang);

        if (Array.isArray(translatedValues)) {
            fieldsToTranslate.forEach((field, index) => {
                if (data[field]) {
                    data[field] = translatedValues[index];
                }
            });
        }
    } catch (error) {
        console.error("Internship Translation Error:", error.message);
    }

    return data;
};


// =====================================================
// Create Internship
// =====================================================
export const createInternship = async (req, res) => {
    try {
        const internship = await Internship.create(req.body);

        res.status(201).json({
            success: true,
            message: "Internship created successfully",
            data: internship
        });
    } catch (error) {
        console.error("Create Internship Error:", error);

        res.status(500).json({
            success: false,
            message: "Error creating internship",
            error: error.message
        });
    }
};


// =====================================================
// Get All Internships (1 Mega-Batch Call Optimization)
// =====================================================
export const getAllInternships = async (req, res) => {
    try {
        const lang = req.query.lang || "en";
        console.log("Requested language:", lang);

        const internships = await Internship.find().sort({ createdAt: -1 });

        // English भाषा असेल किंवा Data नसेल तर डायरेक्ट return करा
        if (!lang || lang === "en" || internships.length === 0) {
            return res.status(200).json(internships);
        }

        // १. सर्व internships च्या सर्व fields एकाच array मध्ये गोळा करा
        const allTextsToTranslate = [];

        internships.forEach((internship) => {
            const data = internship.toObject();
            fieldsToTranslate.forEach((field) => {
                allTextsToTranslate.push(data[field] || "");
            });
        });

        // २. 🚀 फक्त १ Single API Call LibreTranslate कडे पाठवा
        const translatedArray = await translateText(allTextsToTranslate, lang);

        // ३. जर translation array मिळाले तर प्रत्येक internship मध्ये मॅप करा
        if (Array.isArray(translatedArray) && translatedArray.length > 0) {
            let pointer = 0;

            const translatedInternships = internships.map((internship) => {
                const data = internship.toObject();

                fieldsToTranslate.forEach((field) => {
                    if (data[field]) {
                        data[field] = translatedArray[pointer];
                    }
                    pointer++;
                });

                return data;
            });

            return res.status(200).json(translatedInternships);
        }

        // जर ट्रान्सलेशन अपयशी ठरले तर मूळ internships रिटर्न करा
        res.status(200).json(internships);

    } catch (error) {
        console.error("Get All Internships Error:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =====================================================
// Get Internship By ID
// =====================================================
export const getInternshipById = async (req, res) => {
    try {
        const lang = req.query.lang || "en";

        const internship = await Internship.findById(req.params.id);

        if (!internship) {
            return res.status(404).json({
                success: false,
                message: "Internship not found"
            });
        }

        const translatedInternship = await translateInternship(
            internship,
            lang
        );

        res.status(200).json(translatedInternship);
    } catch (error) {
        console.error("Get Internship By ID Error:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =====================================================
// Update Internship
// =====================================================
export const updateInternship = async (req, res) => {
    try {
        const internship = await Internship.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!internship) {
            return res.status(404).json({
                success: false,
                message: "Internship not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Internship updated successfully",
            data: internship
        });
    } catch (error) {
        console.error("Update Internship Error:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =====================================================
// Delete Internship
// =====================================================
export const deleteInternship = async (req, res) => {
    try {
        const internship = await Internship.findByIdAndDelete(
            req.params.id
        );

        if (!internship) {
            return res.status(404).json({
                success: false,
                message: "Internship not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Internship deleted successfully"
        });
    } catch (error) {
        console.error("Delete Internship Error:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// import Internship from "../models/Internship.js";
// import { translateText } from "../services/translationService.js";


// // =====================================================
// // Translate Internship
// // =====================================================
// const translateInternship = async (internship, lang) => {

//     // English किंवा language नसल्यास original data
//     if (!lang || lang === "en") {
//         return internship.toObject();
//     }

//     const data = internship.toObject();

//     const fieldsToTranslate = [
//         "title",
//         "category",
//         "location",
//         "duration",
//         "aboutCompany",
//         "aboutInternship",
//         "whoCanApply",
//         "perks",
//         "additionalInfo"
//     ];

//     try {

//         const translatedValues = await Promise.all(
//             fieldsToTranslate.map(async (field) => {

//                 // Field empty असेल तर translation call करू नका
//                 if (!data[field]) {
//                     return data[field];
//                 }

//                 return await translateText(
//                     data[field],
//                     lang
//                 );
//             })
//         );

//         fieldsToTranslate.forEach((field, index) => {
//             data[field] = translatedValues[index];
//         });

//     } catch (error) {

//         console.error(
//             "Internship Translation Error:",
//             error.message
//         );
//     }

//     return data;
// };


// // =====================================================
// // Create Internship
// // =====================================================
// export const createInternship = async (req, res) => {

//     try {

//         const internship = await Internship.create(req.body);

//         res.status(201).json({
//             success: true,
//             message: "Internship created successfully",
//             data: internship
//         });

//     } catch (error) {

//         console.error("Create Internship Error:", error);

//         res.status(500).json({
//             success: false,
//             message: "Error creating internship",
//             error: error.message
//         });

//     }
// };


// // =====================================================
// // Get All Internships
// // =====================================================
// export const getAllInternships = async (req, res) => {

//     try {

//         // Frontend कडून language येईल
//         // Example:
//         // /api/internships?lang=hi

//         const lang = req.query.lang || "en";

//         console.log("Requested language:", lang);

//         const internships = await Internship
//             .find()
//             .sort({ createdAt: -1 });


//         // प्रत्येक internship translate करणे
//         const translatedInternships = await Promise.all(

//             internships.map((internship) =>
//                 translateInternship(internship, lang)
//             )

//         );


//         res.status(200).json(translatedInternships);

//     } catch (error) {

//         console.error(
//             "Get All Internships Error:",
//             error
//         );

//         res.status(500).json({
//             success: false,
//             message: error.message
//         });

//     }
// };


// // =====================================================
// // Get Internship By ID
// // =====================================================
// export const getInternshipById = async (req, res) => {

//     try {

//         // Frontend language
//         // Example:
//         // /api/internships/123?lang=fr

//         const lang = req.query.lang || "en";


//         const internship = await Internship.findById(
//             req.params.id
//         );


//         if (!internship) {

//             return res.status(404).json({
//                 success: false,
//                 message: "Internship not found"
//             });

//         }


//         // Translate single internship
//         const translatedInternship =
//             await translateInternship(
//                 internship,
//                 lang
//             );


//         res.status(200).json(
//             translatedInternship
//         );

//     } catch (error) {

//         console.error(
//             "Get Internship By ID Error:",
//             error
//         );

//         res.status(500).json({
//             success: false,
//             message: error.message
//         });

//     }
// };


// // =====================================================
// // Update Internship
// // =====================================================
// export const updateInternship = async (req, res) => {

//     try {

//         const internship =
//             await Internship.findByIdAndUpdate(
//                 req.params.id,
//                 req.body,
//                 {
//                     new: true,
//                     runValidators: true
//                 }
//             );


//         if (!internship) {

//             return res.status(404).json({
//                 success: false,
//                 message: "Internship not found"
//             });

//         }


//         res.status(200).json({
//             success: true,
//             message: "Internship updated successfully",
//             data: internship
//         });

//     } catch (error) {

//         console.error(
//             "Update Internship Error:",
//             error
//         );

//         res.status(500).json({
//             success: false,
//             message: error.message
//         });

//     }
// };


// // =====================================================
// // Delete Internship
// // =====================================================
// export const deleteInternship = async (req, res) => {

//     try {

//         const internship =
//             await Internship.findByIdAndDelete(
//                 req.params.id
//             );


//         if (!internship) {

//             return res.status(404).json({
//                 success: false,
//                 message: "Internship not found"
//             });

//         }


//         res.status(200).json({
//             success: true,
//             message: "Internship deleted successfully"
//         });

//     } catch (error) {

//         console.error(
//             "Delete Internship Error:",
//             error
//         );

//     }

// };





// import Internship from '../models/Internship.js';
// import { translateText } from "../services/translationService.js";

// export const createInternship = async (req, res) => {
//     try {
//         const internship = await Internship.create(req.body);

//         res.status(201).json({
//             success: true,
//             message: 'Internship created successfully',
//             data: internship
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Error creating internship',
//             error: error.message
//         });
//     }
// }

// export const getAllInternships = async (req, res) => {
//     try {
//         const internships = await Internship.find().sort({ createdAt: -1 });

//         res.status(200).json(internships);

//     } catch (error){
//         res.status(500).json({
//             success: false,
//             message: error.message,
//         })
//     }
// }

// //get single internship

// export const getInternshipById = async (req, res) => {
//     try {
//         const internship = await Internship.findById(req.params.id);

//         if(!internship){
//             return res.status(404).json({
//                 success: false,
//                 message: 'Internship not found'
            
//             });
//         }
//         res.status(200).json(internship);
//     } catch (error){
//         res.status(500).json({
//             success: false,
//             message: error.message,
//         });
//     }
// };

// export const updateInternship = async (req, res) => {
//     try {
//         const internship = await Internship.findByIdAndUpdate(
//             req.params.id,
//             req.body,
//             { new: true }
//         );
//         res.status(200).json({
//       success: true,
//       message: "Internship updated successfully",
//       data: internship,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
    
// export const deleteInternship = async (req, res) => {
//     try {
//     await Internship.findByIdAndDelete(req.params.id);

//     res.status(200).json({
//       success: true,
//       message: "Internship deleted successfully",
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// }
