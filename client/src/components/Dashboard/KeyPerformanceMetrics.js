// import React from "react";
// import {
//   FaCheckCircle,
//   FaPercentage,
//   FaBuilding,
//   FaArrowUp,
//   FaEquals,
//   FaArrowDown,
// } from "react-icons/fa";
// import { Doughnut } from "react-chartjs-2";
// import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

// // Register the required chart components
// ChartJS.register(ArcElement, Tooltip, Legend);

// const KeyPerformanceMetrics = ({ stats, derivedStats }) => {
//   // Data for doughnut charts
//   const approvalRateData = {
//     labels: ["Approved", "Not Approved"],
//     datasets: [
//       {
//         data: [
//           derivedStats.agreementApprovalRate,
//           100 - derivedStats.agreementApprovalRate,
//         ],
//         backgroundColor: ["#4F46E5", "#E0E7FF"],
//         borderWidth: 0,
//       },
//     ],
//   };

//   const paymentConversionData = {
//     labels: ["Converted", "Not Converted"],
//     datasets: [
//       {
//         data: [
//           derivedStats.paymentToAgreementRatio,
//           100 - derivedStats.paymentToAgreementRatio,
//         ],
//         backgroundColor: ["#7C3AED", "#EDE9FE"],
//         borderWidth: 0,
//       },
//     ],
//   };

//   // Chart options
//   const chartOptions = {
//     cutout: "70%",
//     plugins: {
//       legend: {
//         display: false,
//       },
//       tooltip: {
//         enabled: true,
//       },
//     },
//     maintainAspectRatio: false,
//   };

//   return (
//     <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-6 border border-indigo-50">
//       <h3 className="text-lg font-semibold text-gray-800 mb-5">
//         Key Performance Metrics
//       </h3>

//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         {/* Approval Rate */}
//         <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow duration-300">
//           <div className="flex justify-between items-center mb-4">
//             <h4 className="text-lg font-medium text-gray-700">Approval Rate</h4>
//             <FaCheckCircle className="text-indigo-600 text-xl" />
//           </div>

//           <div className="h-48 flex items-center justify-center relative">
//             <Doughnut data={approvalRateData} options={chartOptions} />
//             <div className="absolute inset-0 flex items-center justify-center flex-col">
//               <span className="text-3xl font-bold text-gray-800">
//                 {derivedStats.agreementApprovalRate}%
//               </span>
//               <span className="text-xs text-gray-500">Approved</span>
//             </div>
//           </div>

//           <div className="mt-3 text-center">
//             <span
//               className={`text-sm font-medium px-2 py-1 rounded-full ${
//                 derivedStats.agreementApprovalRate > 75
//                   ? "bg-green-100 text-green-700"
//                   : derivedStats.agreementApprovalRate > 50
//                   ? "bg-yellow-100 text-yellow-700"
//                   : "bg-red-100 text-red-700"
//               }`}
//             >
//               {derivedStats.agreementApprovalRate > 75
//                 ? "High"
//                 : derivedStats.agreementApprovalRate > 50
//                 ? "Average"
//                 : "Low"}
//             </span>
//           </div>
//         </div>

//         {/* Payment Conversion */}
//         <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow duration-300">
//           <div className="flex justify-between items-center mb-4">
//             <h4 className="text-lg font-medium text-gray-700">
//               Payment Conversion
//             </h4>
//             <FaPercentage className="text-purple-600 text-xl" />
//           </div>

//           <div className="h-48 flex items-center justify-center relative">
//             <Doughnut data={paymentConversionData} options={chartOptions} />
//             <div className="absolute inset-0 flex items-center justify-center flex-col">
//               <span className="text-3xl font-bold text-gray-800">
//                 {derivedStats.paymentToAgreementRatio}%
//               </span>
//               <span className="text-xs text-gray-500">Converted</span>
//             </div>
//           </div>

//           <div className="mt-3 text-center">
//             <span
//               className={`text-sm font-medium px-2 py-1 rounded-full ${
//                 derivedStats.paymentToAgreementRatio > 75
//                   ? "bg-green-100 text-green-700"
//                   : derivedStats.paymentToAgreementRatio > 50
//                   ? "bg-yellow-100 text-yellow-700"
//                   : "bg-red-100 text-red-700"
//               }`}
//             >
//               {derivedStats.paymentToAgreementRatio > 75
//                 ? "High"
//                 : derivedStats.paymentToAgreementRatio > 50
//                 ? "Average"
//                 : "Low"}
//             </span>
//           </div>
//         </div>

//         {/* Properties Per Landlord */}
//         <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow duration-300">
//           <div className="flex justify-between items-center mb-4">
//             <h4 className="text-lg font-medium text-gray-700">
//               Properties Per Landlord
//             </h4>
//             <FaBuilding className="text-blue-600 text-xl" />
//           </div>

//           <div className="h-48 flex items-center justify-center">
//             <div className="text-center">
//               <span className="text-5xl font-bold text-gray-800 block mb-2">
//                 {derivedStats.propertiesPerLandlord}
//               </span>
//               <div className="flex items-center justify-center mt-2">
//                 <div className="bg-blue-100 h-2 w-full rounded-full">
//                   <div
//                     className="bg-blue-600 h-2 rounded-full"
//                     style={{
//                       width: `${Math.min(
//                         derivedStats.propertiesPerLandlord * 25,
//                         100
//                       )}%`,
//                     }}
//                   ></div>
//                 </div>
//               </div>
//               <span className="text-sm text-gray-500 block mt-2">
//                 Average properties managed
//               </span>
//             </div>
//           </div>

//           <div className="mt-3 text-center">
//             <span
//               className={`text-sm font-medium px-2 py-1 rounded-full ${
//                 derivedStats.propertiesPerLandlord > 2
//                   ? "bg-green-100 text-green-700"
//                   : derivedStats.propertiesPerLandlord > 1
//                   ? "bg-yellow-100 text-yellow-700"
//                   : "bg-red-100 text-red-700"
//               }`}
//             >
//               {derivedStats.propertiesPerLandlord > 2
//                 ? "High"
//                 : derivedStats.propertiesPerLandlord > 1
//                 ? "Balanced"
//                 : "Low"}
//             </span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default KeyPerformanceMetrics;
