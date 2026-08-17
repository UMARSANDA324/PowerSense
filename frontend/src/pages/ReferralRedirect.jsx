import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, UserPlus, AlertCircle } from "lucide-react";
import api from "../services/api";

const ReferralRedirect = () => {
    const { referralCode } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState("validating"); // validating | valid | invalid
    const [referrerName, setReferrerName] = useState("");

    useEffect(() => {
        const resolveAndRedirect = async () => {
            try {
                const response = await api.get(`referral/resolve/${encodeURIComponent(referralCode)}`);
                if (response.data?.valid) {
                    setReferrerName(response.data.referrerName || "");
                    setStatus("valid");
                    // Store referral code for registration
                    localStorage.setItem("nikola_referral_code", referralCode.toUpperCase().trim());
                    // Redirect to register after brief display
                    setTimeout(() => navigate("/register", { replace: true }), 2000);
                } else {
                    setStatus("invalid");
                    setTimeout(() => navigate("/register", { replace: true }), 2500);
                }
            } catch (error) {
                console.warn("[Referral] Failed to resolve code:", error.message);
                setStatus("invalid");
                // Still allow registration on failure
                setTimeout(() => navigate("/register", { replace: true }), 2500);
            }
        };

        if (referralCode) {
            resolveAndRedirect();
        } else {
            navigate("/register", { replace: true });
        }
    }, [referralCode, navigate]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-xl p-10 max-w-md w-full text-center">
                {status === "validating" && (
                    <>
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mb-2">Processing Invitation</h2>
                        <p className="text-sm text-gray-500">Validating your referral link...</p>
                    </>
                )}

                {status === "valid" && (
                    <>
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <UserPlus className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mb-2">You've Been Invited!</h2>
                        {referrerName && (
                            <p className="text-sm text-gray-500 mb-4">
                                <span className="font-bold text-gray-700">{referrerName}</span> invited you to join Nikola
                            </p>
                        )}
                        <p className="text-xs text-gray-400">Redirecting to registration...</p>
                    </>
                )}

                {status === "invalid" && (
                    <>
                        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-8 h-8 text-amber-500" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mb-2">Invalid Referral Link</h2>
                        <p className="text-sm text-gray-500 mb-4">This referral link is no longer valid, but you can still create an account.</p>
                        <p className="text-xs text-gray-400">Redirecting to registration...</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default ReferralRedirect;
