import mongoose, { Schema, Document } from "mongoose";

export interface IHolding {
  symbol: string;
  name: string;
  sector: string;
  weight: number;
  purchase_price: number;
  current_price: number;
  quantity: number;
}

export interface IPortfolio extends Document {
  client_id: string;
  client_name: string;
  portfolio_value: number;
  risk_tolerance: "low" | "medium" | "high";
  time_horizon_years: number;
  holdings: IHolding[];
}

const HoldingSchema = new Schema<IHolding>(
  {
    symbol: { type: String, required: true },
    name: { type: String, required: true },
    sector: { type: String, required: true },
    weight: { type: Number, required: true },
    purchase_price: { type: Number, required: true },
    current_price: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false }
);

const PortfolioSchema = new Schema<IPortfolio>(
  {
    client_id: { type: String, required: true }, // ❌ removed unique
    client_name: { type: String, required: true },
    portfolio_value: { type: Number, required: true },
    risk_tolerance: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
    },
    time_horizon_years: { type: Number, required: true },
    holdings: { type: [HoldingSchema], required: true },
  },
  { timestamps: true }
);

const Portfolio = mongoose.model<IPortfolio>("Portfolio", PortfolioSchema);

export default Portfolio;