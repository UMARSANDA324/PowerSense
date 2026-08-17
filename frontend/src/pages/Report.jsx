import ReportForm from "../components/ReportForm";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

const Report = () => {
    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Page Header */}
            <div className="sticky top-[72px] z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all duration-200">
                <div className="max-w-7xl mx-auto p-4 sm:p-6 py-4 text-center">
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-800">Submit a Report</h1>
                    <p className="text-gray-500 mt-1 text-xs sm:text-sm font-medium">Report any electrical infrastructure issues in your area.</p>
                </div>
            </div>

            <main className="max-w-7xl mx-auto p-4 sm:p-6 mt-8">
                <ReportForm />
            </main>
        </div>
    );
};

export default Report;
