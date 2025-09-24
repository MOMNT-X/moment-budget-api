import { Entity, Column, ManyToOne } from 'typeorm';
// import { BaseEntity } from 'src/common/base.entity';
import { User } from 'src/user/entities/user.entity';
import { PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { Budget } from 'src/budget/entities/budget.entity';

@Entity()
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  amount: number;

  @Column()
  description: string;

  @Column()
  category: string;

  @ManyToOne(() => User, (user) => user.expenses)
  user: User;

  @ManyToOne(() => Budget, (budget) => budget.expenses, { nullable: true })
  budget: Budget;

  @CreateDateColumn()
  createdAt: Date;
}
