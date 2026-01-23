import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Letter } from '../letters/letter.entity';

export enum SignatureRequestStatus {
  PENDING = 'PENDING',
  SIGNED = 'SIGNED',
  REJECTED = 'REJECTED',
}

@Entity({ name: 'signature_requests' })
@Index('idx_sigreq_assigned_status', ['assignedTo', 'status'])
@Index('idx_sigreq_requested_by', ['requestedBy'])
@Index('idx_sigreq_letter', ['letterId'])
@Index('idx_sigreq_created', ['createdAt'])
export class SignatureRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  letterId: string;

  @ManyToOne(() => Letter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'letterId' })
  letter: Letter;

  @Column()
  requestedBy: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requestedBy' })
  requester: User;

  @Column()
  assignedTo: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignedTo' })
  assignee: User;

  @Column({
    type: 'enum',
    enum: SignatureRequestStatus,
    default: SignatureRequestStatus.PENDING,
  })
  status: SignatureRequestStatus;

  @Column({ type: 'float', nullable: true })
  positionX: number | null;

  @Column({ type: 'float', nullable: true })
  positionY: number | null;

  @Column({ type: 'int', nullable: true })
  positionPage: number | null;

  @Column({ type: 'varchar', nullable: true })
  signatureId: string | null;

  @Column({ type: 'int', nullable: true, default: 100 })
  scale: number | null;

  @Column({ type: 'datetime', nullable: true })
  signedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  signedImagePath: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
