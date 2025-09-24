import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Entity, Column, OneToMany } from 'typeorm';
import { Budget } from 'src/budget/entities/budget.entity';
import { Expense } from 'src/expenses/entities/expense.entity';
import { Transaction } from 'src/transactions/entities/transaction.entity';
import { Income } from 'src/income/entities/income.entity';
// import { Wallet } from 'src/wallet/entities/wallet.entity';
@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  fullName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  paystackSubaccountCode: string;

  @Column({ nullable: true })
  settlementBankCode: string;

  @Column({ nullable: true })
  accountNumber: string;

  @Column({ default: 0 })
  totalIncome: number;

  @OneToMany(() => Budget, (budget) => budget.user)
  budgets: Budget[];

  @OneToMany(() => Income, (income) => income.user)
  incomes: Income[];

  /* @OneToMany(() => Wallet, (wallet) => wallet.user)
  wallets: Wallet[]; */

  @OneToMany(() => Expense, (expense) => expense.user)
  expenses: Expense[];

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
