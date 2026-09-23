import Job from "../models/job.js";

export const getAllJobs = async (req, res) => {
    try {
        const jobs = await Job.find().sort({ createdAt: -1});

        res.status(200).json(jobs);

     } catch (error){
        res.status(500).json({
            success: false,
            message: "Error fetching jobs",
            error: error.message
        });
     }
};

export const getJobById = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (!job){
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        res.status(200).json(job);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const createJob = async(req,res)=>{

    try{

        const job = await Job.create({
            ...req.body
        });


        res.status(201).json({
            success:true,
            message:"Job created successfully",
            job
        });


    }catch(error){

        res.status(500).json({
            success:false,
            message:"Error creating job",
            error:error.message
        });

    }

};
