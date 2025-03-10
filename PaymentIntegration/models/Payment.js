const { DataTypes } = require("sequelize");
const { db } = require("../db");

const Payment = db.define(
  "Payment",
  {
    paymentId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    agreementId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    renterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    paymentStatus: {
      type: DataTypes.ENUM("Pending", "Completed", "Failed"),
      allowNull: true,
      defaultValue: "Pending",
    },
    paymentDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    TransactionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ReferenceId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    PaymentGateway: {
      type: DataTypes.ENUM("eSewa", "Khalti"),
      allowNull: true,
      defaultValue: "eSewa",
    },
  },
  {
    tableName: "payment",
    timestamps: false,
  }
);

module.exports = Payment;
