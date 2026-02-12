import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from './schemas/user.schema';

@Injectable()
export class UsersService {
    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

    findByEmail(email: string) {
        return this.userModel.findOne({ email }).exec();
    }

    // findByEmailWithPassword(email: string) {
    //     return this.userModel.findOne({ email }).select('+passwordHash').exec();
    // }

    // create(data: { email: string; passwordHash: string }) {
    //     return this.userModel.create(data);
    // }
    // ใช้ตอน login: ต้องดึง passwordHash และ refreshTokenHash
    findByEmailWithSecrets(email: string) {
        return this.userModel.findOne({ email }).select('+passwordHash +refreshTokenHash').exec();
    }

    // ใช้ตอน refresh: ต้องดึง refreshTokenHash
    findByIdWithRefresh(userId: string) {
        return this.userModel.findById(userId).select('+refreshTokenHash').exec();
    }

    // สร้างผู้ใช้ใหม่ โดยกำหนด role ได้
    create(data: { email: string; passwordHash: string; role?: UserRole }) {
        return this.userModel.create({
            email: data.email,
            passwordHash: data.passwordHash,
            role: data.role ?? 'user',
        });
    }

    // อัพเดท refreshTokenHash
    setRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
        return this.userModel.updateOne({ _id: userId }, { refreshTokenHash }).exec();
    }

    // อัพเดทบทบาทผู้ใช้
    setRole(userId: string, role: UserRole) {
        return this.userModel.updateOne({ _id: userId }, { role }).exec();
    }

}
