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

