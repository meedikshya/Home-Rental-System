import React from "react";
import { FaArrowUp, FaArrowDown, FaEquals } from "react-icons/fa";

const CountCard = ({
  title,
  value,
  icon,
  color = "#20319D",
  trend = null,
  subtitle = null,
  previousValue = null,
  changePercent = null,
  loading = false,
  className = "",
}) => {
  // Determine trend icon and color
  const getTrendDisplay = () => {
    if (!trend) return null;

    let trendIcon = <FaEquals className="mr-1" />;
    let trendText = "Stable";
    let trendColor = "text-blue-500 bg-blue-50";

    if (trend === "up") {
      trendIcon = <FaArrowUp className="mr-1" />;
      trendText = "Growing";
      trendColor = "text-green-500 bg-green-50";
    } else if (trend === "down") {
      trendIcon = <FaArrowDown className="mr-1" />;
      trendText = "Declining";
      trendColor = "text-red-500 bg-red-50";
    }

    return (
      <div
        className={`text-xs rounded-full px-2 py-0.5 inline-flex items-center ${trendColor}`}
      >
        {trendIcon} {trendText}
      </div>
    );
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group ${className}`}
    >
      {/* Colored top border with animated gradient */}
      <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-white to-transparent overflow-hidden relative">
        <div
          className="absolute inset-0 group-hover:translate-x-full transition-transform duration-1000"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}80, transparent)`,
          }}
        ></div>
        <div
          className="absolute inset-0"
          style={{ backgroundColor: color }}
        ></div>
      </div>

      <div className="p-5 relative">
        <div className="flex items-center justify-between mb-4">
          <div
            className="rounded-full p-3 text-white transform transition-transform group-hover:scale-110"
            style={{
              backgroundColor: color,
              boxShadow: `0 3px 10px ${color}50`,
            }}
          >
            {icon}
          </div>

          {/* Title and subtitle */}
          <div className="flex flex-col items-end">
            <div className="text-sm font-medium text-gray-700">{title}</div>
            {subtitle && (
              <div className="text-xs text-gray-500">{subtitle}</div>
            )}
          </div>
        </div>

        <div className="flex flex-col">
          {/* Main value with growth animation on hover */}
          <div
            className="text-4xl font-bold transform transition-all group-hover:scale-105 origin-left"
            style={{ color }}
          >
            {loading ? (
              <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              value
            )}
          </div>

          {/* Previous value comparison */}
          {previousValue && !loading && (
            <div className="mt-1 flex items-center">
              <span className="text-xs text-gray-500 mr-2">
                Previous: {previousValue}
              </span>
              {changePercent && (
                <span
                  className={`text-xs ${
                    changePercent > 0
                      ? "text-green-500"
                      : changePercent < 0
                      ? "text-red-500"
                      : "text-gray-500"
                  }`}
                >
                  {changePercent > 0 ? "+" : ""}
                  {changePercent}%
                </span>
              )}
            </div>
          )}

          {/* Trend indicator */}
          <div className="mt-2">{getTrendDisplay()}</div>
        </div>

        {/* Decorative background element */}
        <div
          className="absolute inset-0 -z-10 opacity-10 group-hover:opacity-20 transition-opacity"
          style={{
            backgroundImage: `radial-gradient(circle at 90% 10%, ${color}, transparent 70%)`,
          }}
        ></div>

        {/* Wavy decorative pattern */}
        <div className="absolute bottom-0 right-0 w-32 h-16 -z-10 opacity-10 overflow-hidden">
          <svg
            className="w-full h-full"
            viewBox="0 0 100 50"
            preserveAspectRatio="none"
          >
            <path
              d="M0,25 C10,10 30,40 50,25 C70,10 90,40 100,25 L100,50 L0,50 Z"
              fill={color}
              opacity="0.3"
            />
            <path
              d="M0,25 C20,15 40,35 60,25 C80,15 100,35 100,25 L100,50 L0,50 Z"
              fill={color}
              opacity="0.3"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default CountCard;
