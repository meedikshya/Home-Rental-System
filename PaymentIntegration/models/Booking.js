const { DataTypes } = require("sequelize");
const { db } = require("../db");
const Property = require("./Property");

const Booking = db.define(
  "booking",
  {
    bookingId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "bookingId",
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "userId",
    },
    propertyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "propertyId",
      references: {
        model: Property,
        key: "propertyId",
      },
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "status",
    },
    bookingDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "bookingDate",
    },
  },
  {
    tableName: "booking",
    timestamps: false,
  }
);

// Define the association
Booking.belongsTo(Property, { foreignKey: "propertyId" });
Property.hasMany(Booking, { foreignKey: "propertyId" });

module.exports = Booking;
