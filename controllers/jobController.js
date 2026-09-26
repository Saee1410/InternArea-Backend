import Job from "../models/Job.js";
import { translateText } from "../services/translationService.js";

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
// Get All Jobs (Batch Translation Optimization)
// =====================================================
export const getAllJobs = async (req, res) => {
    try {
        const lang = req.query.lang || "en";
        console.log("Requested Job Language:", lang);

        const jobs = await Job.find().sort({ createdAt: -1 });

        // English किंवा jobs नसतील तर ट्रान्सलेशनची गरज नाही
        if (!lang || lang === "en" || jobs.length === 0) {
            return res.status(200).json(jobs);
        }

        // 1. सर्व Jobs मधील सर्व Fields एकाच Flat Array मध्ये जमा करा
        const allTextsToTranslate = [];

        jobs.forEach((job) => {
            const data = job.toObject();
            fieldsToTranslate.forEach((field) => {
                allTextsToTranslate.push(data[field] || "");
            });
        });

        // 2. 🚀 ९० requests ऐवजी फक्त १ Single Call LibreTranslate ला पाठवा
        const translatedArray = await translateText(allTextsToTranslate, lang);

        // 3. Translated डेटा पुन्हा मूळ Jobs च्या स्ट्रक्चरमध्ये मॅप करा
        if (Array.isArray(translatedArray) && translatedArray.length > 0) {
            let pointer = 0;

            const translatedJobs = jobs.map((job) => {
                const data = job.toObject();

                fieldsToTranslate.forEach((field) => {
                    if (data[field]) {
                        data[field] = translatedArray[pointer];
                    }
                    pointer++;
                });

                return data;
            });

            return res.status(200).json(translatedJobs);
        }

        res.status(200).json(jobs);

    } catch (error) {
        console.error("Get All Jobs Error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching jobs",
            error: error.message
        });
    }
};

// =====================================================
// Get Job By ID
// =====================================================
export const getJobById = async (req, res) => {
    try {
        const lang = req.query.lang || "en";

        const job = await Job.findById(req.params.id);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        if (!lang || lang === "en") {
            return res.status(200).json(job);
        }

        const data = job.toObject();

        // Single Job साठी सुद्धा १ Single Call
        const valuesToTranslate = fieldsToTranslate.map((field) => data[field] || "");
        const translatedValues = await translateText(valuesToTranslate, lang);

        if (Array.isArray(translatedValues)) {
            fieldsToTranslate.forEach((field, index) => {
                if (data[field]) {
                    data[field] = translatedValues[index];
                }
            });
        }

        res.status(200).json(data);

    } catch (error) {
        console.error("Get Job By ID Error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =====================================================
// Create Job
// =====================================================
export const createJob = async (req, res) => {
    try {
        const job = await Job.create({
            ...req.body
        });

        res.status(201).json({
            success: true,
            message: "Job created successfully",
            job
        });

    } catch (error) {
        console.error("Create Job Error:", error);
        res.status(500).json({
            success: false,
            message: "Error creating job",
            error: error.message
        });
    }
};



// import Job from "../models/Job.js";
// import { translateText } from "../services/translationService.js";


// // =====================================================
// // Translate Job
// // =====================================================

// const translateJob = async (job, lang) => {

//     // English किंवा language नसल्यास
//     // original data return करा
//     if (!lang || lang === "en") {
//         return job.toObject();
//     }

//     const data = job.toObject();

//     // MongoDB मधील dynamic text fields
//     // हे fields selected language मध्ये translate होतील
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

//         // सर्व fields एकाच वेळी translate
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

//         // Translated values data मध्ये ठेवणे
//         fieldsToTranslate.forEach((field, index) => {

//             data[field] = translatedValues[index];

//         });

//     } catch (error) {

//         console.error(
//             "Job Translation Error:",
//             error.message
//         );

//     }

//     return data;
// };


// // =====================================================
// // Get All Jobs
// // =====================================================

// export const getAllJobs = async (req, res) => {

//     try {

//         // Frontend कडून language येईल
//         //
//         // Example:
//         // /api/jobs?lang=fr
//         // /api/jobs?lang=hi
//         // /api/jobs?lang=mr

//         const lang = req.query.lang || "en";

//         console.log(
//             "Requested Job Language:",
//             lang
//         );


//         // MongoDB मधून jobs fetch
//         const jobs = await Job
//             .find()
//             .sort({ createdAt: -1 });


//         // प्रत्येक job translate करणे
//         const translatedJobs = await Promise.all(

//             jobs.map((job) =>
//                 translateJob(job, lang)
//             )

//         );


//         res.status(200).json(
//             translatedJobs
//         );


//     } catch (error) {

//         console.error(
//             "Get All Jobs Error:",
//             error
//         );

//         res.status(500).json({

//             success: false,

//             message: "Error fetching jobs",

//             error: error.message

//         });

//     }

// };


// // =====================================================
// // Get Job By ID
// // =====================================================

// export const getJobById = async (req, res) => {

//     try {

//         // Frontend language
//         //
//         // Example:
//         // /api/jobs/123?lang=fr

//         const lang = req.query.lang || "en";


//         // Find job
//         const job = await Job.findById(
//             req.params.id
//         );


//         // Job not found
//         if (!job) {

//             return res.status(404).json({

//                 success: false,

//                 message: "Job not found"

//             });

//         }


//         // Translate single job
//         const translatedJob =
//             await translateJob(
//                 job,
//                 lang
//             );


//         res.status(200).json(
//             translatedJob
//         );


//     } catch (error) {

//         console.error(
//             "Get Job By ID Error:",
//             error
//         );

//         res.status(500).json({

//             success: false,

//             message: error.message

//         });

//     }

// };


// // =====================================================
// // Create Job
// // =====================================================

// export const createJob = async (req, res) => {

//     try {

//         // Create job in MongoDB
//         // Original English data save होईल

//         const job = await Job.create({
//             ...req.body
//         });


//         res.status(201).json({

//             success: true,

//             message: "Job created successfully",

//             job

//         });


//     } catch (error) {

//         console.error(
//             "Create Job Error:",
//             error
//         );


//         res.status(500).json({

//             success: false,

//             message: "Error creating job",

//             error: error.message

//         });

//     }

// };



// // import Job from "../models/Job.js";

// // export const getAllJobs = async (req, res) => {
// //     try {
// //         const jobs = await Job.find().sort({ createdAt: -1});

// //         res.status(200).json(jobs);

// //      } catch (error){
// //         res.status(500).json({
// //             success: false,
// //             message: "Error fetching jobs",
// //             error: error.message
// //         });
// //      }
// // };

// // export const getJobById = async (req, res) => {
// //     try {
// //         const job = await Job.findById(req.params.id);

// //         if (!job){
// //             return res.status(404).json({
// //                 success: false,
// //                 message: "Job not found"
// //             });
// //         }

// //         res.status(200).json(job);
// //     } catch (error) {
// //         res.status(500).json({
// //             success: false,
// //             message: error.message,
// //         });
// //     }
// // };

// // export const createJob = async(req,res)=>{

// //     try{

// //         const job = await Job.create({
// //             ...req.body
// //         });


// //         res.status(201).json({
// //             success:true,
// //             message:"Job created successfully",
// //             job
// //         });


// //     }catch(error){

// //         res.status(500).json({
// //             success:false,
// //             message:"Error creating job",
// //             error:error.message
// //         });

// //     }

// // };
