
import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";
import Company from "../models/Company.js";

export const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            token = req.headers.authorization.split(" ")[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select("-password");

            if (!req.user) {
                return res.status(401).json({ message: "Not authorized, user not found" });
            }

            // Task 6: Block Admin/SuperAdmin requests for suspended companies
            // Platform Owner is never blocked (they have global access)
            const blockedRoles = ["admin", "super-admin", "company-super-admin", "regional-admin"];
            if (blockedRoles.includes(req.user.role) && req.user.companyId) {
                const company = await Company.findById(req.user.companyId).select("status name suspension");
                if (company && company.status === "suspended") {
                    return res.status(403).json({
                        message: `Access denied. Your company (${company.name}) has been suspended.`,
                        code: "COMPANY_SUSPENDED",
                        suspensionReason: company.suspension?.reason || "No reason provided",
                        suspendedAt: company.suspension?.suspendedAt
                    });
                }
            }

            return next();
        } catch (error) {
            console.error("Token verification error:", error);
            return res.status(401).json({ message: "Not authorized, token failed" });
        }
    }

    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token" });
    }
};

// @desc    Optional protection — populates req.user if token exists, but doesn't block if not
export const softProtect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select("-password");
        } catch (error) {
            console.error("Soft token verification error:", error);
        }
    }
    next();
};