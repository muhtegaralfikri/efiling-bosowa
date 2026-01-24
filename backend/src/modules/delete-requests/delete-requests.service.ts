import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDeleteRequestDto } from './dto/create-delete-request.dto';
import { UpdateDeleteRequestDto } from './dto/update-delete-request.dto';
import { DeleteRequest, DeleteRequestStatus } from './delete-request.entity';
import { Letter } from '../letters/letter.entity';
import { UserRole } from '../../common/enums/role.enum';
import { UnitBisnis } from '../../common/enums/unit-bisnis.enum';
import { WebSocketGateway } from '../websocket/websocket.gateway';

interface AuthenticatedUser {
  userId: string;
  role: UserRole;
  unitBisnis?: UnitBisnis | null;
}

@Injectable()
export class DeleteRequestsService {
  constructor(
    @InjectRepository(DeleteRequest)
    private readonly deleteRequestsRepo: Repository<DeleteRequest>,
    @InjectRepository(Letter)
    private readonly lettersRepo: Repository<Letter>,
    private readonly webSocketGateway: WebSocketGateway,
  ) {}

  async create(dto: CreateDeleteRequestDto, user: AuthenticatedUser) {
    const letterNumber = dto.letterNumber.trim();
    const letter = await this.lettersRepo.findOne({
      where: { letterNumber },
    });
    if (!letter) {
      throw new NotFoundException('Letter not found');
    }

    if (user.role === UserRole.USER) {
      if (!user.unitBisnis || letter.unitBisnis !== user.unitBisnis) {
        throw new ForbiddenException(
          'Anda tidak memiliki akses untuk mengajukan hapus dokumen ini',
        );
      }
    }

    const existingPending = await this.deleteRequestsRepo.findOne({
      where: { letterId: letter.id, status: DeleteRequestStatus.PENDING },
    });

    if (existingPending) {
      throw new ConflictException(
        'Delete request for this letter is already pending',
      );
    }

    const request = this.deleteRequestsRepo.create({
      letterId: letter.id,
      letter,
      reason: dto.reason,
      status: DeleteRequestStatus.PENDING,
    });
    return this.deleteRequestsRepo.save(request);
  }

  findAll(status?: DeleteRequestStatus) {
    // Optimized query with specific columns
    return this.deleteRequestsRepo
      .createQueryBuilder('req')
      .select([
        'req.id',
        'req.letterId',
        'req.status',
        'req.reason',
        'req.createdAt',
        'letter.letterNumber',
      ])
      .leftJoin('req.letter', 'letter')
      .where(status ? { status } : {})
      .orderBy('req.createdAt', 'DESC')
      .getMany();
  }

  async updateStatus(id: string, dto: UpdateDeleteRequestDto) {
    const request = await this.findOne(id);
    request.status = dto.status;
    const saved = await this.deleteRequestsRepo.save(request);

    if (dto.status === DeleteRequestStatus.APPROVED) {
      // letterId can be null if the letter was already removed
      if (request.letterId) {
        await this.lettersRepo.delete(request.letterId);
        // Broadcast update so clients can refresh their lists
        this.webSocketGateway.broadcastDocumentUpdate({ id: request.letterId });
      }
    }

    return saved;
  }

  private async findOne(id: string) {
    const found = await this.deleteRequestsRepo.findOne({ where: { id } });
    if (!found) {
      throw new NotFoundException('Delete request not found');
    }
    return found;
  }
}
