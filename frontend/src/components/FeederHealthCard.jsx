import React from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

const FeederHealthCard = ({ feeder }) => {
  const isRed = feeder.status === 'Red';
  const isYellow = feeder.status === 'Yellow';

  let bgClass = "bg-green-50 border-green-200";
  let textClass = "text-green-800";
  let iconClass = "text-green-500";
  let barClass = "bg-green-500";
  let Icon = CheckCircle;

  if (isRed) {
    bgClass = "bg-red-50 border-red-200";
    textClass = "text-red-800";
    iconClass = "text-red-500";
    barClass = "bg-red-500";
    Icon = ShieldAlert;
  } else if (isYellow) {
    bgClass = "bg-yellow-50 border-yellow-200";
    textClass = "text-yellow-800";
    iconClass = "text-yellow-500";
    barClass = "bg-yellow-500";
    Icon = AlertTriangle;
  }

  return (
    <div className={`p-5 rounded-2xl border ${bgClass} transition-all hover:shadow-md`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className={`font-bold text-lg ${textClass}`}>{feeder.feeder}</h3>
          <p className="text-sm opacity-80 mt-1 flex items-center gap-1">
            <span className="font-medium">{feeder.incidents}</span> recent incidents
          </p>
        </div>
        <div className={`p-2 rounded-full bg-white/60 shadow-sm ${iconClass}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-600">Health Score</span>
                    <span className={`font-bold ${textClass}`}>{feeder.healthScore}%</span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                        className={`h-full ${barClass} transition-all duration-1000 ease-out`} 
                        style={{ width: `${feeder.healthScore}%` }}
                    />
                </div>
                <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-600">Rating</span>
                    <span className={`font-bold ${textClass}`}>{feeder.rating}</span>
                </div>
                <div className="pt-2 border-t border-gray-100 mt-2">
                    <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-600">AI Confidence</span>
                        <span className="font-bold text-blue-600">{feeder.aiConfidence}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mt-1">
                        <div 
                            className="h-full bg-blue-600 transition-all duration-1000 ease-out" 
                            style={{ width: `${feeder.aiConfidence}%` }}
                        />
                    </div>
                </div>
            </div>

      {isRed && (
        <div className="mt-4 text-xs font-medium bg-red-100 text-red-700 px-3 py-2 rounded-lg inline-block">
          Needs Attention
        </div>
      )}
      {isYellow && (
        <div className="mt-4 text-xs font-medium bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg inline-block">
          Monitor for Instability
        </div>
      )}
    </div>
  );
};

export default FeederHealthCard;
