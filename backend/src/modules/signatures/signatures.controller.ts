import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SignaturesService } from './signatures.service';
import { CreateSignatureDto } from './dto/create-signature.dto';
import { SignatureFileValidationPipe } from '../../common/pipes/signature-file-validation.pipe';
import { UserRole } from '../../common/enums/role.enum';
import { UnitBisnis } from '../../common/enums/unit-bisnis.enum';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    userId: string;
    username: string;
    role: UserRole;
    unitBisnis?: UnitBisnis;
  };
}

@Controller('signatures')
@UseGuards(JwtAuthGuard)
export class SignaturesController {
  constructor(private readonly signaturesService: SignaturesService) {}

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.signaturesService.findAllByUser(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.signaturesService.findOne(id, req.user.userId);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  upload(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateSignatureDto,
    @UploadedFile(new SignatureFileValidationPipe()) file: Express.Multer.File,
  ) {
    return this.signaturesService.create(req.user.userId, dto, file);
  }

  @Post('draw')
  draw(@Request() req: AuthenticatedRequest, @Body() dto: CreateSignatureDto) {
    return this.signaturesService.create(req.user.userId, dto);
  }

  @Put(':id/default')
  setDefault(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.signaturesService.setDefault(id, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.signaturesService.remove(id, req.user.userId);
  }
}
