import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PaystackRecordType {
  SUBACCOUNT = 'subaccount',
  TRANSACTION = 'transaction',
}

@Entity('paystack_records')
export class PaystackRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PaystackRecordType })
  type: PaystackRecordType;

  // Common fields
  @Column()
  reference: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  amount?: number;

  // Subaccount-specific fields
  @Column({ nullable: true })
  businessName?: string;

  @Column({ nullable: true })
  bankCode?: string;

  @Column({ nullable: true })
  accountNumber?: string;

  @Column({ nullable: true })
  subaccountCode?: string;

  // Transaction-specific fields
  @Column({ nullable: true })
  status?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
