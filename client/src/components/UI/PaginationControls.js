import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const PaginationControls = ({ currentPage, totalPages, setCurrentPage }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center mt-8">
      <div className="bg-white rounded-lg shadow px-3 py-2 flex items-center space-x-1">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={`p-2 rounded-md transition-colors ${
            currentPage === 1
              ? "text-gray-300 cursor-not-allowed"
              : "text-blue-500 hover:bg-blue-50"
          }`}
          aria-label="Previous page"
        >
          <FaChevronLeft />
        </button>

        {/* Page numbers */}
        <div className="flex items-center space-x-1">
          {[...Array(totalPages)].map((_, i) => {
            const pageNum = i + 1;

            // Display logic for page numbers
            if (
              pageNum === 1 ||
              pageNum === totalPages ||
              (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
            ) {
              return (
                <button
                  key={i}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
                    currentPage === pageNum
                      ? "bg-blue-500 text-white font-medium"
                      : "text-gray-700 hover:bg-blue-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            } else if (
              (pageNum === 2 && currentPage > 3) ||
              (pageNum === totalPages - 1 && currentPage < totalPages - 2)
            ) {
              return (
                <span key={i} className="text-gray-500">
                  ...
                </span>
              );
            }

            return null;
          })}
        </div>

        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-md transition-colors ${
            currentPage === totalPages
              ? "text-gray-300 cursor-not-allowed"
              : "text-blue-500 hover:bg-blue-50"
          }`}
          aria-label="Next page"
        >
          <FaChevronRight />
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
