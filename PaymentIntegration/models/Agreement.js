const { DataTypes } = require("sequelize");
const { db } = require("../db");

const Agreement = db.define(
  "Agreement",
  {
    agreementId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    landlordId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    renterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    signedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "agreement",
    timestamps: false,
  }
);

module.exports = Agreement;
