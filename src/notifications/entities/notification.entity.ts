import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum NotificationType {
  SUCCESS = 'success',
  INFO = 'info',
  WARNING = 'warning',
}

@Entity('notifications')
@Index(['userId', 'read', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.INFO,
  })
  type: NotificationType;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;

  // Optional: metadata for linking to specific resources
  @Column({ nullable: true })
  resourceType?: string; // e.g., 'transaction', 'bill', 'budget'

  @Column({ nullable: true })
  resourceId?: string; // ID of the related resource
}
