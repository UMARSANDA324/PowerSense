import Report from "../models/Report.js";

// @desc    Submit a new report
// @route   POST /api/reports
// @access  Public
export const createReport = async (req, res) => {
    const { fullName, phone, area, feeder, issueType, description } = req.body;

    if (!fullName || !phone || !area || !feeder || !issueType || !description) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
        const report = await Report.create({
            fullName,
            phone,
            area,
            feeder,
            issueType,
            description,
            user: req.user?._id || null
        });

        res.status(201).json({ message: "Report submitted successfully.", report });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all reports
// @route   GET /api/reports
// @access  Private/Admin
export const getAllReports = async (req, res) => {
    try {
        const reports = await Report.find().sort({ createdAt: -1 });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get logged-in user's reports
// @route   GET /api/reports/my
// @access  Private
export const getMyReports = async (req, res) => {
    try {
        const reports = await Report.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update report status (Admin only)
// @route   PUT /api/reports/:id/status
// @access  Private/Admin
export const updateReportStatus = async (req, res) => {
    const { status } = req.body;
    try {
        const report = await Report.findById(req.params.id);
        if (!report) return res.status(404).json({ message: "Report not found." });

        report.status = status;
        await report.save();
        res.json({ message: "Report status updated.", report });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
