import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from 'src/base-entity/base-entities';
import { User } from 'src/user/entities/user.entity';

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
}

@Entity()
export class Transaction extends BaseEntity {
  @Column()
  description: string;

  @Column('decimal')
  amount: number;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column()
  category: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  date: Date;

  @ManyToOne(() => User, (user) => user.transactions)
  user: User;
}
