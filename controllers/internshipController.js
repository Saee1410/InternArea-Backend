import Internship from '../models/Internship.js';

export const createInternship = async (req, res) => {
    try {
        const internship = await Internship.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Internship created successfully',
            data: internship
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating internship',
            error: error.message
        });
    }
}

export const getAllInternships = async (req, res) => {
    try {
        const internships = await Internship.find().sort({ createdAt: -1 });

        res.status(200).json(internships);

    } catch (error){
        res.status(500).json({
            success: false,
            message: error.message,
        })
    }
}

//get single internship

export const getInternshipById = async (req, res) => {
    try {
        const internship = await Internship.findById(req.params.id);

        if(!internship){
            return res.status(404).json({
                success: false,
                message: 'Internship not found'
            
            });
        }
        res.status(200).json(internship);
    } catch (error){
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const updateInternship = async (req, res) => {
    try {
        const internship = await Internship.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.status(200).json({
      success: true,
      message: "Internship updated successfully",
      data: internship,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
    
export const deleteInternship = async (req, res) => {
    try {
    await Internship.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Internship deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}