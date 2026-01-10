import { Sequelize } from "sequelize-typescript";
import config from "config";
import User from "../models/user";
import BankAccount from "../models/bankAccount";
import Transaction from "../models/transaction";
import Loan from "../models/loan";
import LoanPayment from "../models/loanPayment";

const logging = config.get<boolean>("sequelize.logging") ? console.log : false;

const sequelize = new Sequelize({
  models: [User, BankAccount, Transaction, Loan, LoanPayment],
  dialect: "mysql",
  ...config.get("db"),
  logging,
});

export default sequelize;