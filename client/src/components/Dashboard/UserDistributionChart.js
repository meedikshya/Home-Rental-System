import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Enhanced tooltip for the pie chart
const EnhancedPieChartTooltip = ({ active, payload, stats }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
        <p className="font-medium text-gray-800">{data.name}</p>
        <p className="text-sm text-gray-700">
          Count: <span className="font-medium">{data.value}</span>
        </p>
        <p className="text-sm text-gray-700">
          Percentage:{" "}
          <span className="font-medium">
            {Math.round((data.value / stats.totalUsers) * 100)}%
          </span>
        </p>
        {data.description && (
          <p className="text-xs text-gray-500 mt-1">{data.description}</p>
        )}
      </div>
    );
  }
  return null;
};

const UserDistributionChart = ({ chartData, stats }) => {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-6 border border-indigo-50">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        User Distribution
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData.userDistributionData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.userDistributionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<EnhancedPieChartTooltip stats={stats} />} />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default UserDistributionChart;
