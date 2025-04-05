// import React from "react";
// import {
//   FaBed,
//   FaBath,
//   FaHome,
//   FaTrash,
//   FaMapMarkerAlt,
//   FaImages,
//   FaChevronLeft,
//   FaChevronRight,
//   FaUser,
//   FaInfoCircle,
// } from "react-icons/fa";

// const PropertyListAdmin = ({
//   properties,
//   propertyImages,
//   objectUrls,
//   currentImageIndices,
//   landlordInfo,
//   setCurrentImageIndices,
//   setObjectUrls,
//   processImageUrl,
//   goToPrevImage,
//   goToNextImage,
//   getStatusBadgeStyle,
//   handleDeleteProperty,
//   handleResetFilters,
// }) => {
//   // Empty state - no properties
//   if (properties.length === 0) {
//     return (
//       <div className="bg-white p-8 rounded-lg shadow-sm text-center">
//         <FaHome className="text-blue-400 text-5xl mx-auto mb-4" />
//         <h3 className="text-xl font-semibold text-blue-700 mb-2">
//           No Properties Found
//         </h3>
//         <p className="text-gray-600 mb-4">
//           There are no properties matching your search criteria.
//         </p>
//         <button
//           onClick={handleResetFilters}
//           className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
//         >
//           Clear Filters
//         </button>
//       </div>
//     );
//   }

//   return (
//     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
//       {properties.map((property) => {
//         const propertyId = property.propertyId;
//         const images = propertyImages[propertyId] || [];
//         const hasMultipleImages = images.length > 1;
//         const currentIdx = currentImageIndices[propertyId] || 0;
//         const imageUrl =
//           hasMultipleImages && images[currentIdx]?.imageUrl
//             ? images[currentIdx].imageUrl
//             : objectUrls[propertyId];
//         const landlord = landlordInfo[property.landlordId];

//         return (
//           <div
//             key={propertyId}
//             className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
//           >
//             {/* Property image section with slider controls */}
//             <div className="h-48 bg-gray-200 relative overflow-hidden group">
//               {imageUrl ? (
//                 <div className="relative w-full h-full">
//                   <img
//                     src={imageUrl}
//                     alt={property.title || "Property image"}
//                     className="w-full h-full object-cover"
//                     loading="lazy"
//                   />
//                   {/* Image slider navigation arrows - only show if multiple images */}
//                   {hasMultipleImages && (
//                     <>
//                       {/* Left arrow */}
//                       <button
//                         onClick={(e) => goToPrevImage(propertyId, e)}
//                         className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition opacity-0 group-hover:opacity-100"
//                         aria-label="Previous image"
//                       >
//                         <FaChevronLeft size={16} />
//                       </button>

//                       {/* Right arrow */}
//                       <button
//                         onClick={(e) => goToNextImage(propertyId, e)}
//                         className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition opacity-0 group-hover:opacity-100"
//                         aria-label="Next image"
//                       >
//                         <FaChevronRight size={16} />
//                       </button>
//                     </>
//                   )}
//                   {/* Image count indicator */}
//                   {hasMultipleImages && (
//                     <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-2">
//                       {images.map((_, index) => (
//                         <button
//                           key={index}
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             e.preventDefault();

//                             setCurrentImageIndices((prev) => ({
//                               ...prev,
//                               [propertyId]: index,
//                             }));

//                             setObjectUrls((prev) => ({
//                               ...prev,
//                               [propertyId]: processImageUrl(
//                                 images[index].imageUrl
//                               ),
//                             }));
//                           }}
//                           className={`w-2 h-2 rounded-full transition-transform duration-200 ${
//                             currentIdx === index
//                               ? "bg-white scale-125"
//                               : "bg-white opacity-60 hover:opacity-80"
//                           }`}
//                           aria-label={`Image ${index + 1} of ${images.length}`}
//                         />
//                       ))}
//                     </div>
//                   )}
//                 </div>
//               ) : (
//                 <div className="flex items-center justify-center h-full flex-col">
//                   <FaHome className="text-gray-400 text-5xl mb-2" />
//                   <span className="text-gray-500 text-sm">No image</span>
//                 </div>
//               )}

//               {/* View all images button */}
//               {hasMultipleImages && (
//                 <div className="absolute top-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full cursor-pointer transition opacity-0 group-hover:opacity-100">
//                   <FaImages size={14} />
//                 </div>
//               )}
//             </div>

//             {/* Property details */}
//             <div className="p-5">
//               <div className="flex justify-between items-start">
//                 <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-1">
//                   {property.title}
//                 </h3>
//                 <span className="text-lg font-bold text-green-600">
//                   ₹{property.price}
//                 </span>
//               </div>

//               <div className="flex items-center text-gray-500 mb-3">
//                 <FaMapMarkerAlt className="mr-1" />
//                 <span className="line-clamp-1">
//                   {property.municipality}, {property.city}
//                 </span>
//               </div>

//               <p className="text-gray-600 mb-4 line-clamp-2">
//                 {property.description}
//               </p>

//               <div className="flex justify-between mb-4">
//                 <div className="flex items-center text-gray-700">
//                   <FaBed className="mr-1" />
//                   <span>{property.totalBedrooms} bed</span>
//                 </div>
//                 <div className="flex items-center text-gray-700">
//                   <FaBath className="mr-1" />
//                   <span>{property.totalWashrooms} bath</span>
//                 </div>
//                 <div className="flex items-center text-gray-700">
//                   <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-800">
//                     {property.roomType}
//                   </span>
//                 </div>
//               </div>

//               {/* Landlord info */}
//               {landlord && (
//                 <div className="mb-3 text-sm text-gray-600 flex items-center">
//                   <FaUser className="mr-1" />
//                   <span>Landlord: {landlord.name}</span>
//                 </div>
//               )}

//               <div className="mb-4">
//                 <span
//                   className={`text-xs font-medium px-2 py-1 rounded ${getStatusBadgeStyle(
//                     property.status
//                   )}`}
//                 >
//                   {property.status}
//                 </span>
//               </div>

//               {/* Admin action buttons */}
//               <div className="flex justify-end pt-2 border-t">
//                 <button
//                   className="text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1"
//                   onClick={() => handleDeleteProperty(propertyId)}
//                   title="Delete Property"
//                 >
//                   <FaTrash size={14} />
//                   <span>Delete</span>
//                 </button>
//               </div>
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// };

// export default PropertyListAdmin;
