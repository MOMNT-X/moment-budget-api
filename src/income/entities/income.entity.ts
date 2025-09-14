import { PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { Entity, Column, ManyToOne } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
@Entity()
export class Income {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  amount: number;

  @Column()
  source: string; // e.g. 'salary', 'freelance'

  @ManyToOne(() => User, (user) => user.incomes)
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
