import { Entity, Column, ManyToOne } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { Expense } from 'src/expenses/entities/expense.entity';

@Entity()
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  category: string; // e.g. 'food', 'rent'

  @Column()
  amount: number;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @ManyToOne(() => User, user => user.budgets)
  user: User;

  @OneToMany(() => Expense, expense => expense.budget)
  expenses: Expense[];

  @CreateDateColumn()
  createdAt: Date;
}
