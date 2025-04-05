import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Enhanced tooltip for the bar chart
const EnhancedBarChartTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
        <p className="font-medium text-gray-800">{data.name}</p>
        <p className="text-sm text-gray-700">
          Count: <span className="font-medium">{data.value}</span>
        </p>
        {data.description && (
          <p className="text-xs text-gray-500 mt-1">{data.description}</p>
        )}
      </div>
    );
  }
  return null;
};

const PlatformActivityMetricsChart = ({ chartData }) => {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-6 border border-indigo-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Platform Activity Metrics
        </h3>
        <div className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
          Key conversion metrics
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Comparison of main platform activity showing the booking process flow
        from properties to payments.
      </p>

      <div className="h-96">
        <ResponsiveContainer width="90%" height="100%">
          <BarChart data={chartData.platformMetricsData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<EnhancedBarChartTooltip />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={100}>
              {chartData.platformMetricsData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Added detailed explanation */}
      <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-gray-100">
        {chartData.platformMetricsData.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center text-xs">
            <div
              className="w-3 h-3 rounded-sm mr-1"
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="mr-1">{entry.name}:</span>
            <span className="font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlatformActivityMetricsChart;
