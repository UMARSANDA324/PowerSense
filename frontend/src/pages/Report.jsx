import ReportForm from "../components/ReportForm";

const Report = () => {
    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto p-6 pt-12 text-center">
                    <h1 className="text-3xl font-black text-gray-800">Submit a Report</h1>
                    <p className="text-gray-500 mt-2 font-medium">Report any electrical infrastructure issues in your area.</p>
                </div>
            </div>

            <main className="max-w-7xl mx-auto p-4 sm:p-6 mt-8">
                <ReportForm />
            </main>
        </div>
    );
};

export default Report;
