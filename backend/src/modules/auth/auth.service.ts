import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;

    const copy = { ...user };
    delete (copy as Partial<typeof copy>).password;
    delete (copy as Partial<typeof copy>).refreshToken;
    return copy;
  }

  private generateTokens(
    userId: string,
    username: string,
    role: string,
    unitBisnis?: string,
  ) {
    const payload = { username, sub: userId, role, unitBisnis };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: this.configService.getOrThrow<string>('JWT_SECRET') + '_refresh',
    });

    return { accessToken, refreshToken };
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.username, dto.password);
    if (!user) {
      throw new UnauthorizedException('Username atau password salah');
    }

    const tokens = this.generateTokens(
      user.id,
      user.username,
      user.role,
      user.unitBisnis || undefined,
    );
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret:
          this.configService.getOrThrow<string>('JWT_SECRET') + '_refresh',
      });

      const isValid = await this.usersService.validateRefreshToken(
        payload.sub,
        refreshToken,
      );
      if (!isValid) {
        throw new UnauthorizedException('Refresh token tidak valid');
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User tidak ditemukan');
      }

      const tokens = this.generateTokens(
        user.id,
        user.username,
        user.role,
        user.unitBisnis || undefined,
      );
      await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch {
      throw new UnauthorizedException('Refresh token tidak valid atau expired');
    }
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Logout berhasil' };
  }
}
