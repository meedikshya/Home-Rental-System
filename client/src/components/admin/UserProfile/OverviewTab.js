import React from "react";
import {
  FaCalendarCheck,
  FaFileContract,
  FaMoneyBillWave,
  FaIdCard,
  FaClipboardList,
} from "react-icons/fa";

const OverviewTab = ({
  user,
  bookings,
  agreements,
  payments,
  formatCurrency,
}) => {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center">
          <div className="rounded-full w-10 h-10 flex items-center justify-center bg-blue-100 text-blue-600 mb-3">
            <FaCalendarCheck />
          </div>
          <span className="text-sm text-gray-500">Bookings</span>
          <span className="text-2xl font-bold">{bookings.length}</span>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center">
          <div className="rounded-full w-10 h-10 flex items-center justify-center bg-purple-100 text-purple-600 mb-3">
            <FaFileContract />
          </div>
          <span className="text-sm text-gray-500">Agreements</span>
          <span className="text-2xl font-bold">{agreements.length}</span>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center">
          <div className="rounded-full w-10 h-10 flex items-center justify-center bg-green-100 text-green-600 mb-3">
            <FaMoneyBillWave />
          </div>
          <span className="text-sm text-gray-500">Payments</span>
          <span className="text-2xl font-bold">{payments.length}</span>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <FaIdCard className="mr-2 text-[#20319D]" />
          User Information
        </h3>

        <div className="bg-gray-50 p-4 rounded-lg">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="text-sm font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Role</dt>
              <dd className="text-sm font-medium">{user.userRole}</dd>
            </div>
          </dl>
        </div>

        <h3 className="text-lg font-medium text-gray-900 flex items-center mt-6">
          <FaClipboardList className="mr-2 text-[#20319D]" />
          Activity Summary
        </h3>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="space-y-4">
            {/* Recent activity info */}
            {bookings.length === 0 &&
            agreements.length === 0 &&
            payments.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No activity recorded for this user.
              </p>
            ) : (
              <>
                {bookings.length > 0 && (
                  <div className="flex items-start">
                    <div className="rounded-full w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 mr-3 mt-1">
                      <FaCalendarCheck size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Recent Booking Activity
                      </p>
                      <p className="text-xs text-gray-500">
                        {bookings.length} booking(s) - Latest status:{" "}
                        {bookings[0]?.status || "N/A"}
                      </p>
                    </div>
                  </div>
                )}

                {agreements.length > 0 && (
                  <div className="flex items-start">
                    <div className="rounded-full w-8 h-8 flex items-center justify-center bg-purple-100 text-purple-600 mr-3 mt-1">
                      <FaFileContract size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Recent Agreement Activity
                      </p>
                      <p className="text-xs text-gray-500">
                        {agreements.length} agreement(s) - Latest status:{" "}
                        {agreements[0]?.status || "N/A"}
                      </p>
                    </div>
                  </div>
                )}

                {payments.length > 0 && (
                  <div className="flex items-start">
                    <div className="rounded-full w-8 h-8 flex items-center justify-center bg-green-100 text-green-600 mr-3 mt-1">
                      <FaMoneyBillWave size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Recent Payment Activity
                      </p>
                      <p className="text-xs text-gray-500">
                        {payments.length} payment(s) - Total amount:{" "}
                        {formatCurrency(
                          payments.reduce(
                            (sum, payment) => sum + (payment.amount || 0),
                            0
                          )
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
