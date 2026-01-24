import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Post,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CreateDeleteRequestDto } from './dto/create-delete-request.dto';
import { UpdateDeleteRequestDto } from './dto/update-delete-request.dto';
import { DeleteRequestsService } from './delete-requests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DeleteRequestStatus } from './delete-request.entity';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeleteRequestsController {
  constructor(private readonly deleteRequestsService: DeleteRequestsService) {}

  @Post('delete-requests')
  create(@Body() dto: CreateDeleteRequestDto, @Request() req: any) {
    return this.deleteRequestsService.create(dto, req.user);
  }

  @Get('delete-requests')
  findAll(
    @Query('status') status?: DeleteRequestStatus,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.deleteRequestsService.findAll(status, page, limit);
  }

  @Patch('delete-requests/:id')
  @Roles(UserRole.ADMIN)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateDeleteRequestDto) {
    return this.deleteRequestsService.updateStatus(id, dto);
  }
}
