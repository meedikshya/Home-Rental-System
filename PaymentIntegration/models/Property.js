const { DataTypes } = require("sequelize");
const { db } = require("../db");

const Property = db.define(
  "property",
  {
    propertyId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "propertyId",
    },
    landlordId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "landlordId",
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "title",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "description",
    },
    district: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "district",
    },
    city: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "city",
    },
    municipality: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "municipality",
    },
    ward: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "ward",
    },
    nearestLandmark: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "nearestLandmark",
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "price",
    },
    roomType: {
      type: DataTypes.ENUM("Apartment", "House", "Studio"),
      allowNull: false,
      field: "roomType",
    },
    status: {
      type: DataTypes.ENUM("Available", "Rented", "Inactive"),
      defaultValue: "Available",
      field: "status",
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "createdAt",
    },
    totalBedrooms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "totalBedrooms",
    },
    totalLivingRooms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "totalLivingRooms",
    },
    totalWashrooms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "totalWashrooms",
    },
    totalKitchens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "totalKitchens",
    },
  },
  {
    tableName: "property",
    timestamps: false,
  }
);

module.exports = Property;
